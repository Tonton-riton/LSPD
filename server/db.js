// Couche Base de Données LSPD / DOJ (BDA)
// - En production (Render) : utilise PostgreSQL automatiquement dès que DATABASE_URL est défini (Neon / Supabase / Render Postgres)
//   et crée toutes les tables automatiquement au démarrage.
// - En local sans DATABASE_URL : bascule automatiquement sur un fichier JSON persistant (data/mdt-local-db.json).

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, 'mdt-local-db.json');

const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

export const VALID_ROLES = ['OFFICER', 'HIGH_COMMAND', 'DOJ', 'ADMIN'];

let pool = null;
let usePostgres = false;
let localStore = {
  users: [],
  sessions: [],
  reports: [],
  dojRequests: [],
  investigations: [],
  settings: {
    webhookDojSubmit: '',
    webhookDojDecision: ''
  }
};

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const derived = crypto.scryptSync(String(password), salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName ?? u.full_name ?? '',
    matricule: u.matricule ?? '',
    rank: u.rank ?? 'Officier',
    role: u.role ?? 'OFFICER',
    status: u.status ?? 'active',
    createdAt: u.createdAt ?? u.created_at ?? null
  };
}

function saveLocalStore() {
  try {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[DB] Erreur sauvegarde locale:', err.message);
  }
}

function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      localStore = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        dojRequests: Array.isArray(parsed.dojRequests) ? parsed.dojRequests : [],
        investigations: Array.isArray(parsed.investigations) ? parsed.investigations : [],
        settings: parsed.settings && typeof parsed.settings === 'object'
          ? { webhookDojSubmit: '', webhookDojDecision: '', ...parsed.settings }
          : { webhookDojSubmit: '', webhookDojDecision: '' }
      };
    }
  } catch (err) {
    console.error('[DB] Erreur lecture locale:', err.message);
  }
}

export function getDbMode() {
  return usePostgres ? 'postgresql' : 'local-json';
}

