// Générateur de feuille papier A4 officielle LSPD / DOJ (style document imprimé en jeu FiveM)
// Rend n'importe quel rapport (Arrestation, Braquage, Enquête, Demande DOJ de Descente / Mandat, Plainte...)
// sur une vraie feuille papier A4 blanche avec le vrai logo officiel LSPD, filigrane,
// preuves photographiques / pièces à conviction annexées, tampon "CERTIFIÉ CONFORME" et signatures.

import { getLspdLogoImage } from "../assets/lspdLogo";

/**
 * Met à jour automatiquement la ligne de signature (et l'agent rédacteur) dans le texte d'un rapport
 * sans écraser les autres modifications manuelles de l'utilisateur.
 */
export function syncSigningAgentInText(text, newAgent) {
  const cleanAgent = (newAgent || "").trim() || "Officier LSPD";
  let updated = String(text || "").replace(
    /(Signé\s*:\s*|Certifié (?:exact|conforme) par\s*:\s*|Rapport rédigé et certifié exact par\s*:\s*|Agent émetteur\s*:\s*|Requête soumise et certifiée exacte par\s*:\s*)([^\n—]+)/gi,
    (match, prefix, val) => {
      const hadTrailingSpace = /\s$/.test(val);
      return `${prefix}${cleanAgent}${hadTrailingSpace ? " " : ""}`;
    }
  );
  updated = updated.replace(
    /([•\-]\s*(?:Agent rédacteur(?: \(En charge\))?|Officier rédacteur|Agent en charge|Officier demandeur|Signataire)\s*:\s*)([^\n]+)/gi,
    (match, prefix) => `${prefix}${cleanAgent}`
  );
  return updated;
}

function wrapLines(ctx, text, maxWidth) {
  if (!text) return [""];
  const paragraphs = String(text).split("\n");
  const result = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      result.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        result.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) result.push(current);
  }
  return result;
}

/**
 * Dessine le véritable logo officiel LSPD fourni par l'utilisateur (fallback vectoriel si pas encore décodé)
 */
export function drawLspdBadge(ctx, cx, cy, r) {
  const logoImg = getLspdLogoImage();
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const size = r * 2.15;
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(logoImg, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
    return;
  }

  // Fallback vectoriel minimal uniquement si l'image n'est pas encore prête
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1e36";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#dfb556";
  ctx.stroke();
  ctx.restore();
}

/**
 * Filigrane subtil centré avec le vrai sceau LSPD + texte diagonal
 */
export function drawLspdWatermark(ctx, width, totalHeight) {
  const logoImg = getLspdLogoImage();
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.055;
    const wmSize = 420;
    ctx.drawImage(logoImg, (width - wmSize) / 2, (totalHeight - wmSize) / 2, wmSize, wmSize);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(width / 2, totalHeight / 2);
  ctx.rotate((-32 * Math.PI) / 180);
  ctx.fillStyle = "rgba(11, 30, 54, 0.035)";
  ctx.textAlign = "center";
  ctx.font = "900 56px 'Orbitron', sans-serif";
  ctx.fillText("LOS SANTOS POLICE DEPT.", 0, 0);
  ctx.font = "800 30px 'Inter', sans-serif";
  ctx.fillText("OFFICIAL RECORD — SAN ANDREAS", 0, 46);
  ctx.restore();
}

export function drawInkStamp(
  ctx,
  cx,
  cy,
  dateStr,
  refStr,
  topText = "LSPD • SAN ANDREAS",
  mainText = "CERTIFIÉ CONFORME",
  inkColor = null
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.globalAlpha = 0.82;

  const upperMain = String(mainText || "").toUpperCase();
  const resolvedColor =
    inkColor ||
    (upperMain.includes("APPROUV") || upperMain.includes("VALID")
      ? "#047857"
      : upperMain.includes("REFUS")
      ? "#b91c1c"
      : upperMain.includes("COMPL")
      ? "#b45309"
      : "#1d4ed8");

  // Double rectangle stamp in official LSPD / DOJ ink
  ctx.strokeStyle = resolvedColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(-108, -34, 216, 68);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-102, -28, 204, 56);

  ctx.fillStyle = resolvedColor;
  ctx.textAlign = "center";
  ctx.font = "900 12.5px 'Orbitron', sans-serif";
  ctx.fillText(topText, 0, -9);

  ctx.font = "900 15.5px 'Inter', sans-serif";
  ctx.fillText(mainText, 0, 10);

  ctx.font = "700 10px 'JetBrains Mono', monospace";
  ctx.fillText(`${dateStr || ""} — ${(refStr || "OFFICIEL").slice(0, 16)}`, 0, 23);

  ctx.restore();
}

