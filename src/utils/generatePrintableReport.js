// Générateur de feuille papier A4 officielle LSPD (style document imprimé en jeu FiveM)
// Rend n'importe quel rapport (Arrestation, Braquage, Enquête, Mandat, Plainte, Interrogatoire...)
// sur une vraie feuille papier A4 blanche avec en-tête officiel LSPD, sceau, tampon "CERTIFIÉ CONFORME" et signature.

/**
 * Met à jour automatiquement la ligne de signature (et l'agent rédacteur) dans le texte d'un rapport
 * sans écraser les autres modifications manuelles de l'utilisateur.
 */
export function syncSigningAgentInText(text, newAgent) {
  const cleanAgent = (newAgent || "").trim() || "Officier LSPD";
  let updated = String(text || "").replace(
    /(Signé\s*:\s*|Certifié (?:exact|conforme) par\s*:\s*|Rapport rédigé et certifié exact par\s*:\s*|Agent émetteur\s*:\s*)([^\n—]+)/gi,
    (match, prefix, val) => {
      const hadTrailingSpace = /\s$/.test(val);
      return `${prefix}${cleanAgent}${hadTrailingSpace ? " " : ""}`;
    }
  );
  updated = updated.replace(
    /([•\-]\s*(?:Agent rédacteur(?: \(En charge\))?|Officier rédacteur|Agent en charge|Signataire)\s*:\s*)([^\n]+)/gi,
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

function drawLspdBadge(ctx, cx, cy, r) {
  ctx.save();
  // Outer gold ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1e36";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#b8891f";
  ctx.stroke();

  // Inner dashed ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "#dfb556";
  ctx.stroke();
  ctx.setLineDash([]);

  // Shield shape inside
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy - r * 0.36);
  ctx.lineTo(cx + r * 0.45, cy - r * 0.36);
  ctx.lineTo(cx + r * 0.45, cy + r * 0.08);
  ctx.quadraticCurveTo(cx + r * 0.45, cy + r * 0.46, cx, cy + r * 0.62);
  ctx.quadraticCurveTo(cx - r * 0.45, cy + r * 0.46, cx - r * 0.45, cy + r * 0.08);
  ctx.closePath();
  ctx.fillStyle = "#143054";
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = "#dfb556";
  ctx.stroke();

  // 5-point Star
  ctx.beginPath();
  const spikes = 5;
  const outerR = r * 0.28;
  const innerR = r * 0.12;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = (i * Math.PI) / spikes - Math.PI / 2;
    const dist = i % 2 === 0 ? outerR : innerR;
    const sx = cx + Math.cos(rad) * dist;
    const sy = cy + 3 + Math.sin(rad) * dist;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = "#dfb556";
  ctx.fill();

  ctx.restore();
}

function drawInkStamp(ctx, cx, cy, dateStr, refStr) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.globalAlpha = 0.78;

  // Double rectangle stamp in official LSPD ink blue
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 3;
  ctx.strokeRect(-102, -34, 204, 68);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-96, -28, 192, 56);

  ctx.fillStyle = "#1d4ed8";
  ctx.textAlign = "center";
  ctx.font = "900 13px 'Orbitron', sans-serif";
  ctx.fillText("LSPD • SAN ANDREAS", 0, -9);

  ctx.font = "900 16px 'Inter', sans-serif";
  ctx.fillText("CERTIFIÉ CONFORME", 0, 10);

  ctx.font = "700 10px 'JetBrains Mono', monospace";
  ctx.fillText(`${dateStr || ""} — ${(refStr || "OFFICIEL").slice(0, 16)}`, 0, 23);

  ctx.restore();
}

