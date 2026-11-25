// Moteur de calcul reproduisant exactement les formules du Google Sheet "CALCULATEUR"
// tout en permettant un paramétrage ("réglable") en temps réel.

/**
 * Formate un montant en dollars selon le style du Sheet (ex: "1 100 $")
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 $";
  const rounded = Math.round(Number(amount));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " $";
}

/**
 * Formate une durée en minutes selon le format horaire du Sheet (/1440 -> "0h15", "1h30")
 */
export function formatMinutesToHours(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return "0h00";
  const mins = Math.max(0, Math.round(Number(totalMinutes)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Formate des heures décimales en HH:MM (pour la durée de rétention E26:E29)
 */
export function formatRetentionHours(hours) {
  if (!hours || hours <= 0) return "-";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

/**
 * Calcule une ligne du calculateur exactement comme la ligne 12..23 du Sheet :
 *
 * Formule Amende (J12) :
 * =IF(D12="","",ROUND((XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$E$2:$E)
 *   + IF(E12="",0,SUMPRODUCT((AGGRAVANTES!$A$2:$A=XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$A$2:$A))
 *   * N(ISNUMBER(SEARCH(AGGRAVANTES!$C$2:$C,E12))) * AGGRAVANTES!$D$2:$D)))
 *   * IF(F12="",1,F12) * IF(G12="Oui",0.5,1) * IF(H12="Oui",0.75,1) * IF(I12="Oui",0.9,1), 0))
 *
 * Formule Peine (K12) :
 * =IF(D12="","",ROUND((XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$F$2:$F)
 *   + IF(E12="",0,SUMPRODUCT((AGGRAVANTES!$A$2:$A=XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$A$2:$A))
 *   * (AGGRAVANTES!$C$2:$C<>"") * ISNUMBER(SEARCH(AGGRAVANTES!$C$2:$C,E12)) * AGGRAVANTES!$E$2:$E)))
 *   * IF(F12="",1,F12) * IF(G12="Oui",0.5,1) * IF(H12="Oui",0.75,1) * IF(I12="Oui",0.9,1), 0)/1440)
 *
 * Formule Spécial (L12) :
 * =IF(D12="","",TEXTJOIN(" • ",TRUE,XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$G$2:$G,""),
 *   IF(E12="","",IFERROR(TEXTJOIN(" • ",TRUE,FILTER(AGGRAVANTES!$F$2:$F,...)),""))))
 */
export function calculateOffenseRow(row, infractionsMap, aggravantesByInfractionId, config) {
  if (!row || !row.infractionId) {
    return {
      isEmpty: true,
      article: "",
      categorie: "",
      chefAccusation: "",
      baseFine: 0,
      basePeine: 0,
      aggravantesFine: 0,
      aggravantesPeine: 0,
      multiplier: 1,
      totalFine: 0,
      totalPeineMinutes: 0,
      specialText: "",
      selectedAggravantesObjects: []
    };
  }

  const inf = infractionsMap.get(row.infractionId);
  if (!inf) {
    return {
      isEmpty: true,
      article: "",
      categorie: "",
      chefAccusation: "",
      baseFine: 0,
      basePeine: 0,
      aggravantesFine: 0,
      aggravantesPeine: 0,
      multiplier: 1,
      totalFine: 0,
      totalPeineMinutes: 0,
      specialText: "",
      selectedAggravantesObjects: []
    };
  }

  const availableAggs = aggravantesByInfractionId.get(inf.id) || [];
  const selectedIds = Array.isArray(row.aggravanteIds) ? row.aggravanteIds : [];
  const selectedAggravantesObjects = availableAggs.filter(a =>
    selectedIds.includes(a.uid) || selectedIds.includes(a.circonstance)
  );

  const aggravantesFine = selectedAggravantesObjects.reduce(
    (sum, a) => sum + (Number(a.amendeSupplementaire) || 0),
    0
  );
  const aggravantesPeine = selectedAggravantesObjects.reduce(
    (sum, a) => sum + (Number(a.peineSupplementaireMinutes) || 0),
    0
  );

  const qte = row.qte === "" || row.qte === null || row.qte === undefined ? 1 : Math.max(1, Number(row.qte) || 1);
  const tentativeFactor = row.tentative ? Number(config.tentativeMultiplier ?? 0.5) : 1;
  const compliciteFactor = row.complicite ? Number(config.compliciteMultiplier ?? 0.75) : 1;
  const avocatFactor = row.avocat ? Number(config.avocatMultiplier ?? 0.9) : 1;

  const combinedMultiplier = qte * tentativeFactor * compliciteFactor * avocatFactor;

  const rawFine = (Number(inf.amendeBase) + aggravantesFine) * combinedMultiplier;
  const rawPeine = (Number(inf.peineBaseMinutes) + aggravantesPeine) * combinedMultiplier;

  const totalFine = config.roundToInteger !== false ? Math.round(rawFine) : rawFine;
  const totalPeineMinutes = config.roundToInteger !== false ? Math.round(rawPeine) : rawPeine;

  // TEXTJOIN(" • ", TRUE, SPECIAL_BASE, FILTER(AGGRAVANTES!F2:F))
  const specialParts = [];
  if (inf.specialBase && inf.specialBase.trim() !== "" && inf.specialBase.trim() !== "-") {
    specialParts.push(inf.specialBase.trim());
  }
  selectedAggravantesObjects.forEach(a => {
    if (a.special && a.special.trim() !== "" && a.special.trim() !== "-") {
      specialParts.push(a.special.trim());
    }
  });

  // Also check if ART502 has all 3 aggravating circumstances selected -> "Cumul des trois circonstances : Peine de mort possible"
  if (inf.id === "ART502" && selectedAggravantesObjects.length >= 3) {
    const cumulNote = "Peine de mort possible (Cumul des 3 circonstances)";
    if (!specialParts.includes(cumulNote) && !specialParts.includes("Peine de mort possible")) {
      specialParts.push(cumulNote);
    }
  }

  return {
    isEmpty: false,
    infraction: inf,
    article: inf.article,
    categorie: inf.categorie,
    chefAccusation: inf.chefAccusation,
    baseFine: Number(inf.amendeBase) || 0,
    basePeine: Number(inf.peineBaseMinutes) || 0,
    aggravantesFine,
    aggravantesPeine,
    qte,
    tentativeFactor,
    compliciteFactor,
    avocatFactor,
    multiplier: combinedMultiplier,
    totalFine,
    totalPeineMinutes,
    specialText: specialParts.join(" • "),
    selectedAggravantesObjects
  };
}

/**
 * Calcule le récapitulatif global du dossier (Lignes 25 à 31 du CALCULATEUR) :
 * - Compteurs par catégorie (CONTRAVENTION, DÉLIT MINEUR, DÉLIT MAJEUR, CRIME)
 * - Durée maximale de rétention judiciaire (3h, 12h, 24h)
 * - Mention *JUGE/PROC OBLIGATOIRE si Délit majeur ou Crime
 * - Grille des 5 paliers (MIN 1, MIN 2, NOMINALE, AGGRAVÉ, MAXIMAL)
 * - Conversion UP (=SUM(180 * N26 / 5000) / 60)
 * - Discours des Droits Miranda (Cellule N3)
 */
export function calculateDossierSummary(rows, infractions, aggravantes, config, meta = {}) {
  const infractionsMap = new Map(infractions.map(i => [i.id, i]));
  const aggravantesByInfractionId = new Map();
  aggravantes.forEach(a => {
    if (!aggravantesByInfractionId.has(a.idInfraction)) {
      aggravantesByInfractionId.set(a.idInfraction, []);
    }
    aggravantesByInfractionId.get(a.idInfraction).push(a);
  });

  const calculatedRows = rows.map(r => ({
    ...r,
    calc: calculateOffenseRow(r, infractionsMap, aggravantesByInfractionId, config)
  }));

  const activeRows = calculatedRows.filter(r => !r.calc.isEmpty);

  // Comptage par catégorie (COUNTIF($C$12:$C$23, B25..B28))
  const counts = {
    "Contravention": 0,
    "Délit mineur": 0,
    "Délit majeur": 0,
    "Crime": 0
  };

  activeRows.forEach(r => {
    const cat = r.calc.categorie;
    if (counts[cat] !== undefined) {
      counts[cat] += 1;
    } else {
      // Fallback case-insensitive match
      const key = Object.keys(counts).find(k => k.toLowerCase() === String(cat).toLowerCase());
      if (key) counts[key] += 1;
    }
  });

  const totalInfractionsCount = Object.values(counts).reduce((a, b) => a + b, 0);

  // Durée de rétention (E26:E29)
  const retentionByCat = {
    "Contravention": counts["Contravention"] > 0 ? (Number(config.retentionHours?.["Contravention"]) || 0) : 0,
    "Délit mineur": counts["Délit mineur"] > 0 ? (Number(config.retentionHours?.["Délit mineur"]) ?? 3) : 0,
    "Délit majeur": counts["Délit majeur"] > 0 ? (Number(config.retentionHours?.["Délit majeur"]) ?? 12) : 0,
    "Crime": counts["Crime"] > 0 ? (Number(config.retentionHours?.["Crime"]) ?? 24) : 0
  };
  const maxRetentionHours = Math.max(0, ...Object.values(retentionByCat));

  // Juge / Procureur obligatoire si Délit majeur > 0 ou Crime > 0
  const judgeRequired = counts["Délit majeur"] > 0 || counts["Crime"] > 0;
  const trialRequired = counts["Crime"] > 0;

  // Cumul MAXIMAL (I30 = SUM(J12:J23), J30 = SUM(K12:K23))
  let sumAmendesMax = activeRows.reduce((acc, r) => acc + r.calc.totalFine, 0);
  let sumPeinesMaxMinutes = activeRows.reduce((acc, r) => acc + r.calc.totalPeineMinutes, 0);

  // Application éventuelle de plafonds personnalisés si configurés (> 0)
  const uncappedAmendesMax = sumAmendesMax;
  const uncappedPeinesMax = sumPeinesMaxMinutes;
  if (config.maxFineCap && Number(config.maxFineCap) > 0) {
    sumAmendesMax = Math.min(sumAmendesMax, Number(config.maxFineCap));
  }
  if (config.maxPrisonMinutesCap && Number(config.maxPrisonMinutesCap) > 0) {
    sumPeinesMaxMinutes = Math.min(sumPeinesMaxMinutes, Number(config.maxPrisonMinutesCap));
  }

  // Vérifier si une infraction impose "Peines maximales" dans SPECIAL_BASE
  const hasMandatoryMaxPenalty = activeRows.some(r =>
    r.calc.specialText.toLowerCase().includes("peines maximales") ||
    r.calc.specialText.toLowerCase().includes("amende maximale")
  );

  // Calcul des 5 paliers (MIN 1, MIN 2, NOMINALE, AGGRAVÉ, MAXIMAL)
  const paliers = (config.paliers || []).map(p => {
    const rawAmende = sumAmendesMax * Number(p.factorAmende ?? 1);
    const rawPeine = sumPeinesMaxMinutes * Number(p.factorPeine ?? 1);
    return {
      ...p,
      amende: config.roundToInteger !== false ? Math.round(rawAmende) : rawAmende,
      peineMinutes: config.roundToInteger !== false ? Math.round(rawPeine) : rawPeine
    };
  });

  // Mentions spéciales globales
  const allSpecialNotes = [];
  activeRows.forEach(r => {
    if (r.calc.specialText) {
      allSpecialNotes.push({
        article: r.calc.article,
        chef: r.calc.chefAccusation,
        note: r.calc.specialText
      });
    }
  });

  // Conversion UP : =SUM(180 * N26 / 5000) / 60
  const upSeconds = Number(config.upConversion?.secondsPerSlice) || 180;
  const upSlice = Number(config.upConversion?.amountPerSlice) || 5000;
  const upInputAmount = meta.upCustomAmount !== undefined && meta.upCustomAmount !== ""
    ? Number(meta.upCustomAmount) || 0
    : sumAmendesMax;
  const totalUpMinutes = upSlice > 0 ? ((upSeconds * upInputAmount) / upSlice) / 60 : 0;

  // Génération du texte des Droits Miranda (Cellule N3)
  const prevenuName = (meta.prevenu || "").trim() || "________________";
  const dateStr = (meta.date || "").trim() || new Date().toLocaleDateString("fr-FR");
  const heureStr = (meta.heure || "").trim() || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const chefsList = activeRows.length > 0
    ? activeRows.map(r => {
        const aggNames = r.calc.selectedAggravantesObjects.map(a => a.circonstance);
        const suffix = aggNames.length > 0 ? ` (${aggNames.join(", ")})` : "";
        const flags = [
          r.qte > 1 ? `×${r.qte}` : null,
          r.tentative ? "Tentative" : null,
          r.complicite ? "Complicité" : null
        ].filter(Boolean);
        const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
        return `- ${r.calc.chefAccusation}${suffix}${flagStr}`;
      }).join("\n")
    : "- (Aucun chef d'inculpation sélectionné)";

  const template = config.mirandaTemplate || "";
  const mirandaText = template
    .replace(/\{prevenu\}/g, prevenuName)
    .replace(/\{date\}/g, dateStr)
    .replace(/\{heure\}/g, heureStr)
    .replace(/\{chefs\}/g, chefsList);

  return {
    calculatedRows,
    activeRows,
    counts,
    totalInfractionsCount,
    retentionByCat,
    maxRetentionHours,
    judgeRequired,
    trialRequired,
    hasMandatoryMaxPenalty,
    sumAmendesMax,
    sumPeinesMaxMinutes,
    uncappedAmendesMax,
    uncappedPeinesMax,
    paliers,
    allSpecialNotes,
    upInputAmount,
    totalUpMinutes,
    mirandaText
  };
}
