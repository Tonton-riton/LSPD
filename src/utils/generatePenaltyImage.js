// Générateur de Fiche Officielle de Calcul des Peines & Amendes LSPD (.PNG)
// Exact même format feuille papier A4 officielle LSPD que les rapports imprimables en jeu :
// papier #fafaf6, double bordure Navy/Or, filigrane diagonal, en-tête LSPD avec écusson,
// tableau papier des chefs d'inculpation, barème des 5 paliers, encadré sentence retenue,
// signature manuscrite de l'officier, tampon encre "CERTIFIÉ CONFORME" et Visa DOJ.

import { formatCurrency, formatMinutesToHours, formatRetentionHours } from "./formulaEngine";
import { drawLspdBadge, drawInkStamp } from "./generatePrintableReport";

function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = String(text).split("\n");
  const lines = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function getPaperCatStyle(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("crime")) {
    return { stripe: "#b91c1c", bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
  }
  if (c.includes("majeur")) {
    return { stripe: "#b45309", bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
  }
  if (c.includes("mineur")) {
    return { stripe: "#1d4ed8", bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" };
  }
  return { stripe: "#047857", bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" };
}

function drawSectionHeader(ctx, x, y, w, title, rightCols = null) {
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(x, y, 5, 26);
  ctx.fillStyle = "#eef3f9";
  ctx.fillRect(x + 5, y, w - 5, 26);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x, y, w, 26);

  ctx.fillStyle = "#0b1e36";
  ctx.font = "800 12.5px 'Inter', sans-serif";
  ctx.fillText(title.toUpperCase(), x + 14, y + 17);

  if (rightCols) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#475569";
    ctx.font = "800 11px 'Inter', sans-serif";
    ctx.fillText(rightCols.col1, x + w - 135, y + 17);
    ctx.fillText(rightCols.col2, x + w - 14, y + 17);
    ctx.textAlign = "left";
  }
}

export function generatePenaltyCanvas({
  meta = {},
  serial = "LSPD-RA-2026",
  commandVisa = "",
  summary,
  activePalier,
  config,
  notes = ""
}) {
  const scale = 1.5; // 1500px wide crisp print PNG (identique aux rapports imprimables FiveM)
  const width = 1000;
  const marginX = 64;
  const contentWidth = width - marginX * 2; // 872px
  const maxLeftWidth = contentWidth - 255; // ~617px, garantit zéro chevauchement avec les montants à droite

  const todayStr = meta.date || new Date().toLocaleDateString("fr-FR");
  const heureStr = meta.heure || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const agentName = meta.agent || "16 | Vance Winchester";
  const prevenuName = meta.prevenu || "Non renseigné";
  const hasAvocat = (summary?.activeRows || []).some(r => r.avocat);

  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");

  // 1. Pre-measure all offense rows
  const rowLayouts = (summary?.activeRows || []).map((row, idx) => {
    const { calc } = row;
    const aggs = calc.selectedAggravantesObjects.map(
      a => `${a.circonstance} (+$${a.amendeSupplementaire} / +${a.peineSupplementaireMinutes}m)`
    );
    const mods = [
      row.qte > 1 ? `Quantité : ×${row.qte}` : null,
      row.tentative ? `Tentative (×${config.tentativeMultiplier})` : null,
      row.complicite ? `Complicité (×${config.compliciteMultiplier})` : null,
      row.avocat ? `Avocat (×${config.avocatMultiplier})` : null
    ].filter(Boolean);

    mCtx.font = "700 14.5px 'Inter', sans-serif";
    const titleLines = wrapTextLines(mCtx, calc.chefAccusation, maxLeftWidth);

    mCtx.font = "600 12.5px 'Inter', sans-serif";
    const aggText = aggs.length > 0 ? `Circonstances aggravantes : ${aggs.join(" • ")}` : "";
    const aggLines = aggText ? wrapTextLines(mCtx, aggText, maxLeftWidth) : [];

    mCtx.font = "700 12.5px 'Inter', sans-serif";
    const specText = calc.specialText ? `Mesure spéciale : ${calc.specialText}` : "";
    const specLines = specText ? wrapTextLines(mCtx, specText, maxLeftWidth) : [];

    const rowHeight =
      26 +
      titleLines.length * 19 +
      (aggLines.length > 0 ? 5 + aggLines.length * 16.5 : 0) +
      (mods.length > 0 ? 19 : 0) +
      (specLines.length > 0 ? 5 + specLines.length * 16.5 : 0) +
      14;

    return {
      idx: idx + 1,
      row,
      calc,
      titleLines,
      aggLines,
      mods,
      specLines,
      rowHeight: Math.max(66, rowHeight)
    };
  });

  const totalRowsHeight =
    rowLayouts.length > 0
      ? rowLayouts.reduce((s, r) => s + r.rowHeight + 8, 0)
      : 56;

  mCtx.font = "400 13.5px 'Inter', sans-serif";
  const noteLines = notes && notes.trim() ? wrapTextLines(mCtx, notes.trim(), contentWidth - 28) : [];
  const notesSectionHeight = noteLines.length > 0 ? 34 + Math.max(38, noteLines.length * 19 + 18) + 14 : 0;

  const headerAreaHeight = 242; // Banner + 2 sub-strips
  const chargesSectionHeight = 36 + totalRowsHeight + 10;
  const judgeBannerHeight = summary?.judgeRequired ? 48 : 0;
  const paliersSectionHeight = 36 + 82 + 16;
  const decisionSectionHeight = 36 + 114 + 14;
  const footerHeight = 185;

  const totalHeight = Math.max(
    1320,
    headerAreaHeight +
      chargesSectionHeight +
      judgeBannerHeight +
      paliersSectionHeight +
      decisionSectionHeight +
      notesSectionHeight +
      footerHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 1. Official Paper Surface (identique aux rapports imprimables #fafaf6)
  ctx.fillStyle = "#fafaf6";
  ctx.fillRect(0, 0, width, totalHeight);

  // Double border frame (Navy + Gold)
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

  // 2. Official LSPD Letterhead Banner (identique aux rapports)
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(31, 31, width - 62, 118);

  ctx.fillStyle = "#c59b27";
  ctx.fillRect(31, 149, width - 62, 4);

  drawLspdBadge(ctx, 96, 90, 42);

  ctx.fillStyle = "#dfb556";
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillText("STATE OF SAN ANDREAS  •  CITY OF LOS SANTOS  •  DEPARTMENT OF JUSTICE", 156, 62);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px 'Orbitron', sans-serif";
  ctx.fillText("LOS SANTOS POLICE DEPARTMENT", 156, 92);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "700 13.5px 'Inter', sans-serif";
  ctx.fillText("FICHE OFFICIELLE DE CALCUL DES PEINES & AMENDES (MDT)", 156, 116);

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
  ctx.fillText((serial || "LSPD-RA-2026").slice(0, 18), width - 224, 86);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10.5px 'Inter', sans-serif";
  ctx.fillText(`DATE : ${todayStr}`, width - 224, 106);
  ctx.fillText("STATUT : OFFICIEL LSPD", width - 224, 121);

  // Sub-strip 1 (Officier / Prévenu)
  ctx.fillStyle = "#eef2f7";
  ctx.fillRect(marginX, 166, contentWidth, 28);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(marginX, 166, contentWidth, 28);

  ctx.fillStyle = "#0b1e36";
  ctx.font = "700 12px 'Inter', sans-serif";
  ctx.fillText(`OFFICIER : ${agentName}`, marginX + 12, 184);
  ctx.textAlign = "right";
  ctx.fillText(`CONCERNÉ / PRÉVENU : ${prevenuName}`, width - marginX - 12, 184);
  ctx.textAlign = "left";

  // Sub-strip 2 (Date & Heure | Avocat | Rétention Max)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(marginX, 198, contentWidth, 26);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(marginX, 198, contentWidth, 26);

  ctx.fillStyle = "#334155";
  ctx.font = "600 11.5px 'Inter', sans-serif";
  ctx.fillText(`DATE & HEURE : ${todayStr} à ${heureStr}`, marginX + 12, 215);

  ctx.textAlign = "center";
  ctx.fillStyle = hasAvocat ? "#1d4ed8" : "#475569";
  ctx.font = "700 11.5px 'Inter', sans-serif";
  ctx.fillText(
    `ASSISTANCE AVOCAT : ${hasAvocat ? `OUI (×${config.avocatMultiplier})` : "NON"}`,
    width / 2,
    215
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#0b1e36";
  ctx.fillText(
    `RÉTENTION MAX : ${formatRetentionHours(summary?.maxRetentionHours || 0)}`,
    width - marginX - 12,
    215
  );
  ctx.textAlign = "left";

  // 3. SECTION 1: CHEFS D'INCULPATION & AMENDES MISES
  let curY = headerAreaHeight;
  drawSectionHeader(
    ctx,
    marginX,
    curY,
    contentWidth,
    `1. Chefs d'inculpation & Amendes retenues (${rowLayouts.length})`,
    { col1: "AMENDE MAX", col2: "PEINE MAX" }
  );
  curY += 34;

  if (rowLayouts.length === 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(marginX, curY, contentWidth, 46);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(marginX, curY, contentWidth, 46);
    ctx.fillStyle = "#64748b";
    ctx.font = "italic 14px 'Inter', sans-serif";
    ctx.fillText("Aucune infraction ou amende sélectionnée dans ce dossier.", marginX + 16, curY + 28);
    curY += 56;
  } else {
    rowLayouts.forEach(item => {
      const { calc, titleLines, aggLines, mods, specLines, rowHeight } = item;
      const catStyle = getPaperCatStyle(calc.categorie);

      // White printed card with category stripe on left
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(marginX, curY, contentWidth, rowHeight);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.9;
      ctx.strokeRect(marginX, curY, contentWidth, rowHeight);

      ctx.fillStyle = catStyle.stripe;
      ctx.fillRect(marginX, curY, 4.5, rowHeight);

      // Subtle vertical separator before right-hand amounts
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + contentWidth - 225, curY + 8);
      ctx.lineTo(marginX + contentWidth - 225, curY + rowHeight - 8);
      ctx.stroke();

      let ry = curY + 20;

      // Article + Category Pill + Barème Sheet
      ctx.font = "700 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#0b1e36";
      const artText = `[${calc.article}]`;
      ctx.fillText(artText, marginX + 14, ry);
      const artW = ctx.measureText(artText).width;

      ctx.font = "800 10px 'Inter', sans-serif";
      const catLabel = calc.categorie.toUpperCase();
      const catW = ctx.measureText(catLabel).width + 12;
      ctx.fillStyle = catStyle.bg;
      ctx.fillRect(marginX + 22 + artW, ry - 11, catW, 15);
      ctx.strokeStyle = catStyle.border;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(marginX + 22 + artW, ry - 11, catW, 15);
      ctx.fillStyle = catStyle.text;
      ctx.fillText(catLabel, marginX + 28 + artW, ry);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 11.5px 'Inter', sans-serif";
      ctx.fillText(
        `Barème : $${calc.baseFine.toLocaleString()} | ${calc.basePeine} min`,
        marginX + 30 + artW + catW,
        ry
      );

      // Right-hand Amounts (never overlapped)
      ctx.textAlign = "right";
      ctx.font = "800 16px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#047857";
      ctx.fillText(`$${calc.totalFine.toLocaleString()}`, marginX + contentWidth - 135, curY + 32);

      ctx.font = "800 15px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText(formatMinutesToHours(calc.totalPeineMinutes), marginX + contentWidth - 14, curY + 30);

      ctx.font = "600 11px 'Inter', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`(${calc.totalPeineMinutes} min)`, marginX + contentWidth - 14, curY + 47);
      ctx.textAlign = "left";

      ry += 20;

      // Chef d'accusation title
      ctx.font = "700 14.5px 'Inter', sans-serif";
      ctx.fillStyle = "#0f172a";
      titleLines.forEach(line => {
        ctx.fillText(line, marginX + 14, ry);
        ry += 19;
      });

      // Aggravantes
      if (aggLines.length > 0) {
        ry += 2;
        ctx.font = "600 12.5px 'Inter', sans-serif";
        ctx.fillStyle = "#1e40af";
        aggLines.forEach(line => {
          ctx.fillText(line, marginX + 14, ry);
          ry += 16.5;
        });
      }

      // Modifiers
      if (mods.length > 0) {
        ctx.font = "700 11.5px 'Inter', sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText(`▪ ${mods.join("  •  ")}`, marginX + 14, ry + 1);
        ry += 18;
      }

      // Special Notes
      if (specLines.length > 0) {
        ry += 2;
        ctx.font = "700 12.5px 'Inter', sans-serif";
        ctx.fillStyle = "#92400e";
        specLines.forEach(line => {
          ctx.fillText(line, marginX + 14, ry);
          ry += 16.5;
        });
      }

      curY += rowHeight + 8;
    });
  }

  curY += 6;

  // 4. Optional Judge / Prosecutor Mandatory Warning
  if (summary?.judgeRequired) {
    ctx.fillStyle = "#fffbeb";
    ctx.fillRect(marginX, curY, contentWidth, 38);
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(marginX, curY, contentWidth, 38);
    ctx.fillStyle = "#b45309";
    ctx.fillRect(marginX, curY, 5, 38);

    ctx.fillStyle = "#92400e";
    ctx.font = "800 13px 'Inter', sans-serif";
    ctx.fillText(
      `⚠  *JUGE / PROCUREUR OBLIGATOIRE — DURÉE MAXIMALE DE RÉTENTION JUDICIAIRE : ${formatRetentionHours(summary.maxRetentionHours)}`,
      marginX + 16,
      curY + 24
    );
    curY += 48;
  }

  // 5. SECTION 2: BARÈME DES 5 PALIERS LSPD / DOJ
  drawSectionHeader(ctx, marginX, curY, contentWidth, "2. Barème officiel des 5 paliers (MIN 1 → MAXIMAL)");
  curY += 34;

  const paliers = summary?.paliers || [];
  const gap = 8;
  const palierW = (contentWidth - gap * 4) / 5;
  paliers.forEach((p, i) => {
    const px = marginX + i * (palierW + gap);
    const isAct = activePalier && p.id === activePalier.id;

    ctx.fillStyle = isAct ? "#0b1e36" : "#ffffff";
    ctx.fillRect(px, curY, palierW, 76);
    ctx.strokeStyle = isAct ? "#c59b27" : "#cbd5e1";
    ctx.lineWidth = isAct ? 2.2 : 1;
    ctx.strokeRect(px, curY, palierW, 76);

    if (isAct) {
      ctx.fillStyle = "#c59b27";
      ctx.fillRect(px, curY, palierW, 4);
    }

    ctx.font = "800 11px 'Inter', sans-serif";
    ctx.fillStyle = isAct ? "#dfb556" : "#475569";
    ctx.fillText(`${isAct ? "★ " : ""}${p.label} (${Math.round((p.factorAmende ?? 1) * 100)}%)`, px + 10, curY + 22);

    ctx.font = "800 15.5px 'JetBrains Mono', monospace";
    ctx.fillStyle = isAct ? "#ffffff" : "#047857";
    ctx.fillText(`$${p.amende.toLocaleString()}`, px + 10, curY + 45);

    ctx.font = "700 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = isAct ? "#93c5fd" : "#1d4ed8";
    ctx.fillText(`${formatMinutesToHours(p.peineMinutes)} (${p.peineMinutes}m)`, px + 10, curY + 64);
  });

  curY += 90;

  // 6. SECTION 3: DÉCISION & SENTENCE RETENUE
  drawSectionHeader(ctx, marginX, curY, contentWidth, "3. Décision & Sentence retenue");
  curY += 34;

  ctx.fillStyle = "#eef3f9";
  ctx.fillRect(marginX, curY, contentWidth, 108);
  ctx.strokeStyle = "#0b1e36";
  ctx.lineWidth = 1.8;
  ctx.strokeRect(marginX, curY, contentWidth, 108);

  // Left navy vertical bar
  ctx.fillStyle = "#0b1e36";
  ctx.fillRect(marginX, curY, 6, 108);

  ctx.fillStyle = "#0b1e36";
  ctx.font = "800 13.5px 'Inter', sans-serif";
  ctx.fillText(
    `PALIER APPLIQUÉ : ${activePalier.label} (${activePalier.decision})`,
    marginX + 18,
    curY + 25
  );

  ctx.fillStyle = "#334155";
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.fillText(
    `Contraventions : ${summary.counts["Contravention"]}  |  Délits mineurs : ${summary.counts["Délit mineur"]}  |  Délits majeurs : ${summary.counts["Délit majeur"]}  |  Crimes : ${summary.counts["Crime"]}`,
    marginX + 18,
    curY + 48
  );
  ctx.fillText(
    `Cumul Maximal (100%) : ${formatCurrency(summary.sumAmendesMax)} • ${formatMinutesToHours(summary.sumPeinesMaxMinutes)} (${summary.sumPeinesMaxMinutes} min)`,
    marginX + 18,
    curY + 69
  );
  ctx.fillStyle = "#475569";
  ctx.font = "700 11.5px 'JetBrains Mono', monospace";
  ctx.fillText(
    `Conversion UP (O26) : ${(summary.totalUpMinutes || 0).toFixed(2)} UP  |  Rétention : ${formatRetentionHours(summary.maxRetentionHours)}`,
    marginX + 18,
    curY + 91
  );

  // Gold divider separating right-hand final sentence
  const dividerX = marginX + contentWidth - 348;
  ctx.strokeStyle = "#c59b27";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(dividerX, curY + 12);
  ctx.lineTo(dividerX, curY + 96);
  ctx.stroke();

  ctx.textAlign = "right";
  ctx.fillStyle = "#475569";
  ctx.font = "800 10.5px 'Inter', sans-serif";
  ctx.fillText("AMENDE FINALE", marginX + contentWidth - 178, curY + 27);
  ctx.fillText("PEINE DE PRISON", marginX + contentWidth - 16, curY + 27);

  const fineDisplay = `$${activePalier.amende.toLocaleString()}`;
  ctx.font = fineDisplay.length > 8 ? "900 18px 'Orbitron', monospace" : "900 21px 'Orbitron', monospace";
  ctx.fillStyle = "#047857";
  ctx.fillText(fineDisplay, marginX + contentWidth - 178, curY + 62);

  ctx.font = "900 21px 'Orbitron', monospace";
  ctx.fillStyle = "#0b1e36";
  ctx.fillText(formatMinutesToHours(activePalier.peineMinutes), marginX + contentWidth - 16, curY + 62);

  ctx.font = "700 11.5px 'Inter', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`(${activePalier.peineMinutes} minutes)`, marginX + contentWidth - 16, curY + 84);
  ctx.textAlign = "left";

  curY += 122;

  // 7. Optional Notes & Observations
  if (noteLines.length > 0) {
    drawSectionHeader(ctx, marginX, curY, contentWidth, "4. Notes & Observations");
    curY += 32;
    const nh = Math.max(38, noteLines.length * 19 + 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(marginX, curY, contentWidth, nh);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(marginX, curY, contentWidth, nh);

    ctx.fillStyle = "#1e293b";
    ctx.font = "400 13.5px 'Inter', sans-serif";
    noteLines.forEach((l, idx) => {
      ctx.fillText(l, marginX + 14, curY + 22 + idx * 19);
    });
    curY += nh + 14;
  }

  // 8. Official Bottom Signature & Ink Stamp Block (IDENTIQUE AUX RAPPORTS IMPRIMABLES)
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
  ctx.fillText((agentName || "Officier LSPD").split("|").pop().trim(), marginX + 4, sigY + 56);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.fillText(`${agentName} — Le ${todayStr}`, marginX, sigY + 78);

  // Center: Authentic LSPD Ink Stamp
  drawInkStamp(ctx, width / 2, sigY + 48, todayStr, serial);

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
