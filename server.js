import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  initDb,
  getDbMode,
  verifyPassword,
  createUser,
  findUserByUsername,
  listUsers,
  updateUser,
  deleteUser,
  createSession,
  getSessionUser,
  deleteSession,
  listReports,
  getReportById,
  saveReport,
  reviewReport,
  deleteReport,
  listDojRequests,
  getDojRequestById,
  saveDojRequest,
  reviewDojRequest,
  deleteDojRequest,
  listInvestigations,
  saveInvestigation,
  deleteInvestigation,
  getSettings,
  saveSettings,
  savePrintedImageToDb,
  getPrintedImageFromDb
} from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const printedDir = path.join(__dirname, 'printed_docs');
const PORT = process.env.PORT || 3000;

const printedCache = new Map();
const MAX_CACHED_PRINTS = 80;

try {
  fs.mkdirSync(printedDir, { recursive: true });
} catch {
  // ignore if read-only filesystem
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let aborted = false;

    req.on('data', chunk => {
      if (aborted) return;
      size += chunk.length;
      if (size > maxBytes) {
        aborted = true;
        reject(Object.assign(new Error('Requête trop volumineuse'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (aborted) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('JSON invalide'), { statusCode: 400 }));
      }
    });

    req.on('error', err => {
      if (!aborted) reject(err);
    });
  });
}

function extractBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

function isHighCommand(user) {
  return Boolean(user && ['HIGH_COMMAND', 'ADMIN'].includes(user.role));
}

function isDojOrCommand(user) {
  return Boolean(user && ['DOJ', 'HIGH_COMMAND', 'ADMIN'].includes(user.role));
}

async function sendDiscordWebhook(webhookUrl, embed) {
  if (!webhookUrl || !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(webhookUrl)) {
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'LSPD // DOJ MDT',
        embeds: [embed]
      })
    });
  } catch {
    // non-blocking
  }
}