export async function initDb() {
  const dbUrl = (process.env.DATABASE_URL || '').trim();

  if (dbUrl) {
    const isLocalHost = /localhost|127\.0\.0\.1/i.test(dbUrl);
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocalHost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000
    });

    await pool.query('SELECT 1');
    usePostgres = true;
    console.log('[DB] Connecté à PostgreSQL (DATABASE_URL)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        matricule TEXT NOT NULL DEFAULT '',
        rank TEXT NOT NULL DEFAULT 'Officier',
        role TEXT NOT NULL DEFAULT 'OFFICER',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS arrest_reports (
        id TEXT PRIMARY KEY,
        report_number TEXT NOT NULL DEFAULT '',
        author_id TEXT,
        author_name TEXT NOT NULL DEFAULT '',
        prevenu TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL DEFAULT '',
        heure TEXT NOT NULL DEFAULT '',
        template_id TEXT NOT NULL DEFAULT 'standard',
        palier_retenu TEXT NOT NULL DEFAULT 'NOMINALE',
        amende_retenue NUMERIC NOT NULL DEFAULT 0,
        peine_minutes INTEGER NOT NULL DEFAULT 0,
        rows_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
        report_text TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        command_visa TEXT NOT NULL DEFAULT '',
        doj_status TEXT NOT NULL DEFAULT 'draft',
        doj_reviewer_name TEXT NOT NULL DEFAULT '',
        doj_reviewer_rank TEXT NOT NULL DEFAULT '',
        doj_comment TEXT NOT NULL DEFAULT '',
        doj_reviewed_at TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS doj_requests (
        id TEXT PRIMARY KEY,
        request_number TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        template_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        urgency TEXT NOT NULL DEFAULT 'high',
        author_id TEXT,
        lead_agent TEXT NOT NULL DEFAULT '',
        command_visa TEXT NOT NULL DEFAULT '',
        division TEXT NOT NULL DEFAULT '',
        authority TEXT NOT NULL DEFAULT '',
        validity TEXT NOT NULL DEFAULT '',
        target_name TEXT NOT NULL DEFAULT '',
        target_group TEXT NOT NULL DEFAULT '',
        target_location TEXT NOT NULL DEFAULT '',
        charges TEXT NOT NULL DEFAULT '',
        created_at_label TEXT NOT NULL DEFAULT '',
        exhibits JSONB NOT NULL DEFAULT '[]'::jsonb,
        report_text TEXT NOT NULL DEFAULT '',
        doj_reviewer_name TEXT NOT NULL DEFAULT '',
        doj_reviewer_rank TEXT NOT NULL DEFAULT '',
        doj_comment TEXT NOT NULL DEFAULT '',
        doj_reviewed_at TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS investigations (
        id TEXT PRIMARY KEY,
        case_number TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        template_id TEXT NOT NULL DEFAULT '',
        division TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'in_progress',
        priority TEXT NOT NULL DEFAULT 'high',
        author_id TEXT,
        lead_agent TEXT NOT NULL DEFAULT '',
        command_visa TEXT NOT NULL DEFAULT '',
        target_name TEXT NOT NULL DEFAULT '',
        target_group TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        created_at_label TEXT NOT NULL DEFAULT '',
        suspects JSONB NOT NULL DEFAULT '[]'::jsonb,
        evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
        report_text TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '{}'::jsonb
      );
    `);
  } else {
    usePostgres = false;
    loadLocalStore();
    console.log('[DB] Mode local JSON actif (ajoutez DATABASE_URL sur Render pour PostgreSQL permanent)');
  }

  // Bootstrap : si aucun compte n'existe encore, crée le premier compte Haut Gradé / Commandement LSPD
  const allUsers = await listUsers();
  if (allUsers.length === 0) {
    const defaultAdminUser = (process.env.ADMIN_USERNAME || 'command').trim().toLowerCase();
    const defaultAdminPass = process.env.ADMIN_PASSWORD || 'LSPD2026!';
    const defaultAdminName = process.env.ADMIN_FULLNAME || 'Vance Winchester';
    const defaultAdminMat = process.env.ADMIN_MATRICULE || '16';
    const defaultAdminRank = process.env.ADMIN_RANK || 'Commandant LSPD';

    await createUser({
      username: defaultAdminUser,
      password: defaultAdminPass,
      fullName: defaultAdminName,
      matricule: defaultAdminMat,
      rank: defaultAdminRank,
      role: 'HIGH_COMMAND'
    });
    console.log(`[DB] Compte Haut Gradé initial créé -> identifiant: "${defaultAdminUser}" | mot de passe: "${defaultAdminPass}"`);
  }
}

// =========================================================================
// USERS & SESSIONS
// =========================================================================
export async function createUser({ username, password, fullName, matricule, rank, role = 'OFFICER' }) {
  const cleanUser = String(username || '').trim().toLowerCase();
  if (!cleanUser || cleanUser.length < 3) {
    throw new Error('Identifiant trop court (3 caractères minimum).');
  }
  if (!password || String(password).length < 4) {
    throw new Error('Mot de passe trop court (4 caractères minimum).');
  }
  const safeRole = VALID_ROLES.includes(role) ? role : 'OFFICER';
  const id = `usr_${crypto.randomBytes(6).toString('hex')}`;
  const passwordHash = hashPassword(password);
  const nowIso = new Date().toISOString();

  if (usePostgres) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (id, username, password_hash, full_name, matricule, rank, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING *`,
        [id, cleanUser, passwordHash, fullName || cleanUser, matricule || '', rank || 'Officier', safeRole]
      );
      return sanitizeUser(rows[0]);
    } catch (err) {
      if (err.code === '23505') throw new Error('Cet identifiant est déjà utilisé.');
      throw err;
    }
  } else {
    if (localStore.users.some(u => u.username === cleanUser)) {
      throw new Error('Cet identifiant est déjà utilisé.');
    }
    const created = {
      id,
      username: cleanUser,
      passwordHash,
      fullName: fullName || cleanUser,
      matricule: matricule || '',
      rank: rank || 'Officier',
      role: safeRole,
      status: 'active',
      createdAt: nowIso
    };
    localStore.users.push(created);
    saveLocalStore();
    return sanitizeUser(created);
  }
}

