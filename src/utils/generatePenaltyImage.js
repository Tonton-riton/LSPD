// Générateur d'image PNG haute définition (Canvas 2D) aux couleurs officielles LSPD (Bleu Police / Navy / Or)
// Récapitule toutes les amendes et peines mises et permet de copier (Ctrl+V Discord) ou télécharger en .PNG

import { formatCurrency, formatMinutesToHours, formatRetentionHours } from "./formulaEngine";

function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke, strokeWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = [];
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
  return lines;
}

function getCatColor(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("crime")) return { bg: "rgba(239, 68, 68, 0.2)", text: "#f87171", border: "#ef4444" };
  if (c.includes("majeur")) return { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "#f59e0b" };
  if (c.includes("mineur")) return { bg: "rgba(56, 189, 248, 0.2)", text: "#38bdf8", border: "#38bdf8" };
  return { bg: "rgba(0, 230, 118, 0.18)", text: "#00e676", border: "#00e676" };
}

export function generatePenaltyCanvas({
  meta,
  serial,
  summary,
  activePalier,
  config,
  notes
}) {
  const scale = 2; // Retina HD
  const width = 980;

  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");

  const rowLayouts = summary.activeRows.map((row, idx) => {
    const { calc } = row;
    const aggs = calc.selectedAggravantesObjects.map(
      a => `${a.circonstance} (+$${a.amendeSupplementaire} / +${a.peineSupplementaireMinutes}m)`
    );
    const mods = [
      row.qte > 1 ? `Quantité: ×${row.qte}` : null,
      row.tentative ? `Tentative (×${config.tentativeMultiplier})` : null,
      row.complicite ? `Complicité (×${config.compliciteMultiplier})` : null,
      row.avocat ? `Avocat (×${config.avocatMultiplier})` : null
    ].filter(Boolean);

    mCtx.font = "bold 16px 'Rajdhani', sans-serif";
    const titleLines = wrapTextLines(mCtx, calc.chefAccusation, 470);

    mCtx.font = "600 13px 'Rajdhani', sans-serif";
    const aggText = aggs.length > 0 ? `Aggravantes : ${aggs.join(" • ")}` : "";
    const aggLines = aggText ? wrapTextLines(mCtx, aggText, 540) : [];

    const specText = calc.specialText ? `Spécial : ${calc.specialText}` : "";
    const specLines = specText ? wrapTextLines(mCtx, specText, 540) : [];

    const rowHeight =
      26 +
      titleLines.length * 20 +
      (aggLines.length > 0 ? 6 + aggLines.length * 17 : 0) +
      (mods.length > 0 ? 20 : 0) +
      (specLines.length > 0 ? 6 + specLines.length * 17 : 0) +
      16;

    return {
      idx: idx + 1,
      row,
      calc,
      titleLines,
      aggLines,
      mods,
      specLines,
      rowHeight: Math.max(70, rowHeight)
    };
  });

  const totalRowsHeight =
    rowLayouts.length > 0
      ? rowLayouts.reduce((s, r) => s + r.rowHeight + 10, 0)
      : 70;

  mCtx.font = "600 13px 'Rajdhani', sans-serif";
  const noteLines = notes && notes.trim() ? wrapTextLines(mCtx, notes.trim(), width - 110) : [];
  const notesHeight = noteLines.length > 0 ? 50 + noteLines.length * 18 : 0;

  const height = 210 + 44 + totalRowsHeight + 210 + (summary.judgeRequired ? 48 : 0) + notesHeight + 55;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 1. Background LSPD Deep Navy
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#050a14");
  bgGrad.addColorStop(0.5, "#0b1528");
  bgGrad.addColorStop(1, "#060b16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle top LSPD Blue glow
  const radGrad = ctx.createRadialGradient(width / 2, 0, 10, width / 2, 0, 500);
  radGrad.addColorStop(0, "rgba(59, 130, 246, 0.24)");
  radGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, width, 260);

  // Outer Frame Border
  drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 14, null, "#1e3050", 2);
  drawRoundedRect(ctx, 16, 16, width - 32, 5, 3, "#3b82f6", null);

  // 2. Header Block
  let curY = 44;
  ctx.fillStyle = "#3b82f6";
  ctx.font = "900 25px 'Orbitron', sans-serif";
  ctx.fillText("LSPD // DOJ — FICHE DE PEINES & AMENDES", 40, curY + 18);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 13px 'Rajdhani', sans-serif";
  ctx.fillText("LOS SANTOS POLICE DEPARTMENT • RÉCAPITULATIF OFFICIEL DES CHEFS D'INCULPATION", 40, curY + 38);

  // Dossier Badge on top right
  const refText = `DOSSIER : ${serial || "LSPD-2026"}`;
  ctx.font = "700 13px 'Orbitron', monospace";
  const refW = ctx.measureText(refText).width + 28;
  drawRoundedRect(ctx, width - 40 - refW, curY - 2, refW, 34, 8, "rgba(59, 130, 246, 0.16)", "#3b82f6", 1.5);
  ctx.fillStyle = "#60a5fa";
  ctx.fillText(refText, width - 40 - refW + 14, curY + 20);

  curY += 62;

  // 3. Metadata Strip (Prévenu | Agent | Date & Heure | Avocat)
  drawRoundedRect(ctx, 40, curY, width - 80, 68, 10, "#0d172a", "#1e3050", 1);

  const hasAvocat = summary.activeRows.some(r => r.avocat);
  const metaCols = [
    { label: "PRÉVENU / SUSPECT (RP)", val: meta.prevenu || "Non renseigné", color: "#ffffff" },
    { label: "AGENT EN CHARGE", val: meta.agent || "Non renseigné", color: "#e2e8f0" },
    { label: "DATE & HEURE", val: `${meta.date || "-"} à ${meta.heure || "-"}`, color: "#94a3b8" },
    { label: "ASSISTANCE AVOCAT", val: hasAvocat ? `OUI (×${config.avocatMultiplier})` : "NON", color: hasAvocat ? "#38bdf8" : "#94a3b8" }
  ];

  const colW = (width - 80) / 4;
  metaCols.forEach((mc, i) => {
    const cx = 56 + i * colW;
    ctx.fillStyle = "#64748b";
    ctx.font = "700 11px 'Rajdhani', sans-serif";
    ctx.fillText(mc.label, cx, curY + 24);

    ctx.fillStyle = mc.color;
    ctx.font = "700 16px 'Rajdhani', sans-serif";
    ctx.fillText(String(mc.val).slice(0, 26), cx, curY + 48);
  });

  curY += 86;

  // 4. Table Header of Offenses
  drawRoundedRect(ctx, 40, curY, width - 80, 34, 8, "#101d35", "#1e3050", 1);
  ctx.fillStyle = "#60a5fa";
  ctx.font = "700 13px 'Rajdhani', sans-serif";
  ctx.fillText(`CHEFS D'INCULPATION & AMENDES MISES (${summary.activeRows.length})`, 54, curY + 22);

  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "right";
  ctx.fillText("AMENDE MAX", width - 175, curY + 22);
  ctx.fillText("PEINE MAX", width - 54, curY + 22);
  ctx.textAlign = "left";

  curY += 44;

  // 5. Offense Rows
  if (rowLayouts.length === 0) {
    drawRoundedRect(ctx, 40, curY, width - 80, 56, 8, "#0b1322", "#1e3050", 1);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 15px 'Rajdhani', sans-serif";
    ctx.fillText("Aucune amende ou infraction sélectionnée.", 58, curY + 33);
    curY += 66;
  } else {
    rowLayouts.forEach(item => {
      const { calc, titleLines, aggLines, mods, specLines, rowHeight } = item;
      const catColor = getCatColor(calc.categorie);

      drawRoundedRect(ctx, 40, curY, width - 80, rowHeight, 9, "#0d1729", "#1e3050", 1);
      drawRoundedRect(ctx, 40, curY, 4, rowHeight, 2, catColor.border, null);

      let ry = curY + 22;

      // Article badge + Category badge
      ctx.font = "700 12px 'Orbitron', monospace";
      ctx.fillStyle = "#60a5fa";
      ctx.fillText(`[${calc.article}]`, 56, ry);
      const artW = ctx.measureText(`[${calc.article}]`).width;

      ctx.font = "700 11px 'Rajdhani', sans-serif";
      const catLabel = calc.categorie.toUpperCase();
      const catW = ctx.measureText(catLabel).width + 16;
      drawRoundedRect(ctx, 66 + artW, ry - 13, catW, 18, 5, catColor.bg, catColor.border, 1);
      ctx.fillStyle = catColor.text;
      ctx.fillText(catLabel, 66 + artW + 8, ry);

      ctx.fillStyle = "#64748b";
      ctx.font = "600 12px 'Rajdhani', sans-serif";
      ctx.fillText(
        `Barème : $${calc.baseFine.toLocaleString()} | ${calc.basePeine} min`,
        76 + artW + catW,
        ry
      );

      // Right side Totals
      ctx.textAlign = "right";
      ctx.font = "700 18px 'Orbitron', monospace";
      ctx.fillStyle = "#00e676";
      ctx.fillText(`$${calc.totalFine.toLocaleString()}`, width - 175, curY + 34);

      ctx.font = "700 15px 'Orbitron', monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`${formatMinutesToHours(calc.totalPeineMinutes)}`, width - 54, curY + 32);

      ctx.font = "600 12px 'Rajdhani', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`(${calc.totalPeineMinutes} min)`, width - 54, curY + 50);
      ctx.textAlign = "left";

      ry += 22;

      // Title lines
      ctx.font = "700 16px 'Rajdhani', sans-serif";
      ctx.fillStyle = "#ffffff";
      titleLines.forEach(line => {
        ctx.fillText(line, 56, ry);
        ry += 20;
      });

      // Aggravating circumstances
      if (aggLines.length > 0) {
        ry += 2;
        ctx.font = "600 13px 'Rajdhani', sans-serif";
        ctx.fillStyle = "#93c5fd";
        aggLines.forEach(line => {
          ctx.fillText(line, 56, ry);
          ry += 17;
        });
      }

      // Modifiers
      if (mods.length > 0) {
        ctx.font = "700 12px 'Rajdhani', sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(mods.join("  •  "), 56, ry + 2);
        ry += 19;
      }

      // Special notes
      if (specLines.length > 0) {
        ry += 2;
        ctx.font = "700 13px 'Rajdhani', sans-serif";
        ctx.fillStyle = "#fbbf24";
        specLines.forEach(line => {
          ctx.fillText(line, 56, ry);
          ry += 17;
        });
      }

      curY += rowHeight + 10;
    });
  }

  // 6. Judge Mandatory Warning if applicable
  if (summary.judgeRequired) {
    drawRoundedRect(ctx, 40, curY, width - 80, 38, 8, "rgba(245, 158, 11, 0.16)", "#f59e0b", 1.5);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 14px 'Rajdhani', sans-serif";
    ctx.fillText(
      `⚠  *JUGE / PROCUREUR OBLIGATOIRE — DURÉE MAXIMALE DE RÉTENTION JUDICIAIRE : ${formatRetentionHours(summary.maxRetentionHours)}`,
      56,
      curY + 24
    );
    curY += 48;
  }

  // 7. 5 Paliers Strip (MIN 1, MIN 2, NOMINALE, AGGRAVÉ, MAXIMAL)
  const palierW = (width - 80 - 4 * 10) / 5;
  summary.paliers.forEach((p, i) => {
    const px = 40 + i * (palierW + 10);
    const isAct = p.id === activePalier.id;
    drawRoundedRect(
      ctx,
      px,
      curY,
      palierW,
      78,
      9,
      isAct ? "rgba(59, 130, 246, 0.2)" : "#0d1627",
      isAct ? "#3b82f6" : "#1e3050",
      isAct ? 2 : 1
    );

    ctx.font = "700 12px 'Rajdhani', sans-serif";
    ctx.fillStyle = isAct ? "#60a5fa" : "#94a3b8";
    ctx.fillText(`${p.label} (${Math.round((p.factorAmende ?? 1) * 100)}%)`, px + 12, curY + 20);

    ctx.font = "700 16px 'Orbitron', monospace";
    ctx.fillStyle = "#00e676";
    ctx.fillText(`$${p.amende.toLocaleString()}`, px + 12, curY + 44);

    ctx.font = "700 13px 'Orbitron', monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`${formatMinutesToHours(p.peineMinutes)} (${p.peineMinutes}m)`, px + 12, curY + 64);
  });

  curY += 92;

  // 8. Final Retained Sentence Box
  drawRoundedRect(ctx, 40, curY, width - 80, 102, 12, "#101d35", "#3b82f6", 1.8);

  ctx.fillStyle = "#60a5fa";
  ctx.font = "700 13px 'Rajdhani', sans-serif";
  ctx.fillText(`SENTENCE RETENUE — PALIER ${activePalier.label} (${activePalier.decision})`, 58, curY + 26);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 13px 'Rajdhani', sans-serif";
  ctx.fillText(
    `Contraventions: ${summary.counts["Contravention"]}  |  Délits mineurs: ${summary.counts["Délit mineur"]}  |  Délits majeurs: ${summary.counts["Délit majeur"]}  |  Crimes: ${summary.counts["Crime"]}`,
    58,
    curY + 50
  );
  ctx.fillText(
    `Cumul Maximal (100%) : ${formatCurrency(summary.sumAmendesMax)} • ${formatMinutesToHours(summary.sumPeinesMaxMinutes)} (${summary.sumPeinesMaxMinutes} min)  |  Rétention Max : ${formatRetentionHours(summary.maxRetentionHours)}`,
    58,
    curY + 72
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 11px 'Rajdhani', sans-serif";
  ctx.fillText("AMENDE FINALE RETENUE", width - 210, curY + 28);
  ctx.fillText("PEINE DE PRISON RETENUE", width - 58, curY + 28);

  ctx.font = "900 26px 'Orbitron', monospace";
  ctx.fillStyle = "#00e676";
  ctx.fillText(`$${activePalier.amende.toLocaleString()}`, width - 210, curY + 62);

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(formatMinutesToHours(activePalier.peineMinutes), width - 58, curY + 62);

  ctx.font = "700 12px 'Rajdhani', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`(${activePalier.peineMinutes} minutes)`, width - 58, curY + 82);
  ctx.textAlign = "left";

  curY += 116;

  // 9. Optional Notes
  if (noteLines.length > 0) {
    const nh = 34 + noteLines.length * 18;
    drawRoundedRect(ctx, 40, curY, width - 80, nh, 8, "#0d1627", "#1e3050", 1);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "700 12px 'Rajdhani', sans-serif";
    ctx.fillText("NOTES & OBSERVATIONS :", 54, curY + 20);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 13px 'Rajdhani', sans-serif";
    noteLines.forEach((l, idx) => {
      ctx.fillText(l, 54, curY + 38 + idx * 18);
    });
    curY += nh + 12;
  }

  ctx.fillStyle = "#5b6e8c";
  ctx.font = "600 12px 'Rajdhani', sans-serif";
  ctx.fillText("Généré via LSPD // DOJ MDT — Calculateur Officiel des Peines San Andreas", 40, height - 26);

  return canvas;
}