async function handleApiRequest(req, res, safeUrl) {
  // Healthcheck
  if (req.method === 'GET' && safeUrl === '/api/health') {
    return sendJson(res, 200, { ok: true, dbMode: getDbMode() });
  }

  // 1. FiveM printable A4 PNG endpoint
  if (req.method === 'POST' && safeUrl === '/api/print-image') {
    const parsed = await readJsonBody(req, 15 * 1024 * 1024);
    const dataUrl = String(parsed.imageData || '');
    const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return sendJson(res, 400, { error: 'Format PNG base64 invalide' });
    }
    const buffer = Buffer.from(match[1], 'base64');
    const safeRef = String(parsed.docNumber || 'LSPD')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 24) || 'LSPD';
    const rand = crypto.randomBytes(3).toString('hex');
    const filename = `${safeRef}-${rand}.png`;

    if (printedCache.size >= MAX_CACHED_PRINTS) {
      const oldestKey = printedCache.keys().next().value;
      printedCache.delete(oldestKey);
    }
    printedCache.set(filename, buffer);
    try {
      fs.writeFileSync(path.join(printedDir, filename), buffer);
    } catch {
      // ignore disk errors
    }
    await savePrintedImageToDb(filename, buffer);
    return sendJson(res, 200, { ok: true, filename, path: `/printed/${filename}` });
  }

  // 2. Auth — Public registration (TOUJOURS créé avec le rôle OFFICER — seul un Haut Gradé peut promouvoir en DOJ/HIGH_COMMAND)
  if (req.method === 'POST' && safeUrl === '/api/auth/register') {
    const body = await readJsonBody(req, 64 * 1024);
    const user = await createUser({
      username: body.username,
      password: body.password,
      fullName: body.fullName,
      matricule: body.matricule,
      rank: body.rank || 'Officier',
      role: 'OFFICER'
    });
    const session = await createSession(user.id);
    return sendJson(res, 201, { token: session.token, user, dbMode: getDbMode() });
  }

  // 3. Auth — Login
  if (req.method === 'POST' && safeUrl === '/api/auth/login') {
    const body = await readJsonBody(req, 64 * 1024);
    const rawUser = await findUserByUsername(body.username);
    if (!rawUser || !verifyPassword(body.password, rawUser.passwordHash)) {
      return sendJson(res, 401, { error: 'Identifiant ou mot de passe incorrect.' });
    }
    if (rawUser.status !== 'active') {
      return sendJson(res, 403, { error: 'Ce compte a été désactivé par le Commandement LSPD.' });
    }
    const session = await createSession(rawUser.id);
    const { passwordHash, ...safeUser } = rawUser;
    return sendJson(res, 200, { token: session.token, user: safeUser, dbMode: getDbMode() });
  }

  // --- Toutes les routes suivantes exigent un token de session valide ---
  const token = extractBearerToken(req);
  const currentUser = await getSessionUser(token);
  if (!currentUser) {
    return sendJson(res, 401, { error: 'Session expirée ou non authentifiée.' });
  }

  if (req.method === 'GET' && safeUrl === '/api/auth/me') {
    return sendJson(res, 200, { user: currentUser, dbMode: getDbMode() });
  }

  if (req.method === 'POST' && safeUrl === '/api/auth/logout') {
    await deleteSession(token);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'PATCH' && safeUrl === '/api/auth/me') {
    const body = await readJsonBody(req, 64 * 1024);
    const updated = await updateUser(currentUser.id, {
      fullName: body.fullName,
      matricule: body.matricule,
      rank: body.rank,
      password: body.password
    });
    return sendJson(res, 200, { user: updated });
  }

  // 4. Gestion des Comptes & Rôles (STRICTEMENT RÉSERVÉ AUX HAUTS GRADÉS LSPD)
  if (safeUrl === '/api/users' || safeUrl.startsWith('/api/users/')) {
    if (!isHighCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Accès refusé : seuls les Hauts Gradés LSPD peuvent gérer les comptes et rôles.' });
    }

    if (req.method === 'GET' && safeUrl === '/api/users') {
      const users = await listUsers();
      return sendJson(res, 200, { users });
    }

    if (req.method === 'POST' && safeUrl === '/api/users') {
      const body = await readJsonBody(req, 64 * 1024);
      const created = await createUser({
        username: body.username,
        password: body.password,
        fullName: body.fullName,
        matricule: body.matricule,
        rank: body.rank || 'Officier',
        role: body.role || 'OFFICER'
      });
      return sendJson(res, 201, { user: created });
    }

    const userId = safeUrl.slice('/api/users/'.length);
    if (req.method === 'PATCH' && userId) {
      const body = await readJsonBody(req, 64 * 1024);
      if (userId === currentUser.id && body.status === 'disabled') {
        return sendJson(res, 400, { error: 'Vous ne pouvez pas désactiver votre propre compte.' });
      }
      if (userId === currentUser.id && body.role && !['HIGH_COMMAND', 'ADMIN'].includes(body.role)) {
        return sendJson(res, 400, { error: 'Vous ne pouvez pas retirer votre propre rôle Haut Gradé.' });
      }
      const updated = await updateUser(userId, body);
      if (!updated) return sendJson(res, 404, { error: 'Compte introuvable.' });
      return sendJson(res, 200, { user: updated });
    }

    if (req.method === 'DELETE' && userId) {
      if (userId === currentUser.id) {
        return sendJson(res, 400, { error: 'Vous ne pouvez pas supprimer votre propre compte.' });
      }
      await deleteUser(userId);
      return sendJson(res, 200, { ok: true });
    }
  }

  // 5. Paramètres Webhooks Discord (Hauts Gradés)
  if (safeUrl === '/api/settings') {
    if (!isHighCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Accès réservé aux Hauts Gradés LSPD.' });
    }
    if (req.method === 'GET') {
      return sendJson(res, 200, { settings: await getSettings() });
    }
    if (req.method === 'PATCH') {
      const body = await readJsonBody(req, 64 * 1024);
      const updated = await saveSettings({
        webhookDojSubmit: String(body.webhookDojSubmit || '').trim(),
        webhookDojDecision: String(body.webhookDojDecision || '').trim()
      });
      return sendJson(res, 200, { settings: updated });
    }
  }

  // 6. RAPPORTS D'ARRESTATION + TRANSFERT & VALIDATION DOJ
  if (req.method === 'GET' && safeUrl === '/api/reports') {
    const reports = await listReports();
    return sendJson(res, 200, { reports });
  }

  if (req.method === 'POST' && safeUrl === '/api/reports') {
    const body = await readJsonBody(req, 4 * 1024 * 1024);
    const prev = body.id ? await getReportById(body.id) : null;
    const saved = await saveReport(body, currentUser);

    // Notification Discord optionnelle quand un rapport vient d'être transféré au DOJ
    if (saved.dojStatus === 'submitted' && prev?.dojStatus !== 'submitted') {
      const st = await getSettings();
      sendDiscordWebhook(st.webhookDojSubmit, {
        title: `⚖️ Nouveau Rapport d'Arrestation transféré au DOJ — ${saved.reportNumber}`,
        color: 0x3b82f6,
        fields: [
          { name: 'Prévenu (RP)', value: saved.prevenu || '—', inline: true },
          { name: 'Agent rédacteur', value: saved.authorName || currentUser.fullName, inline: true },
          { name: 'Peine / Amende', value: `$${Number(saved.amendeRetenue || 0).toLocaleString()} • ${saved.peineMinutes || 0} min (${saved.palierRetenu})`, inline: false }
        ],
        footer: { text: 'MDT LSPD // DOJ — En attente de validation' }
      });
    }
    return sendJson(res, 200, { report: saved });
  }

  if (req.method === 'POST' && safeUrl.startsWith('/api/reports/') && safeUrl.endsWith('/review')) {
    if (!isDojOrCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Seul un membre du DOJ (ou Haut Gradé) peut valider ou refuser un rapport.' });
    }
    const repId = safeUrl.slice('/api/reports/'.length, -'/review'.length);
    const body = await readJsonBody(req, 256 * 1024);
    const reviewed = await reviewReport(repId, {
      dojStatus: body.dojStatus,
      dojComment: body.dojComment,
      reviewerUser: currentUser
    });
    if (!reviewed) return sendJson(res, 404, { error: 'Rapport introuvable.' });

    const st = await getSettings();
    const labelMap = {
      approved: '✅ VALIDÉ PAR LE DOJ',
      changes_requested: '⚠️ COMPLÉMENT DEMANDÉ PAR LE DOJ',
      rejected: '❌ REFUSÉ PAR LE DOJ'
    };
    const colorMap = { approved: 0x22c55e, changes_requested: 0xf59e0b, rejected: 0xef4444 };
    sendDiscordWebhook(st.webhookDojDecision, {
      title: `${labelMap[reviewed.dojStatus] || 'DÉCISION DOJ'} — Rapport ${reviewed.reportNumber}`,
      color: colorMap[reviewed.dojStatus] || 0x3b82f6,
      fields: [
        { name: 'Prévenu', value: reviewed.prevenu || '—', inline: true },
        { name: 'Agent LSPD', value: reviewed.authorName || '—', inline: true },
        { name: 'Magistrat / Procureur', value: reviewed.dojReviewerName || currentUser.fullName, inline: true },
        { name: 'Commentaire / Motif DOJ', value: reviewed.dojComment || 'Aucun commentaire complémentaire.', inline: false }
      ]
    });

    return sendJson(res, 200, { report: reviewed });
  }

  if (req.method === 'DELETE' && safeUrl.startsWith('/api/reports/')) {
    const repId = safeUrl.slice('/api/reports/'.length);
    const existing = await getReportById(repId);
    if (!existing) return sendJson(res, 404, { error: 'Rapport introuvable.' });
    if (existing.authorId && existing.authorId !== currentUser.id && !isHighCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Vous ne pouvez supprimer que vos propres rapports (ou être Haut Gradé).' });
    }
    await deleteReport(repId);
    return sendJson(res, 200, { ok: true });
  }

  // 7. DEMANDES DOJ (DESCENTES, PERQUISITIONS, MANDATS + PREUVES PHOTOS)
  if (req.method === 'GET' && safeUrl === '/api/doj-requests') {
    const requests = await listDojRequests();
    return sendJson(res, 200, { requests });
  }

  if (req.method === 'POST' && safeUrl === '/api/doj-requests') {
    const body = await readJsonBody(req, 15 * 1024 * 1024);
    const prev = body.id ? await getDojRequestById(body.id) : null;
    const saved = await saveDojRequest(body, currentUser);

    if (saved.status === 'submitted' && prev?.status !== 'submitted') {
      const st = await getSettings();
      sendDiscordWebhook(st.webhookDojSubmit, {
        title: `🚨 Nouvelle Demande de Mandat / Descente soumise au DOJ — ${saved.requestNumber}`,
        color: 0xdfb556,
        fields: [
          { name: 'Objet', value: saved.title || 'Demande DOJ', inline: false },
          { name: 'Cible / Gang', value: `${saved.targetName || '—'} ${saved.targetGroup ? `(${saved.targetGroup})` : ''}`, inline: true },
          { name: 'Officier demandeur', value: saved.leadAgent || currentUser.fullName, inline: true },
          { name: 'Preuves jointes', value: `${(saved.exhibits || []).length} pièce(s)`, inline: true }
        ]
      });
    }
    return sendJson(res, 200, { request: saved });
  }

  if (req.method === 'POST' && safeUrl.startsWith('/api/doj-requests/') && safeUrl.endsWith('/review')) {
    if (!isDojOrCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Seul un membre du DOJ (ou Haut Gradé) peut statuer sur une demande de mandat.' });
    }
    const reqId = safeUrl.slice('/api/doj-requests/'.length, -'/review'.length);
    const body = await readJsonBody(req, 256 * 1024);
    const reviewed = await reviewDojRequest(reqId, {
      status: body.status,
      dojComment: body.dojComment,
      reviewerUser: currentUser
    });
    if (!reviewed) return sendJson(res, 404, { error: 'Demande DOJ introuvable.' });

    const st = await getSettings();
    const labelMap = {
      approved: '✅ MANDAT APPROUVÉ PAR LE DOJ',
      changes_requested: '⚠️ COMPLÉMENT REQUIS PAR LE DOJ',
      rejected: '❌ MANDAT REFUSÉ PAR LE DOJ',
      executed: '🛡️ MANDAT EXÉCUTÉ'
    };
    const colorMap = { approved: 0x22c55e, changes_requested: 0xf59e0b, rejected: 0xef4444, executed: 0x3b82f6 };
    sendDiscordWebhook(st.webhookDojDecision, {
      title: `${labelMap[reviewed.status] || 'DÉCISION DOJ'} — ${reviewed.requestNumber}`,
      color: colorMap[reviewed.status] || 0x3b82f6,
      fields: [
        { name: 'Demande', value: reviewed.title || '—', inline: false },
        { name: 'Officier demandeur', value: reviewed.leadAgent || '—', inline: true },
        { name: 'Magistrat / Procureur', value: reviewed.dojReviewerName || currentUser.fullName, inline: true },
        { name: 'Décision / Explication DOJ', value: reviewed.dojComment || 'Aucun commentaire complémentaire.', inline: false }
      ]
    });

    return sendJson(res, 200, { request: reviewed });
  }

  if (req.method === 'DELETE' && safeUrl.startsWith('/api/doj-requests/')) {
    const reqId = safeUrl.slice('/api/doj-requests/'.length);
    const existing = await getDojRequestById(reqId);
    if (!existing) return sendJson(res, 404, { error: 'Demande DOJ introuvable.' });
    if (existing.authorId && existing.authorId !== currentUser.id && !isHighCommand(currentUser)) {
      return sendJson(res, 403, { error: 'Vous ne pouvez supprimer que vos propres demandes (ou être Haut Gradé).' });
    }
    await deleteDojRequest(reqId);
    return sendJson(res, 200, { ok: true });
  }

  // 8. DOSSIERS D'ENQUÊTE PARTAGÉS
  if (req.method === 'GET' && safeUrl === '/api/investigations') {
    const cases = await listInvestigations();
    return sendJson(res, 200, { cases });
  }

  if (req.method === 'POST' && safeUrl === '/api/investigations') {
    const body = await readJsonBody(req, 4 * 1024 * 1024);
    const saved = await saveInvestigation(body, currentUser);
    return sendJson(res, 200, { investigation: saved });
  }

  if (req.method === 'DELETE' && safeUrl.startsWith('/api/investigations/')) {
    const id = safeUrl.slice('/api/investigations/'.length);
    await deleteInvestigation(id);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Endpoint API introuvable.' });
}