export async function findUserByUsername(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [clean]);
    if (!rows[0]) return null;
    return { ...sanitizeUser(rows[0]), passwordHash: rows[0].password_hash };
  }
  return localStore.users.find(u => u.username === clean) || null;
}

export async function findUserById(id) {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? sanitizeUser(rows[0]) : null;
  }
  const found = localStore.users.find(u => u.id === id);
  return found ? sanitizeUser(found) : null;
}

export async function listUsers() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(sanitizeUser);
  }
  return localStore.users.map(sanitizeUser);
}

export async function updateUser(id, patch) {
  const fields = {};
  if (patch.fullName !== undefined) fields.full_name = String(patch.fullName).trim();
  if (patch.matricule !== undefined) fields.matricule = String(patch.matricule).trim();
  if (patch.rank !== undefined) fields.rank = String(patch.rank).trim();
  if (patch.role !== undefined && VALID_ROLES.includes(patch.role)) fields.role = patch.role;
  if (patch.status !== undefined && ['active', 'disabled'].includes(patch.status)) fields.status = patch.status;
  if (patch.password && String(patch.password).length >= 4) {
    fields.password_hash = hashPassword(patch.password);
  }

  if (usePostgres) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return findUserById(id);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const vals = keys.map(k => fields[k]);
    const { rows } = await pool.query(`UPDATE users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...vals]);
    if (!rows[0]) return null;
    if (fields.status === 'disabled') {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }
    return sanitizeUser(rows[0]);
  } else {
    const idx = localStore.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    const u = localStore.users[idx];
    if (fields.full_name !== undefined) u.fullName = fields.full_name;
    if (fields.matricule !== undefined) u.matricule = fields.matricule;
    if (fields.rank !== undefined) u.rank = fields.rank;
    if (fields.role !== undefined) u.role = fields.role;
    if (fields.status !== undefined) u.status = fields.status;
    if (fields.password_hash !== undefined) u.passwordHash = fields.password_hash;
    if (u.status === 'disabled') {
      localStore.sessions = localStore.sessions.filter(s => s.userId !== id);
    }
    saveLocalStore();
    return sanitizeUser(u);
  }
}

export async function deleteUser(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }
  localStore.users = localStore.users.filter(u => u.id !== id);
  localStore.sessions = localStore.sessions.filter(s => s.userId !== id);
  saveLocalStore();
  return true;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  if (usePostgres) {
    await pool.query(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt]
    );
  } else {
    localStore.sessions = localStore.sessions.filter(s => new Date(s.expiresAt).getTime() > Date.now());
    localStore.sessions.push({ token, userId, expiresAt, createdAt: new Date().toISOString() });
    saveLocalStore();
  }
  return { token, expiresAt };
}

export async function getSessionUser(token) {
  if (!token) return null;
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.status = 'active'`,
      [token]
    );
    return rows[0] ? sanitizeUser(rows[0]) : null;
  }
  const sess = localStore.sessions.find(
    s => s.token === token && new Date(s.expiresAt).getTime() > Date.now()
  );
  if (!sess) return null;
  const user = localStore.users.find(u => u.id === sess.userId && u.status === 'active');
  return user ? sanitizeUser(user) : null;
}

export async function deleteSession(token) {
  if (!token) return;
  if (usePostgres) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  } else {
    localStore.sessions = localStore.sessions.filter(s => s.token !== token);
    saveLocalStore();
  }
}