export function generatePrintablePaperCanvas({
  title = "RAPPORT OFFICIEL D'INTERVENTION",
  docNumber = "LSPD-2026-001",
  date = "",
  agent = "16 | Vance Winchester",
  commandVisa = "",
  prevenu = "",
  reportText = ""
}) {
  const scale = 1.5; // 1500px wide crisp print PNG (~180-320KB, fast in FiveM NUI!)
  const width = 1000;
  const marginX = 64;
  const contentWidth = width - marginX * 2;

  const todayStr = date || new Date().toLocaleDateString("fr-FR");

  // Parse the report text lines to render cleanly on white paper
  const rawLines = String(reportText || "").split(/\r?\n/);
  const parsedBlocks = [];
  let extractedSubtitle = title;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    // Skip decorative ASCII box lines from text mode (we render real official paper letterhead instead!)
    if (/^[╔╚═]+$/.test(trimmed)) continue;
    if (i < 5 && (trimmed.startsWith("LOS SANTOS POLICE") || trimmed.startsWith("LSPD") || trimmed.startsWith("REQUÊTE AUX FINS"))) {
      extractedSubtitle = trimmed;
      continue;
    }
    if (i < 6 && (trimmed.startsWith("RÉFÉRENCE") || trimmed.startsWith("DOSSIER N°") || trimmed.startsWith("CODE 10-") || trimmed.startsWith("ALERTE") || trimmed.startsWith("N° DE") || trimmed.startsWith("N° D'ALERTE") || trimmed.startsWith("BORDEREAU") || trimmed.startsWith("FEUILLE DE") || trimmed.startsWith("CONFORME À"))) {
      continue;
    }

    if (!trimmed) {
      parsedBlocks.push({ type: "spacer" });
      continue;
    }

    // Section headers like [1. INFORMATIONS...] or [CHEFS D'INCULPATION...]
    if (/^\[.+\]$/.test(trimmed)) {
      parsedBlocks.push({ type: "section", text: trimmed.replace(/^\[|\]$/g, "") });
      continue;
    }

    // Key-Value bullet like "• Date & Heure : 25/11/2026"
    const kvMatch = trimmed.match(/^[•\-]\s*([^:]{2,42})\s*:\s*(.*)$/);
    if (kvMatch) {
      parsedBlocks.push({
        type: "kv",
        label: kvMatch[1].trim(),
        value: kvMatch[2].trim()
      });
      continue;
    }

    // Sub-detail line starting with ↳
    if (trimmed.startsWith("↳")) {
      parsedBlocks.push({ type: "sub", text: trimmed });
      continue;
    }

    // Numbered offense item e.g. "1. [Art. 403 | ...]"
    if (/^\d+\.\s+\[/.test(trimmed)) {
      parsedBlocks.push({ type: "charge", text: trimmed });
      continue;
    }

    parsedBlocks.push({ type: "paragraph", text: trimmed });
  }

  // First pass: measure height
  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");

  const laidOut = [];
  let bodyHeight = 0;

  for (const block of parsedBlocks) {
    if (block.type === "spacer") {
      bodyHeight += 10;
      laidOut.push({ ...block, h: 10 });
    } else if (block.type === "section") {
      bodyHeight += 38;
      laidOut.push({ ...block, h: 38 });
    } else if (block.type === "kv") {
      const labelText = `▪ ${block.label} :`;
      mCtx.font = "700 14px 'Inter', sans-serif";
      const labelWidth = mCtx.measureText(labelText).width;
      const valStr = block.value || "—";

      // Si le libellé est long (> 290px) ou le texte est un long récit (> 85 caractères),
      // on affiche le libellé sur sa propre ligne puis le contenu en pleine largeur dessous (zéro chevauchement).
      const useStacked = labelWidth > 290 || valStr.length > 85;

      if (useStacked) {
        mCtx.font = "400 14.5px 'Inter', sans-serif";
        const valLines = wrapLines(mCtx, valStr, contentWidth - 32);
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

  const headerHeight = 205;
  const footerHeight = 185;
  const totalHeight = Math.max(1380, headerHeight + bodyHeight + footerHeight);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 1. Official Paper Surface (warm crisp paper #fafaf6)
  ctx.fillStyle = "#fafaf6";
  ctx.fillRect(0, 0, width, totalHeight);

  // Subtle paper vignette / border frame
  ctx.strokeStyle = "#0b1e36";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(24, 24, width - 48, totalHeight - 48);

  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, width - 60, totalHeight - 60);

  // Subtle diagonal background watermark
  ctx.save();
  ctx.translate(width / 2, totalHeight / 2);
  ctx.rotate((-32 * Math.PI) / 180);
  ctx.fillStyle = "rgba(11, 30, 54, 0.04)";
  ctx.textAlign = "center";
  ctx.font = "900 58px 'Orbitron', sans-serif";
  ctx.fillText("LOS SANTOS POLICE DEPT.", 0, 0);
  ctx.font = "800 32px 'Inter', sans-serif";
  ctx.fillText("OFFICIAL RECORD — SAN ANDREAS", 0, 48);
  ctx.restore();

  // 2. Official LSPD Letterhead Banner
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(31, 31, width - 62, 118);

  // Gold accent bottom bar under header
  ctx.fillStyle = "#c59b27";
  ctx.fillRect(31, 149, width - 62, 4);

  // Badge on left
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
  ctx.fillText(extractedSubtitle.slice(0, 68), 156, 116);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.fillText("DOCUMENT IMPRIMABLE OFFICIEL — TERMINAL MDT LSPD", 156, 136);

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
  ctx.fillText("STATUT : OFFICIEL LSPD", width - 224, 121);

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
    ctx.fillText(`CONCERNÉ / PRÉVENU : ${prevenu}`, width - marginX - 12, 184);
    ctx.textAlign = "left";
  }

  // 3. Render Parsed Document Body
  let curY = headerHeight + 8;

  for (const item of laidOut) {
    if (item.type === "spacer") {
      curY += item.h;
    } else if (item.type === "section") {
      curY += 6;
      ctx.fillStyle = "#0b1e36";
      ctx.fillRect(marginX, curY, 5, 24);
      ctx.fillStyle = "#eef3f9";
      ctx.fillRect(marginX + 5, curY, contentWidth - 5, 24);

      ctx.fillStyle = "#0b1e36";
      ctx.font = "800 13px 'Inter', sans-serif";
      ctx.fillText(item.text.toUpperCase(), marginX + 14, curY + 16.5);

      curY += 32;
    } else if (item.type === "kv") {
      ctx.fillStyle = "#0b1e36";
      ctx.font = "700 14px 'Inter', sans-serif";
      ctx.fillText(item.labelText, marginX + 6, curY + 16);

      if (item.stacked) {
        ctx.fillStyle = "#1e293b";
        ctx.font = "400 14.5px 'Inter', sans-serif";
        let ly = curY + 38;
        item.valLines.forEach(line => {
          ctx.fillText(line, marginX + 22, ly);
          ly += 21;
        });
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.font = "500 14.5px 'Inter', sans-serif";
        let ly = curY + 16;
        item.valLines.forEach(line => {
          ctx.fillText(line, marginX + item.valOffsetX, ly);
          ly += 21;
        });
      }

      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 6, curY + item.h - 2);
      ctx.lineTo(width - marginX - 6, curY + item.h - 2);
      ctx.stroke();

      curY += item.h;
    } else if (item.type === "charge") {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(marginX + 4, curY, contentWidth - 8, item.h - 4);
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(marginX + 4, curY, 3, item.h - 4);

      ctx.fillStyle = "#0b1e36";
      ctx.font = "700 14.5px 'Inter', sans-serif";
      let ly = curY + 18;
      item.lines.forEach(line => {
        ctx.fillText(line, marginX + 16, ly);
        ly += 22;
      });
      curY += item.h;
    } else if (item.type === "sub") {
      ctx.fillStyle = "#334155";
      ctx.font = "600 13.5px 'Inter', sans-serif";
      let ly = curY + 15;
      item.lines.forEach(line => {
        ctx.fillText(line, marginX + 28, ly);
        ly += 20;
      });
      curY += item.h;
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.font = "400 14.5px 'Inter', sans-serif";
      let ly = curY + 15;
      item.lines.forEach(line => {
        ctx.fillText(line, marginX + 6, ly);
        ly += 21;
      });
      curY += item.h;
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
  drawInkStamp(ctx, width / 2, sigY + 48, todayStr, docNumber);

  // Right: Command / DOJ Visa Box
  ctx.fillStyle = "#475569";
  ctx.textAlign = "right";
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillText("VISA COMMANDEMENT / BUREAU DU PROCUREUR", width - marginX, sigY + 22);
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
 * Ouvre la fenêtre d'impression native du navigateur (Imprimante réelle ou Enregistrer en PDF)
 */
export function triggerBrowserPrint(dataUrl, title = "Rapport LSPD") {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Veuillez autoriser les pop-ups pour lancer l'impression PDF, ou téléchargez l'image PNG.");
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #1e293b; display: flex; justify-content: center; }
    img { max-width: 100%; height: auto; display: block; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    @media print {
      body { background: #fff; }
      img { width: 100%; box-shadow: none; }
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" onload="setTimeout(() => { window.print(); }, 250);" />
</body>
</html>`);
  win.document.close();
}