const server = http.createServer(async (req, res) => {
  const safeUrl = (req.url || '/').split('?')[0];

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 1. API Routes
  if (safeUrl.startsWith('/api/')) {
    try {
      await handleApiRequest(req, res, safeUrl);
    } catch (err) {
      console.error('[API Error]', safeUrl, err.message);
      sendJson(res, err.statusCode || 500, { error: err.message || 'Erreur serveur interne.' });
    }
    return;
  }

  // 2. Endpoint GET /printed/<filename>.png -> sert la feuille A4 PNG directement pour l'imprimante FiveM
  if (req.method === 'GET' && safeUrl.startsWith('/printed/')) {
    const filename = path.basename(safeUrl);
    if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) {
      res.writeHead(400);
      return res.end('Invalid filename');
    }

    if (printedCache.has(filename)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      return res.end(printedCache.get(filename));
    }

    const diskPath = path.join(printedDir, filename);
    if (fs.existsSync(diskPath)) {
      fs.readFile(diskPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          return res.end('Error reading file');
        }
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        });
        return res.end(data);
      });
      return;
    }

    const dbBuf = await getPrintedImageFromDb(filename);
    if (dbBuf) {
      printedCache.set(filename, dbBuf);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      return res.end(dbBuf);
    }

    res.writeHead(404);
    return res.end('Document non trouvé');
  }

  // 3. Static React app serving
  let filePath = path.join(distDir, safeUrl === '/' ? 'index.html' : safeUrl);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

initDb()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`LSPD // DOJ MDT Server running on port ${PORT} [DB: ${getDbMode()}]`);
    });
  })
  .catch(err => {
    console.error('[FATAL] Impossible d\'initialiser la base de données:', err);
    process.exit(1);
  });