// =========================================================================
// ARREST REPORTS (RAPPORTS D'ARRESTATION + TRANSFERT & VALIDATION DOJ)
// =========================================================================
function mapReportRow(r) {
  return {
    id: r.id,
    reportNumber: r.report_number ?? r.reportNumber ?? '',
    authorId: r.author_id ?? r.authorId ?? null,
    authorName: r.author_name ?? r.authorName ?? '',
    prevenu: r.prevenu ?? '',
    date: r.date ?? '',
    heure: r.heure ?? '',
    templateId: r.template_id ?? r.templateId ?? 'standard',
    palierRetenu: r.palier_retenu ?? r.palierRetenu ?? 'NOMINALE',
    amendeRetenue: Number(r.amende_retenue ?? r.amendeRetenue ?? 0),
    peineMinutes: Number(r.peine_minutes ?? r.peineMinutes ?? 0),
    rowsSnapshot: r.rows_snapshot ?? r.rowsSnapshot ?? [],
    reportText: r.report_text ?? r.reportText ?? '',
    notes: r.notes ?? '',
    commandVisa: r.command_visa ?? r.commandVisa ?? '',
    dojStatus: r.doj_status ?? r.dojStatus ?? 'draft',
    dojReviewerName: r.doj_reviewer_name ?? r.dojReviewerName ?? '',
    dojReviewerRank: r.doj_reviewer_rank ?? r.dojReviewerRank ?? '',
    dojComment: r.doj_comment ?? r.dojComment ?? '',
    dojReviewedAt: r.doj_reviewed_at ?? r.dojReviewedAt ?? '',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date().toISOString()
  };
}

export async function listReports() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM arrest_reports ORDER BY updated_at DESC');
    return rows.map(mapReportRow);
  }
  return [...localStore.reports].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function getReportById(id) {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM arrest_reports WHERE id = $1', [id]);
    return rows[0] ? mapReportRow(rows[0]) : null;
  }
  return localStore.reports.find(r => r.id === id) || null;
}

export async function saveReport(data, authorUser) {
  const id = data.id || `rep_${crypto.randomBytes(6).toString('hex')}`;
  const existing = await getReportById(id);
  const nowIso = new Date().toISOString();

  // Préserve les infos de validation DOJ sauf si explicitement transmises par reviewReport
  const record = {
    id,
    reportNumber: data.reportNumber ?? existing?.reportNumber ?? `LSPD-RA-${Math.floor(1000 + Math.random() * 8999)}`,
    authorId: existing?.authorId ?? authorUser?.id ?? null,
    authorName: data.authorName ?? existing?.authorName ?? `${authorUser?.matricule || ''} | ${authorUser?.fullName || ''}`.trim(),
    prevenu: data.prevenu ?? existing?.prevenu ?? '',
    date: data.date ?? existing?.date ?? new Date().toLocaleDateString('fr-FR'),
    heure: data.heure ?? existing?.heure ?? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    templateId: data.templateId ?? existing?.templateId ?? 'standard',
    palierRetenu: data.palierRetenu ?? existing?.palierRetenu ?? 'NOMINALE',
    amendeRetenue: Number(data.amendeRetenue ?? existing?.amendeRetenue ?? 0),
    peineMinutes: Number(data.peineMinutes ?? existing?.peineMinutes ?? 0),
    rowsSnapshot: Array.isArray(data.rowsSnapshot) ? data.rowsSnapshot : (existing?.rowsSnapshot || []),
    reportText: data.reportText ?? existing?.reportText ?? '',
    notes: data.notes ?? existing?.notes ?? '',
    commandVisa: data.commandVisa ?? existing?.commandVisa ?? '',
    dojStatus: data.dojStatus ?? existing?.dojStatus ?? 'draft',
    dojReviewerName: existing?.dojReviewerName ?? '',
    dojReviewerRank: existing?.dojReviewerRank ?? '',
    dojComment: existing?.dojComment ?? '',
    dojReviewedAt: existing?.dojReviewedAt ?? '',
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso
  };

  // Un officier normal ne peut pas s'auto-valider "approved"
  const isDojOrCmd = authorUser && ['DOJ', 'HIGH_COMMAND', 'ADMIN'].includes(authorUser.role);
  if (!isDojOrCmd && ['approved', 'rejected', 'changes_requested'].includes(data.dojStatus) && data.dojStatus !== existing?.dojStatus) {
    record.dojStatus = existing?.dojStatus || 'draft';
  }

  if (usePostgres) {
    const { rows } = await pool.query(
      `INSERT INTO arrest_reports (
        id, report_number, author_id, author_name, prevenu, date, heure, template_id,
        palier_retenu, amende_retenue, peine_minutes, rows_snapshot, report_text, notes,
        command_visa, doj_status, doj_reviewer_name, doj_reviewer_rank, doj_comment, doj_reviewed_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        report_number = EXCLUDED.report_number,
        author_name = EXCLUDED.author_name,
        prevenu = EXCLUDED.prevenu,
        date = EXCLUDED.date,
        heure = EXCLUDED.heure,
        template_id = EXCLUDED.template_id,
        palier_retenu = EXCLUDED.palier_retenu,
        amende_retenue = EXCLUDED.amende_retenue,
        peine_minutes = EXCLUDED.peine_minutes,
        rows_snapshot = EXCLUDED.rows_snapshot,
        report_text = EXCLUDED.report_text,
        notes = EXCLUDED.notes,
        command_visa = EXCLUDED.command_visa,
        doj_status = EXCLUDED.doj_status,
        updated_at = NOW()
      RETURNING *`,
      [
        record.id, record.reportNumber, record.authorId, record.authorName, record.prevenu,
        record.date, record.heure, record.templateId, record.palierRetenu, record.amendeRetenue,
        record.peineMinutes, JSON.stringify(record.rowsSnapshot), record.reportText, record.notes,
        record.commandVisa, record.dojStatus, record.dojReviewerName, record.dojReviewerRank,
        record.dojComment, record.dojReviewedAt
      ]
    );
    return mapReportRow(rows[0]);
  } else {
    const idx = localStore.reports.findIndex(r => r.id === id);
    if (idx === -1) localStore.reports.unshift(record);
    else localStore.reports[idx] = record;
    saveLocalStore();
    return record;
  }
}