/**
 * Coche automatiquement la case de décision DOJ ([X] MANDAT ACCORDÉ / REFUSÉ / COMPLÉMENT)
 * et remplit la ligne Observations / Limites fixées dans le texte du document.
 */
export function applyDojDecisionToReportText(text, dojDecision) {
  if (!dojDecision || !["approved", "changes_requested", "rejected"].includes(dojDecision.status)) {
    return String(text || "");
  }
  let out = String(text || "");
  const { status, reviewerName, comment, reviewedAt } = dojDecision;
  const who = reviewerName || "Magistrat DOJ";
  const when = reviewedAt || new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const obsText = comment && comment.trim()
    ? `${comment.trim()} — (${who}, le ${when})`
    : status === "approved"
    ? `Approuvé conforme par ${who} le ${when}.`
    : status === "changes_requested"
    ? `Complément requis par ${who} le ${when}.`
    : `Refusé par ${who} le ${when}.`;

  out = out.replace(
    /^([•\-]\s*(?:Décision(?:\s+DOJ)?|Suite DOJ|Réception DOJ)\s*:\s*)(.+)$/gim,
    (fullLine, prefix, rest) => {
      let clean = rest.replace(/\[[xX✓✔]\]/g, "[ ]");
      if (status === "approved") {
        clean = clean.replace(
          /\[\s*\]\s*(MANDAT ACCORDÉ|MANDAT D'ARRÊT DÉLIVRÉ|ACCORDÉ(?!\s+AVEC|\s*\()|Poursuites engagées|Rapport vérifié)/i,
          "[X] $1"
        );
      } else if (status === "changes_requested") {
        if (/ACCORDÉ AVEC RÉSERVES|Enquête complémentaire/i.test(clean)) {
          clean = clean.replace(/\[\s*\]\s*(ACCORDÉ AVEC RÉSERVES|Enquête complémentaire)/i, "[X] $1");
        } else {
          clean = `${clean.replace(/—\s*(?:Motif|Limites)\s*:\s*_+/i, "").trim()}  |  [X] COMPLÉMENT REQUIS`;
        }
      } else if (status === "rejected") {
        clean = clean.replace(/\[\s*\]\s*(REFUSÉ|Classement)/i, "[X] $1");
      }
      clean = clean.replace(/((?:Motif|Limites)\s*:\s*)_+/i, `$1${obsText}`);
      return `${prefix}${clean}`;
    }
  );

  if (/^[•\-]\s*Observations\s*\/\s*Limites fixées\s*:/im.test(out)) {
    out = out.replace(
      /^([•\-]\s*Observations\s*\/\s*Limites fixées\s*:\s*)(.*)$/im,
      `$1${obsText}`
    );
  }

  return out;
}

/**
 * Charge de manière asynchrone les images des pièces à conviction / preuves jointes
 * pour les dessiner proprement sur le Canvas imprimable sans bloquer.
 */
export async function loadExhibitImages(exhibits = []) {
  if (!Array.isArray(exhibits) || exhibits.length === 0) return [];
  const results = await Promise.all(
    exhibits.map(ex => {
      const src = ex.imageData || ex.imageUrl || "";
      if (!src) return Promise.resolve({ ...ex, imageEl: null });
      return new Promise(resolve => {
        const img = new Image();
        if (!src.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        const timer = setTimeout(() => resolve({ ...ex, imageEl: null }), 4500);
        img.onload = () => {
          clearTimeout(timer);
          resolve({ ...ex, imageEl: img });
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve({ ...ex, imageEl: null });
        };
        img.src = src;
      });
    })
  );
  return results;
}

export function generatePrintablePaperCanvas({
  title = "RAPPORT OFFICIEL D'INTERVENTION",
  docNumber = "LSPD-2026-001",
  date = "",
  agent = "16 | Vance Winchester",
  commandVisa = "",
  prevenu = "",
  reportText = "",
  exhibits = [],
  exhibitsOnly = false,
  dojDecision = null,
  stampTopText = "LSPD • SAN ANDREAS",
  stampMainText = "CERTIFIÉ CONFORME",
  statusLabel = "OFFICIEL LSPD"
}) {
  const scale = 1.5; // 1500px wide crisp print PNG (rapide en NUI FiveM)
  const width = 1000;
  const marginX = 64;
  const contentWidth = width - marginX * 2; // 872px

  const todayStr = date || new Date().toLocaleDateString("fr-FR");

  // 0. Prépare le texte : synchronise la décision DOJ (cases [X] & observations) + remplace le placeholder preuves si des preuves sont jointes
  let preparedText = String(reportText || "").replace(/\r\n/g, "\n");
  if (dojDecision) {
    preparedText = applyDojDecisionToReportText(preparedText, dojDecision);
  }
  if (Array.isArray(exhibits) && exhibits.length > 0 && /Aucune pièce photographique ou scellé joint/i.test(preparedText)) {
    const autoList = exhibits
      .map(ex => {
        const metaStr = [ex.source, ex.date].filter(Boolean).join(" — ");
        const tag = ex.imageData || ex.imageUrl || ex.imageEl ? " [PHOTO ANNEXÉE]" : "";
        return `• [${ex.code || "PIÈCE"}] ${ex.title || "Preuve jointe"}${metaStr ? ` (${metaStr})` : ""}${tag}${ex.description ? ` : ${ex.description}` : ""}`;
      })
      .join("\n");
    preparedText = preparedText.replace(/^[•\-]\s*Aucune pièce photographique ou scellé joint[^\n]*$/im, autoList);
  }

  // Parse reportText into clean structured paper blocks
  const rawLines = exhibitsOnly ? [] : preparedText.split("\n");
  const blocks = [];
  let extractedSubtitle = title;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Skip ASCII box borders ╔═╗ ╚═╝
    if (/^[╔╚═]+$/.test(trimmed)) continue;

    // Extract title inside ASCII header banner if present
    if (i > 0 && i < 6 && /^[╔═]/.test((rawLines[i - 1] || "").trim())) {
      extractedSubtitle = trimmed;
      continue;
    }
    if (i > 1 && i < 6 && /^(RÉFÉRENCE|DOSSIER|CODE|ALERTE|REQUÊTE|MANDAT)/i.test(trimmed) && /^[╚═]/.test((rawLines[i + 1] || "").trim())) {
      continue;
    }

    const innerBracket = /^\[(.+)\]$/.exec(trimmed)?.[1] || "";
    const isRealSectionBracket =
      Boolean(innerBracket) &&
      innerBracket.length <= 86 &&
      (/^\d+\./.test(innerBracket) || innerBracket === innerBracket.toUpperCase());

    if (!trimmed) {
      blocks.push({ type: "spacer", h: 10 });
    } else if (isRealSectionBracket) {
      blocks.push({ type: "section", text: innerBracket });
    } else if (/^━━/.test(trimmed)) {
      blocks.push({ type: "section", text: trimmed.replace(/━/g, "").trim() });
    } else if (/^[•\-▪]\s+/.test(trimmed)) {
      const clean = trimmed.replace(/^[•\-▪]\s+/, "");
      const colonIdx = clean.indexOf(":");
      if (colonIdx > 0 && colonIdx < 52) {
        blocks.push({
          type: "kv",
          label: clean.slice(0, colonIdx).trim(),
          value: clean.slice(colonIdx + 1).trim()
        });
      } else {
        blocks.push({ type: "bullet", text: clean });
      }
    } else if (/^\d+\.\s+\[/.test(trimmed)) {
      blocks.push({ type: "charge", text: trimmed });
    } else if (/^[└├]/.test(trimmed)) {
      blocks.push({ type: "sub", text: trimmed.replace(/^[└├]─*\s*/, "↳ ") });
    } else {
      blocks.push({ type: "para", text: trimmed });
    }
  }

  // Measure canvas to compute exact dynamic height
  const mCanvas = document.createElement("canvas");
  const mCtx = mCanvas.getContext("2d");

  let bodyHeight = 20;
  const laidOut = [];

  for (const block of blocks) {
    if (block.type === "spacer") {
      bodyHeight += block.h;
      laidOut.push(block);
    } else if (block.type === "section") {
      mCtx.font = "800 13px 'Inter', sans-serif";
      const lines = wrapLines(mCtx, block.text.toUpperCase(), contentWidth - 24);
      const boxH = Math.max(24, lines.length * 18 + 8);
      const h = boxH + 14;
      bodyHeight += h;
      laidOut.push({ ...block, lines, boxH, h });
    } else if (block.type === "kv") {
      const labelText = `▪ ${block.label} :`;
      mCtx.font = "700 14px 'Inter', sans-serif";
      const labelWidth = mCtx.measureText(labelText).width;
      const valStr = block.value || "—";

      const useStacked = labelWidth > 290 || valStr.length > 85;
      if (useStacked) {
        mCtx.font = "500 14.5px 'Inter', sans-serif";
        const valLines = wrapLines(mCtx, valStr, contentWidth - 28);
        const h = 24 + valLines.length * 21 + 8;
        bodyHeight += h;
        laidOut.push({ ...block, labelText, stacked: true, valLines, h });
      } else {
        const valOffsetX = Math.max(255, Math.ceil(labelWidth) + 20);
        mCtx.font = "500 14.5px 'Inter', sans-serif";
        const valLines = wrapLines(mCtx, valStr, contentWidth - valOffsetX - 10);
        const h = Math.max(26, valLines.length * 21 + 7);
        bodyHeight += h;
        laidOut.push({ ...block, labelText, stacked: false, valOffsetX, valLines, h });
      }
    } else if (block.type === "charge") {
      mCtx.font = "700 15px 'Inter', sans-serif";
      const lines = wrapLines(mCtx, block.text, contentWidth - 20);
      const h = lines.length * 22 + 10;
      bodyHeight += h;
      laidOut.push({ ...block, lines, h });
    } else if (block.type === "sub") {
      mCtx.font = "500 14px 'Inter', sans-serif";
      const lines = wrapLines(mCtx, block.text, contentWidth - 44);
      const h = lines.length * 20 + 4;
      bodyHeight += h;
      laidOut.push({ ...block, lines, h });
    } else {
      mCtx.font = "400 14.5px 'Inter', sans-serif";
      const lines = wrapLines(mCtx, block.text, contentWidth - 8);
      const h = lines.length * 21 + 4;
      bodyHeight += h;
      laidOut.push({ ...block, lines, h });
    }
  }

  // Measure Exhibits / Preuves Jointes layout
  const validExhibits = Array.isArray(exhibits) ? exhibits : [];
  const photoExhibits = validExhibits.filter(ex => ex.imageEl || ex.imageData || ex.imageUrl);
  const textExhibits = validExhibits.filter(ex => !ex.imageEl && !ex.imageData && !ex.imageUrl);

  const photoCardGap = 16;
  const photoCardW = photoExhibits.length === 1 ? contentWidth : (contentWidth - photoCardGap) / 2;
  const photoImgH = photoExhibits.length === 1 ? 360 : 235;

  const laidOutPhotoCards = photoExhibits.map(ex => {
    mCtx.font = "700 13.5px 'Inter', sans-serif";
    const titleLines = wrapLines(mCtx, ex.title || "Preuve photographique", photoCardW - 22);
    mCtx.font = "400 12px 'Inter', sans-serif";
    const descLines = ex.description ? wrapLines(mCtx, ex.description, photoCardW - 22) : [];
    const captionH = 14 + titleLines.length * 18 + (descLines.length > 0 ? 4 + descLines.length * 16 : 0) + 10;
    const cardH = 30 + photoImgH + captionH;
    return { ...ex, titleLines, descLines, cardH };
  });

  // Group photo cards into rows of 2 (or 1 if single photo)
  const photoRows = [];
  if (laidOutPhotoCards.length === 1) {
    photoRows.push({ items: [laidOutPhotoCards[0]], rowH: laidOutPhotoCards[0].cardH });
  } else {
    for (let i = 0; i < laidOutPhotoCards.length; i += 2) {
      const pair = laidOutPhotoCards.slice(i, i + 2);
      const rowH = Math.max(...pair.map(p => p.cardH));
      photoRows.push({ items: pair, rowH });
    }
  }

  const laidOutTextExhibits = textExhibits.map(ex => {
    mCtx.font = "400 13px 'Inter', sans-serif";
    const descLines = ex.description ? wrapLines(mCtx, ex.description, contentWidth - 32) : [];
    const h = 34 + (descLines.length > 0 ? descLines.length * 18 + 8 : 6);
    return { ...ex, descLines, h };
  });

  let exhibitsHeight = 0;
  if (validExhibits.length > 0) {
    exhibitsHeight += 48; // section header + top spacing
    for (const te of laidOutTextExhibits) {
      exhibitsHeight += te.h + 10;
    }
    for (const pr of photoRows) {
      exhibitsHeight += pr.rowH + 16;
    }
    exhibitsHeight += 10;
  }

  // Encadré officiel de Décision DOJ (affiché dès que le DOJ a validé, demandé un complément ou refusé)
  const hasDojDecisionBox = Boolean(
    dojDecision && ["approved", "changes_requested", "rejected"].includes(dojDecision.status)
  );
  let dojDecisionCommentLines = [];
  let dojDecisionBoxHeight = 0;
  if (hasDojDecisionBox) {
    mCtx.font = "500 13.5px 'Inter', sans-serif";
    const obsLabel = dojDecision.comment && dojDecision.comment.trim()
      ? `Observations / Motif DOJ : ${dojDecision.comment.trim()}`
      : dojDecision.status === "approved"
      ? "Décision conforme aux dispositions du Code de Procédure Criminelle de San Andreas — Exécution autorisée."
      : "";
    dojDecisionCommentLines = obsLabel ? wrapLines(mCtx, obsLabel, contentWidth - 36) : [];
    dojDecisionBoxHeight = 64 + (dojDecisionCommentLines.length > 0 ? dojDecisionCommentLines.length * 19 + 8 : 0) + 18;
  }

  const headerHeight = 205;
  const footerHeight = 185;
  const totalHeight = Math.max(1380, headerHeight + bodyHeight + dojDecisionBoxHeight + exhibitsHeight + footerHeight);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 1. Official Paper Surface (warm crisp paper #fafaf6)
  ctx.fillStyle = "#fafaf6";
  ctx.fillRect(0, 0, width, totalHeight);

  // Outer Navy + Inner Gold border frame
  ctx.strokeStyle = "#0b1e36";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(24, 24, width - 48, totalHeight - 48);

  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, width - 60, totalHeight - 60);

  // Official LSPD Logo + Text Watermark
  drawLspdWatermark(ctx, width, totalHeight);

  // 2. Official LSPD Letterhead Banner
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(31, 31, width - 62, 118);

  // Gold accent bottom bar under header
  ctx.fillStyle = "#c59b27";
  ctx.fillRect(31, 149, width - 62, 4);

  // Real LSPD Official Logo on left
  drawLspdBadge(ctx, 96, 90, 42);

  // Header Titles
  ctx.fillStyle = "#dfb556";
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillText("STATE OF SAN ANDREAS  •  CITY OF LOS SANTOS  •  DEPARTMENT OF JUSTICE", 156, 62);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px 'Orbitron', sans-serif";
  ctx.fillText("LOS SANTOS POLICE DEPARTMENT", 156, 92);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "700 13.5px 'Inter', sans-serif";
  const bannerSubtitle = exhibitsOnly
    ? `ANNEXE PREUVES & PIÈCES À CONVICTION — ${title}`
    : extractedSubtitle;
  ctx.fillText(bannerSubtitle.slice(0, 68), 156, 116);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.fillText("DOCUMENT IMPRIMABLE OFFICIEL — TERMINAL MDT LSPD / DOJ", 156, 136);

  // Top-right Reference Box
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(width - 236, 48, 190, 82);
  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 1;
  ctx.strokeRect(width - 236, 48, 190, 82);

  ctx.fillStyle = "#dfb556";
  ctx.font = "700 10px 'Inter', sans-serif";
  ctx.fillText("RÉFÉRENCE DOCUMENT", width - 224, 67);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 13px 'JetBrains Mono', monospace";
  ctx.fillText((docNumber || "LSPD-2026").slice(0, 18), width - 224, 86);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10.5px 'Inter', sans-serif";
  ctx.fillText(`DATE : ${todayStr}`, width - 224, 106);
  ctx.fillText(`STATUT : ${statusLabel}`.slice(0, 26), width - 224, 121);

  // Sub-strip info bar (Agent / Prévenu)
  ctx.fillStyle = "#eef2f7";
  ctx.fillRect(marginX, 166, contentWidth, 28);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(marginX, 166, contentWidth, 28);

  ctx.fillStyle = "#0b1e36";
  ctx.font = "700 12px 'Inter', sans-serif";
  ctx.fillText(`OFFICIER : ${agent || "LSPD"}`, marginX + 12, 184);
  if (prevenu) {
    ctx.textAlign = "right";
    ctx.fillText(`CONCERNÉ / CIBLE : ${prevenu}`, width - marginX - 12, 184);
    ctx.textAlign = "left";
  }

  // 3. Render Parsed Document Body
  let curY = headerHeight + 8;

  for (const item of laidOut) {
    if (item.type === "spacer") {
      curY += item.h;
    } else if (item.type === "section") {
      curY += 6;
      const boxH = item.boxH || 24;
      ctx.fillStyle = "#0b1e36";
      ctx.fillRect(marginX, curY, 5, boxH);
      ctx.fillStyle = "#eef3f9";
      ctx.fillRect(marginX + 5, curY, contentWidth - 5, boxH);
      ctx.fillStyle = "#0b1e36";
      ctx.font = "800 13px 'Inter', sans-serif";
      (item.lines || [item.text.toUpperCase()]).forEach((sl, li) => {
        ctx.fillText(sl, marginX + 14, curY + 16 + li * 18);
      });
      curY += boxH + 8;
    } else if (item.type === "kv") {
      ctx.fillStyle = "#0f172a";
      ctx.font = "700 14px 'Inter', sans-serif";
      ctx.fillText(item.labelText, marginX + 6, curY + 16);

      ctx.fillStyle = "#1e293b";
      ctx.font = "500 14.5px 'Inter', sans-serif";
      if (item.stacked) {
        item.valLines.forEach((vl, li) => {
          ctx.fillText(vl, marginX + 22, curY + 38 + li * 21);
        });
      } else {
        item.valLines.forEach((vl, li) => {
          ctx.fillText(vl, marginX + item.valOffsetX, curY + 16 + li * 21);
        });
      }

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(marginX + 4, curY + item.h - 2);
      ctx.lineTo(width - marginX - 4, curY + item.h - 2);
      ctx.stroke();

      curY += item.h;
    } else if (item.type === "charge") {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(marginX + 4, curY, contentWidth - 8, item.h - 4);
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(marginX + 4, curY, 3.5, item.h - 4);

      ctx.fillStyle = "#0b1e36";
      ctx.font = "700 14.5px 'Inter', sans-serif";
      item.lines.forEach((l, li) => {
        ctx.fillText(l, marginX + 14, curY + 18 + li * 22);
      });
      curY += item.h;
    } else if (item.type === "sub") {
      ctx.fillStyle = "#475569";
      ctx.font = "500 13.5px 'Inter', sans-serif";
      item.lines.forEach((l, li) => {
        ctx.fillText(l, marginX + 26, curY + 15 + li * 20);
      });
      curY += item.h;
    } else if (item.type === "bullet") {
      ctx.fillStyle = "#1e293b";
      ctx.font = "500 14px 'Inter', sans-serif";
      item.lines.forEach((l, li) => {
        ctx.fillText((li === 0 ? "• " : "  ") + l, marginX + 10, curY + 15 + li * 21);
      });
      curY += item.h;
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.font = "400 14.5px 'Inter', sans-serif";
      item.lines.forEach((l, li) => {
        ctx.fillText(l, marginX + 4, curY + 16 + li * 21);
      });
      curY += item.h;
    }
  }

  // 3A-bis. Render Official DOJ Decision Box (si le DOJ a validé / demandé un complément / refusé)
  if (hasDojDecisionBox) {
    curY += 8;
    const boxH = dojDecisionBoxHeight - 18;
    const isApp = dojDecision.status === "approved";
    const isChg = dojDecision.status === "changes_requested";
    const palette = isApp
      ? { bg: "#ecfdf5", border: "#047857", accent: "#047857", title: "✓  DÉCISION OFFICIELLE DU DOJ : APPROUVÉ / VALIDÉ" }
      : isChg
      ? { bg: "#fffbeb", border: "#b45309", accent: "#b45309", title: "⚠  DÉCISION OFFICIELLE DU DOJ : COMPLÉMENT REQUIS" }
      : { bg: "#fef2f2", border: "#b91c1c", accent: "#b91c1c", title: "✗  DÉCISION OFFICIELLE DU DOJ : REFUSÉ" };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(marginX, curY, contentWidth, boxH);
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(marginX, curY, contentWidth, boxH);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(marginX, curY, 6, boxH);

    ctx.fillStyle = palette.accent;
    ctx.font = "800 13.5px 'Inter', sans-serif";
    ctx.fillText(palette.title, marginX + 18, curY + 23);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 12.5px 'JetBrains Mono', monospace";
    const revLine = `MAGISTRAT / PROCUREUR : ${dojDecision.reviewerName || commandVisa || "DOJ San Andreas"}${
      dojDecision.reviewedAt ? `   •   LE ${dojDecision.reviewedAt}` : ""
    }`;
    ctx.fillText(revLine, marginX + 18, curY + 45);

    if (dojDecisionCommentLines.length > 0) {
      ctx.fillStyle = "#1e293b";
      ctx.font = "500 13.5px 'Inter', sans-serif";
      dojDecisionCommentLines.forEach((line, idx) => {
        ctx.fillText(line, marginX + 18, curY + 67 + idx * 19);
      });
    }

    curY += boxH + 14;
  }

  // 3B. Render Attached Exhibits & Photo Proofs (Pièces à conviction / Preuves DOJ)
  if (validExhibits.length > 0) {
    curY += 10;
    ctx.fillStyle = "#0b1e36";
    ctx.fillRect(marginX, curY, 5, 26);
    ctx.fillStyle = "#eef3f9";
    ctx.fillRect(marginX + 5, curY, contentWidth - 5, 26);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(marginX, curY, contentWidth, 26);
    ctx.fillStyle = "#0b1e36";
    ctx.font = "800 13px 'Inter', sans-serif";
    ctx.fillText(
      `ANNEXE — PIÈCES À CONVICTION & PREUVES JOINTES AU DOSSIER (${validExhibits.length})`,
      marginX + 14,
      curY + 17
    );
    curY += 36;

    // Text-only exhibits first
    for (const te of laidOutTextExhibits) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(marginX, curY, contentWidth, te.h);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, curY, contentWidth, te.h);
      ctx.fillStyle = "#c59b27";
      ctx.fillRect(marginX, curY, 4.5, te.h);

      ctx.fillStyle = "#0b1e36";
      ctx.font = "800 12px 'JetBrains Mono', monospace";
      const codeStr = `[${te.code || "PIÈCE"}]`;
      ctx.fillText(codeStr, marginX + 14, curY + 20);
      const cw = ctx.measureText(codeStr).width;

      ctx.font = "700 13.5px 'Inter', sans-serif";
      ctx.fillText(te.title || "Pièce jointe", marginX + 22 + cw, curY + 20);

      if (te.source || te.date) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#64748b";
        ctx.font = "600 11px 'Inter', sans-serif";
        ctx.fillText([te.source, te.date].filter(Boolean).join(" • "), width - marginX - 12, curY + 20);
        ctx.textAlign = "left";
      }

      if (te.descLines.length > 0) {
        ctx.fillStyle = "#334155";
        ctx.font = "400 13px 'Inter', sans-serif";
        te.descLines.forEach((l, li) => {
          ctx.fillText(l, marginX + 14, curY + 40 + li * 18);
        });
      }

      curY += te.h + 10;
    }

    // Photo exhibits grid
    for (const pr of photoRows) {
      pr.items.forEach((card, colIdx) => {
        const cx = marginX + colIdx * (photoCardW + photoCardGap);
        const cardH = pr.rowH;

        // Card container
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx, curY, photoCardW, cardH);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx, curY, photoCardW, cardH);

        // Top navy exhibit ribbon
        ctx.fillStyle = "#0b1e36";
        ctx.fillRect(cx, curY, photoCardW, 28);
        ctx.fillStyle = "#dfb556";
        ctx.font = "800 11.5px 'JetBrains Mono', monospace";
        ctx.fillText(card.code || "PIÈCE", cx + 10, curY + 18);

        if (card.source || card.date) {
          ctx.textAlign = "right";
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "600 10.5px 'Inter', sans-serif";
          const safeSource = (card.source || "").slice(0, 28);
          const ribbonMeta = [safeSource, card.date].filter(Boolean).join(" • ");
          ctx.fillText(ribbonMeta, cx + photoCardW - 10, curY + 18);
          ctx.textAlign = "left";
        }

        // Photo dark matte frame
        const imgBoxY = curY + 28;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(cx + 1, imgBoxY, photoCardW - 2, photoImgH);

        if (card.imageEl && card.imageEl.naturalWidth > 0) {
          const iw = card.imageEl.naturalWidth;
          const ih = card.imageEl.naturalHeight;
          const boxW = photoCardW - 12;
          const boxH = photoImgH - 12;
          const ratio = Math.min(boxW / iw, boxH / ih);
          const drawW = iw * ratio;
          const drawH = ih * ratio;
          const dx = cx + (photoCardW - drawW) / 2;
          const dy = imgBoxY + (photoImgH - drawH) / 2;

          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(card.imageEl, dx, dy, drawW, drawH);
          ctx.restore();
        } else {
          ctx.fillStyle = "#94a3b8";
          ctx.textAlign = "center";
          ctx.font = "600 12px 'Inter', sans-serif";
          ctx.fillText("Image non chargée (vérifiez le lien ou importez le fichier)", cx + photoCardW / 2, imgBoxY + photoImgH / 2);
          ctx.textAlign = "left";
        }

        // Caption below photo
        let capY = imgBoxY + photoImgH + 20;
        ctx.fillStyle = "#0f172a";
        ctx.font = "700 13.5px 'Inter', sans-serif";
        card.titleLines.forEach(tl => {
          ctx.fillText(tl, cx + 11, capY);
          capY += 18;
        });

        if (card.descLines.length > 0) {
          capY += 2;
          ctx.fillStyle = "#475569";
          ctx.font = "400 12px 'Inter', sans-serif";
          card.descLines.forEach(dl => {
            ctx.fillText(dl, cx + 11, capY);
            capY += 16;
          });
        }
      });

      curY += pr.rowH + 16;
    }
  }

  // 4. Official Bottom Signature & Ink Stamp Block
  const sigY = totalHeight - 155;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(marginX, sigY);
  ctx.lineTo(width - marginX, sigY);
  ctx.stroke();

  // Left: Officer Signature
  ctx.fillStyle = "#475569";
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillText("SIGNATURE DE L'OFFICIER RÉDACTEUR", marginX, sigY + 22);

  ctx.fillStyle = "#0b1e36";
  ctx.font = "italic 700 22px Georgia, serif";
  ctx.fillText((agent || "Officier LSPD").split("|").pop().trim(), marginX + 4, sigY + 56);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.fillText(`${agent || "LSPD"} — Le ${todayStr}`, marginX, sigY + 78);

  // Center: Authentic LSPD Ink Stamp
  drawInkStamp(ctx, width / 2, sigY + 48, todayStr, docNumber, stampTopText, stampMainText);

  // Right: Command / DOJ Visa Box
  ctx.fillStyle = "#475569";
  ctx.textAlign = "right";
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillText("VISA COMMANDEMENT / BUREAU DU PROCUREUR / JUGE", width - marginX, sigY + 22);
  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(width - marginX - 230, sigY + 32, 230, 50);
  if (commandVisa && commandVisa.trim()) {
    ctx.fillStyle = "#0b1e36";
    ctx.font = "italic 700 18px Georgia, serif";
    ctx.fillText(commandVisa.trim().slice(0, 26), width - marginX - 12, sigY + 62);
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 10px 'Inter', sans-serif";
    ctx.fillText("Cachet / Visa DOJ (si requis)", width - marginX - 10, sigY + 62);
  }
  ctx.textAlign = "left";

  // Bottom legal footer
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(31, totalHeight - 56, width - 62, 25);
  ctx.fillStyle = "#dfb556";
  ctx.textAlign = "center";
  ctx.font = "700 10.5px 'Inter', sans-serif";
  ctx.fillText(
    "DOCUMENT OFFICIEL DU LOS SANTOS POLICE DEPARTMENT — TOUTE FALSIFICATION EST PUNIE PAR L'ART. 319 DU CODE PÉNAL DE SAN ANDREAS",
    width / 2,
    totalHeight - 40
  );
  ctx.textAlign = "left";

  return canvas;
}

/**
 * Ouvre la fenêtre d'impression native du navigateur via iframe cachée (fonctionne même si les pop-ups sont bloqués !)
 */
export function triggerBrowserPrint(dataUrl, title = "Rapport LSPD") {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    img { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="${dataUrl}" />
</body>
</html>`);
    doc.close();

    const img = doc.querySelector("img");
    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 2000);
      }
    };

    if (img && !img.complete) {
      img.onload = () => setTimeout(doPrint, 150);
    } else {
      setTimeout(doPrint, 150);
    }
  } catch {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) {
      alert("Téléchargez l'image .PNG ou utilisez Copier Image pour imprimer.");
      return;
    }
    win.document.write(`<html><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print()" /></body></html>`);
    win.document.close();
  }
}