export async function reviewReport(id, { dojStatus, dojComment, reviewerUser }) {
  const validDecisions = ['approved', 'changes_requested', 'rejected', 'submitted'];
  if (!validDecisions.includes(dojStatus)) {
    throw new Error('Décision DOJ invalide.');
  }
  const existing = await getReportById(id);
  if (!existing) return null;

  const reviewerLabel = `${reviewerUser.rank ? reviewerUser.rank + ' ' : ''}${reviewerUser.fullName}`.trim();
  const reviewedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const nextVisa = dojStatus === 'approved' ? reviewerLabel : existing.commandVisa;

  if (usePostgres) {
    const { rows } = await pool.query(
      `UPDATE arrest_reports SET
        doj_status = $2,
        doj_comment = $3,
        doj_reviewer_name = $4,
        doj_reviewer_rank = $5,
        doj_reviewed_at = $6,
        command_visa = $7,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, dojStatus, String(dojComment || '').trim(), reviewerLabel, reviewerUser.rank || 'Magistrat DOJ', reviewedAt, nextVisa]
    );
    return rows[0] ? mapReportRow(rows[0]) : null;
  } else {
    const idx = localStore.reports.findIndex(r => r.id === id);
    if (idx === -1) return null;
    localStore.reports[idx] = {
      ...localStore.reports[idx],
      dojStatus,
      dojComment: String(dojComment || '').trim(),
      dojReviewerName: reviewerLabel,
      dojReviewerRank: reviewerUser.rank || 'Magistrat DOJ',
      dojReviewedAt: reviewedAt,
      commandVisa: nextVisa,
      updatedAt: new Date().toISOString()
    };
    saveLocalStore();
    return localStore.reports[idx];
  }
}

export async function deleteReport(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM arrest_reports WHERE id = $1', [id]);
    return true;
  }
  localStore.reports = localStore.reports.filter(r => r.id !== id);
  saveLocalStore();
  return true;
}

// =========================================================================
// DOJ REQUESTS (DESCENTES, PERQUISITIONS, MANDATS + PREUVES PHOTOS)
// =========================================================================
function mapDojRow(r) {
  return {
    id: r.id,
    requestNumber: r.request_number ?? r.requestNumber ?? '',
    title: r.title ?? '',
    templateId: r.template_id ?? r.templateId ?? '',
    status: r.status ?? 'draft',
    urgency: r.urgency ?? 'high',
    authorId: r.author_id ?? r.authorId ?? null,
    leadAgent: r.lead_agent ?? r.leadAgent ?? '',
    commandVisa: r.command_visa ?? r.commandVisa ?? '',
    division: r.division ?? '',
    authority: r.authority ?? '',
    validity: r.validity ?? '',
    targetName: r.target_name ?? r.targetName ?? '',
    targetGroup: r.target_group ?? r.targetGroup ?? '',
    targetLocation: r.target_location ?? r.targetLocation ?? '',
    charges: r.charges ?? '',
    createdAt: r.created_at_label ?? r.createdAt ?? '',
    exhibits: r.exhibits ?? [],
    reportText: r.report_text ?? r.reportText ?? '',
    dojReviewerName: r.doj_reviewer_name ?? r.dojReviewerName ?? '',
    dojReviewerRank: r.doj_reviewer_rank ?? r.dojReviewerRank ?? '',
    dojComment: r.doj_comment ?? r.dojComment ?? '',
    dojReviewedAt: r.doj_reviewed_at ?? r.dojReviewedAt ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date().toISOString()
  };
}

export async function listDojRequests() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM doj_requests ORDER BY updated_at DESC');
    return rows.map(mapDojRow);
  }
  return [...localStore.dojRequests].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function getDojRequestById(id) {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM doj_requests WHERE id = $1', [id]);
    return rows[0] ? mapDojRow(rows[0]) : null;
  }
  return localStore.dojRequests.find(r => r.id === id) || null;
}

export async function saveDojRequest(data, authorUser) {
  const id = data.id || `doj_${crypto.randomBytes(6).toString('hex')}`;
  const existing = await getDojRequestById(id);
  const nowIso = new Date().toISOString();

  const isDojOrCmd = authorUser && ['DOJ', 'HIGH_COMMAND', 'ADMIN'].includes(authorUser.role);
  let nextStatus = data.status ?? existing?.status ?? 'draft';
  if (!isDojOrCmd && ['approved', 'rejected', 'changes_requested'].includes(nextStatus) && nextStatus !== existing?.status) {
    nextStatus = existing?.status || 'draft';
  }

  const record = {
    id,
    requestNumber: data.requestNumber ?? existing?.requestNumber ?? `DOJ-2026-${Math.floor(100 + Math.random() * 899)}`,
    title: data.title ?? existing?.title ?? 'Demande DOJ',
    templateId: data.templateId ?? existing?.templateId ?? 'doj_descente_qg',
    status: nextStatus,
    urgency: data.urgency ?? existing?.urgency ?? 'high',
    authorId: existing?.authorId ?? authorUser?.id ?? null,
    leadAgent: data.leadAgent ?? existing?.leadAgent ?? '',
    commandVisa: data.commandVisa ?? existing?.commandVisa ?? '',
    division: data.division ?? existing?.division ?? '',
    authority: data.authority ?? existing?.authority ?? '',
    validity: data.validity ?? existing?.validity ?? '',
    targetName: data.targetName ?? existing?.targetName ?? '',
    targetGroup: data.targetGroup ?? existing?.targetGroup ?? '',
    targetLocation: data.targetLocation ?? existing?.targetLocation ?? '',
    charges: data.charges ?? existing?.charges ?? '',
    createdAt: data.createdAt ?? existing?.createdAt ?? new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
    exhibits: Array.isArray(data.exhibits) ? data.exhibits : (existing?.exhibits || []),
    reportText: data.reportText ?? existing?.reportText ?? '',
    dojReviewerName: existing?.dojReviewerName ?? '',
    dojReviewerRank: existing?.dojReviewerRank ?? '',
    dojComment: existing?.dojComment ?? '',
    dojReviewedAt: existing?.dojReviewedAt ?? '',
    updatedAt: nowIso
  };

  if (usePostgres) {
    const { rows } = await pool.query(
      `INSERT INTO doj_requests (
        id, request_number, title, template_id, status, urgency, author_id, lead_agent, command_visa,
        division, authority, validity, target_name, target_group, target_location, charges,
        created_at_label, exhibits, report_text, doj_reviewer_name, doj_reviewer_rank, doj_comment, doj_reviewed_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        request_number = EXCLUDED.request_number,
        title = EXCLUDED.title,
        template_id = EXCLUDED.template_id,
        status = EXCLUDED.status,
        urgency = EXCLUDED.urgency,
        lead_agent = EXCLUDED.lead_agent,
        command_visa = EXCLUDED.command_visa,
        division = EXCLUDED.division,
        authority = EXCLUDED.authority,
        validity = EXCLUDED.validity,
        target_name = EXCLUDED.target_name,
        target_group = EXCLUDED.target_group,
        target_location = EXCLUDED.target_location,
        charges = EXCLUDED.charges,
        created_at_label = EXCLUDED.created_at_label,
        exhibits = EXCLUDED.exhibits,
        report_text = EXCLUDED.report_text,
        updated_at = NOW()
      RETURNING *`,
      [
        record.id, record.requestNumber, record.title, record.templateId, record.status,
        record.urgency, record.authorId, record.leadAgent, record.commandVisa, record.division,
        record.authority, record.validity, record.targetName, record.targetGroup, record.targetLocation,
        record.charges, record.createdAt, JSON.stringify(record.exhibits), record.reportText,
        record.dojReviewerName, record.dojReviewerRank, record.dojComment, record.dojReviewedAt
      ]
    );
    return mapDojRow(rows[0]);
  } else {
    const idx = localStore.dojRequests.findIndex(r => r.id === id);
    if (idx === -1) localStore.dojRequests.unshift(record);
    else localStore.dojRequests[idx] = record;
    saveLocalStore();
    return record;
  }
}

export async function reviewDojRequest(id, { status, dojComment, reviewerUser }) {
  const validDecisions = ['approved', 'changes_requested', 'rejected', 'pending', 'executed'];
  if (!validDecisions.includes(status)) {
    throw new Error('Décision DOJ invalide.');
  }
  const existing = await getDojRequestById(id);
  if (!existing) return null;

  const reviewerLabel = `${reviewerUser.rank ? reviewerUser.rank + ' ' : ''}${reviewerUser.fullName}`.trim();
  const reviewedAt = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const nextVisa = status === 'approved' ? reviewerLabel : existing.commandVisa;

  if (usePostgres) {
    const { rows } = await pool.query(
      `UPDATE doj_requests SET
        status = $2,
        doj_comment = $3,
        doj_reviewer_name = $4,
        doj_reviewer_rank = $5,
        doj_reviewed_at = $6,
        command_visa = $7,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, status, String(dojComment || '').trim(), reviewerLabel, reviewerUser.rank || 'Magistrat DOJ', reviewedAt, nextVisa]
    );
    return rows[0] ? mapDojRow(rows[0]) : null;
  } else {
    const idx = localStore.dojRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    localStore.dojRequests[idx] = {
      ...localStore.dojRequests[idx],
      status,
      dojComment: String(dojComment || '').trim(),
      dojReviewerName: reviewerLabel,
      dojReviewerRank: reviewerUser.rank || 'Magistrat DOJ',
      dojReviewedAt: reviewedAt,
      commandVisa: nextVisa,
      updatedAt: new Date().toISOString()
    };
    saveLocalStore();
    return localStore.dojRequests[idx];
  }
}

export async function deleteDojRequest(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM doj_requests WHERE id = $1', [id]);
    return true;
  }
  localStore.dojRequests = localStore.dojRequests.filter(r => r.id !== id);
  saveLocalStore();
  return true;
}

// =========================================================================
// INVESTIGATIONS (DOSSIERS D'ENQUÊTE PARTAGÉS)
// =========================================================================
function mapInvRow(r) {
  return {
    id: r.id,
    caseNumber: r.case_number ?? r.caseNumber ?? '',
    title: r.title ?? '',
    templateId: r.template_id ?? r.templateId ?? '',
    division: r.division ?? '',
    status: r.status ?? 'in_progress',
    priority: r.priority ?? 'high',
    authorId: r.author_id ?? r.authorId ?? null,
    leadAgent: r.lead_agent ?? r.leadAgent ?? '',
    commandVisa: r.command_visa ?? r.commandVisa ?? '',
    targetName: r.target_name ?? r.targetName ?? '',
    targetGroup: r.target_group ?? r.targetGroup ?? '',
    location: r.location ?? '',
    createdAt: r.created_at_label ?? r.createdAt ?? '',
    suspects: r.suspects ?? [],
    evidence: r.evidence ?? [],
    reportText: r.report_text ?? r.reportText ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date().toISOString()
  };
}

export async function listInvestigations() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM investigations ORDER BY updated_at DESC');
    return rows.map(mapInvRow);
  }
  return [...localStore.investigations].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function saveInvestigation(data, authorUser) {
  const id = data.id || `case_${crypto.randomBytes(6).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const record = {
    id,
    caseNumber: data.caseNumber || `LSPD-2026-${Math.floor(100 + Math.random() * 899)}`,
    title: data.title || 'Dossier LSPD',
    templateId: data.templateId || '',
    division: data.division || 'Detective Bureau',
    status: data.status || 'in_progress',
    priority: data.priority || 'high',
    authorId: data.authorId ?? authorUser?.id ?? null,
    leadAgent: data.leadAgent || '',
    commandVisa: data.commandVisa || '',
    targetName: data.targetName || '',
    targetGroup: data.targetGroup || '',
    location: data.location || '',
    createdAt: data.createdAt || new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
    suspects: Array.isArray(data.suspects) ? data.suspects : [],
    evidence: Array.isArray(data.evidence) ? data.evidence : [],
    reportText: data.reportText || '',
    updatedAt: nowIso
  };

  if (usePostgres) {
    const { rows } = await pool.query(
      `INSERT INTO investigations (
        id, case_number, title, template_id, division, status, priority, author_id, lead_agent, command_visa,
        target_name, target_group, location, created_at_label, suspects, evidence, report_text, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        case_number = EXCLUDED.case_number,
        title = EXCLUDED.title,
        template_id = EXCLUDED.template_id,
        division = EXCLUDED.division,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        lead_agent = EXCLUDED.lead_agent,
        command_visa = EXCLUDED.command_visa,
        target_name = EXCLUDED.target_name,
        target_group = EXCLUDED.target_group,
        location = EXCLUDED.location,
        created_at_label = EXCLUDED.created_at_label,
        suspects = EXCLUDED.suspects,
        evidence = EXCLUDED.evidence,
        report_text = EXCLUDED.report_text,
        updated_at = NOW()
      RETURNING *`,
      [
        record.id, record.caseNumber, record.title, record.templateId, record.division,
        record.status, record.priority, record.authorId, record.leadAgent, record.commandVisa,
        record.targetName, record.targetGroup, record.location, record.createdAt,
        JSON.stringify(record.suspects), JSON.stringify(record.evidence), record.reportText
      ]
    );
    return mapInvRow(rows[0]);
  } else {
    const idx = localStore.investigations.findIndex(c => c.id === id);
    if (idx === -1) localStore.investigations.unshift(record);
    else localStore.investigations[idx] = record;
    saveLocalStore();
    return record;
  }
}

export async function deleteInvestigation(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM investigations WHERE id = $1', [id]);
    return true;
  }
  localStore.investigations = localStore.investigations.filter(c => c.id !== id);
  saveLocalStore();
  return true;
}

// =========================================================================
// SETTINGS (WEBHOOKS DISCORD OPTIONNELS)
// =========================================================================
export async function getSettings() {
  if (usePostgres) {
    const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = 'main'");
    return {
      webhookDojSubmit: '',
      webhookDojDecision: '',
      ...(rows[0]?.value || {})
    };
  }
  return { ...localStore.settings };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  if (usePostgres) {
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('main', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(merged)]
    );
    return merged;
  }
  localStore.settings = merged;
  saveLocalStore();
  return merged;
}
