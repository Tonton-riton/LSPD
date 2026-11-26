import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  formatCurrency,
  formatMinutesToHours,
  formatRetentionHours,
  calculateOffenseRow
} from "../utils/formulaEngine";
import { generatePenaltyCanvas } from "../utils/generatePenaltyImage";
import { syncSigningAgentInText } from "../utils/generatePrintableReport";
import { LSPD_TEMPLATES } from "../data/lspdTemplates";
import PrintReportModal from "./PrintReportModal";

export function getCategoryBadgeClass(cat) {
  const c = String(cat || "").toLowerCase();
  if (c.includes("crime")) return "cat-badge cat-crime";
  if (c.includes("majeur")) return "cat-badge cat-delit-majeur";
  if (c.includes("mineur")) return "cat-badge cat-delit-mineur";
  return "cat-badge cat-contravention";
}

function generateDossierRef(articleStr = "LSPD") {
  const prefix = (articleStr || "LSPD").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 5) || "LSPD";
  const num = String(Math.floor(10000 + Math.random() * 89999));
  return `LSPD-${prefix}-${num}`;
}

export default function CalculatorView({
  rows,
  setRows,
  infractions,
  aggravantes,
  config,
  setConfig,
  meta,
  setMeta,
  summary,
  onResetToSheetSample,
  onOpenSettings,
  onValidateAndArchive,
  activeReportTemplateId,
  setActiveReportTemplateId
}) {
  // Builder ("+ Ajouter un chef d'accusation au panier") state
  const [catFilter, setCatFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [articleId, setArticleId] = useState("");
  const [selectedAggUids, setSelectedAggUids] = useState([]);
  const [qty, setQty] = useState(1);
  const [serial, setSerial] = useState("LSPD-RA-00142");
  const [builderTentative, setBuilderTentative] = useState(false);
  const [builderComplicite, setBuilderComplicite] = useState(false);
  const [builderAvocat, setBuilderAvocat] = useState(false);

  // Official LSPD Arrest Report fields (basés sur l'onglet ARRESTATION & Art. 117-5 / 123 du Code de Procédure Criminelle)
  const [lieuInterpellation, setLieuInterpellation] = useState("Los Santos");
  const [unitesPresentes, setUnitesPresentes] = useState("Lincoln-16");
  const [statutIdentite, setStatutIdentite] = useState("Carte d'identité présentée et vérifiée au poste");
  const [attitudeSuspect, setAttitudeSuspect] = useState("Coopératif lors de la procédure");
  const [statutMiranda, setStatutMiranda] = useState("Lus et compris dès la 1ère lecture");
  const [nomAvocat, setNomAvocat] = useState("");
  const [objetsSaisis, setObjetsSaisis] = useState("Moyens de communication (téléphone/radio) et objets dangereux retirés lors de la fouille");
  const [circonstancesFaits, setCirconstancesFaits] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPalierId, setSelectedPalierId] = useState("NOMINALE");

  // UI & Editable Report states
  const [showCoefPanel, setShowCoefPanel] = useState(false);
  const [showReportFields, setShowReportFields] = useState(true);
  const [outputTab, setOutputTab] = useState("rapport"); // "rapport" | "miranda"
  const [editedReportText, setEditedReportText] = useState("");
  const [isReportManuallyEdited, setIsReportManuallyEdited] = useState(false);
  const [editedMirandaText, setEditedMirandaText] = useState("");
  const [isMirandaManuallyEdited, setIsMirandaManuallyEdited] = useState(false);

  const [copiedKey, setCopiedKey] = useState(null);
  const [inspectedInfraction, setInspectedInfraction] = useState(null);
  const [showPenaltyPrintModal, setShowPenaltyPrintModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const infractionsMap = useMemo(() => new Map(infractions.map(i => [i.id, i])), [infractions]);
  const aggravantesByInf = useMemo(() => {
    const map = new Map();
    aggravantes.forEach(a => {
      if (!map.has(a.idInfraction)) map.set(a.idInfraction, []);
      map.get(a.idInfraction).push(a);
    });
    return map;
  }, [aggravantes]);

  const filteredInfractions = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return infractions.filter(inf => {
      if (catFilter && inf.categorie.toLowerCase() !== catFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        inf.chefAccusation.toLowerCase().includes(q) ||
        inf.article.toLowerCase().includes(q)
      );
    });
  }, [infractions, catFilter, searchFilter]);

  const availableBuilderAggs = useMemo(() => {
    return articleId ? (aggravantesByInf.get(articleId) || []) : [];
  }, [articleId, aggravantesByInf]);

  const builderPreview = useMemo(() => {
    return calculateOffenseRow(
      {
        infractionId: articleId,
        aggravanteIds: selectedAggUids,
        qte: qty,
        tentative: builderTentative,
        complicite: builderComplicite,
        avocat: builderAvocat
      },
      infractionsMap,
      aggravantesByInf,
      config
    );
  }, [
    articleId,
    selectedAggUids,
    qty,
    builderTentative,
    builderComplicite,
    builderAvocat,
    infractionsMap,
    aggravantesByInf,
    config
  ]);

  const handleCategoryChange = (e) => {
    setCatFilter(e.target.value);
    setArticleId("");
    setSelectedAggUids([]);
  };

  const handleArticleChange = (e) => {
    const id = e.target.value;
    setArticleId(id);
    setSelectedAggUids([]);
    const inf = infractionsMap.get(id);
    if (inf) {
      setSerial(generateDossierRef(inf.article));
    }
  };

  const handleToggleBuilderAgg = (uid) => {
    setSelectedAggUids(prev =>
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  const handleGenerateSerial = () => {
    const inf = infractionsMap.get(articleId);
    setSerial(generateDossierRef(inf ? inf.article : "LSPD"));
  };

  const handleAddToCart = () => {
    if (!articleId) return;
    const newRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      infractionId: articleId,
      aggravanteIds: [...selectedAggUids],
      qte: Math.max(1, parseInt(qty, 10) || 1),
      tentative: builderTentative,
      complicite: builderComplicite,
      avocat: builderAvocat,
      serial: serial.trim() || generateDossierRef("LSPD")
    };
    setRows(prev => [...prev.filter(r => r.infractionId), newRow]);
    setArticleId("");
    setSelectedAggUids([]);
    setQty(1);
    setBuilderTentative(false);
    setBuilderComplicite(false);
  };

  const handleUpdateRow = (rowId, updater) => {
    setRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, ...(typeof updater === "function" ? updater(r) : updater) } : r))
    );
  };

  const handleRemoveRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleToggleRowAgg = (rowId, aggUid) => {
    handleUpdateRow(rowId, r => {
      const curr = Array.isArray(r.aggravanteIds) ? r.aggravanteIds : [];
      return {
        aggravanteIds: curr.includes(aggUid) ? curr.filter(x => x !== aggUid) : [...curr, aggUid]
      };
    });
  };

  const allHaveAvocat = useMemo(() => {
    const active = rows.filter(r => r.infractionId);
    return active.length > 0 && active.every(r => r.avocat);
  }, [rows]);

  const handleGlobalAvocatChange = (e) => {
    const hasAvocat = e.target.value === "OUI";
    setBuilderAvocat(hasAvocat);
    setRows(prev => prev.map(r => ({ ...r, avocat: hasAvocat })));
  };

  const activePalier = useMemo(() => {
    return (
      summary.paliers.find(p => p.id === selectedPalierId) ||
      summary.paliers[2] || {
        id: "NOMINALE",
        label: "NOMINALE",
        decision: "BASE",
        amende: Math.round(summary.sumAmendesMax * 0.6),
        peineMinutes: Math.round(summary.sumPeinesMaxMinutes * 0.6),
        factorAmende: 0.6
      }
    );
  }, [summary.paliers, selectedPalierId]);

  // Génération automatique du VRAI RAPPORT D'ARRESTATION LSPD / DOJ (Standard ou Template Braquage / Poursuite / Fusillade / etc.)
  const autoGeneratedReportText = useMemo(() => {
    const prevenu = (meta.prevenu || "").trim() || "Non renseigné";
    const agent = (meta.agent || "").trim() || "Non renseigné";
    const date = meta.date || new Date().toLocaleDateString("fr-FR");
    const heure = meta.heure || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const chargesAndSentenceBlock = [
      `[CHEFS D'INCULPATION RETENUS (${summary.activeRows.length})]`,
      ...(summary.activeRows.length === 0
        ? [`  Aucun chef d'inculpation enregistré.`]
        : summary.activeRows.map((r, idx) => {
            const aggs = r.calc.selectedAggravantesObjects.map(a => a.circonstance);
            const mods = [
              r.qte > 1 ? `Quantité: ×${r.qte}` : null,
              r.tentative ? `Tentative (×${config.tentativeMultiplier})` : null,
              r.complicite ? `Complicité (×${config.compliciteMultiplier})` : null,
              r.avocat ? `Avocat (×${config.avocatMultiplier})` : null
            ].filter(Boolean);
            return (
              `  ${idx + 1}. [${r.calc.article} | ${r.calc.categorie.toUpperCase()}] ${r.calc.chefAccusation}` +
              (aggs.length > 0 ? `\n     ↳ Circonstances aggravantes : ${aggs.join(" ; ")}` : "") +
              (mods.length > 0 ? `\n     ↳ Modificateurs : ${mods.join(" | ")}` : "") +
              `\n     ↳ Barème Max : ${formatCurrency(r.calc.totalFine)} | ${formatMinutesToHours(r.calc.totalPeineMinutes)} (${r.calc.totalPeineMinutes} min)` +
              (r.calc.specialText ? `\n     ↳ Sanction spéciale : ${r.calc.specialText}` : "")
            );
          })),
      ``,
      `[BILAN PÉNAL, RÉTENTION & SENTENCE APPLIQUÉE]`,
      `• Décompte par gravité       : ${summary.counts["Contravention"]} Contravention(s) | ${summary.counts["Délit mineur"]} Délit(s) mineur(s) | ${summary.counts["Délit majeur"]} Délit(s) majeur(s) | ${summary.counts["Crime"]} Crime(s)`,
      `• Rétention judiciaire max   : ${formatRetentionHours(summary.maxRetentionHours)}`,
      `• Procédure Juge / Procureur : ${
        summary.counts["Crime"] > 0
          ? "OUI — CRIME (*JUGE/PROC OBLIGATOIRE • Bracelet électronique en attente de procès)"
          : summary.counts["Délit majeur"] > 0
          ? "OUI — DÉLIT MAJEUR (*JUGE/PROC OBLIGATOIRE • Comparution immédiate)"
          : "NON (Traitement direct par les forces de l'ordre)"
      }`,
      `• Cumul Maximal (100%)       : ${formatCurrency(summary.sumAmendesMax)} | ${formatMinutesToHours(summary.sumPeinesMaxMinutes)} (${summary.sumPeinesMaxMinutes} minutes)`,
      `• PALIER RETENU              : ${activePalier.label} (${Math.round((activePalier.factorAmende ?? 1) * 100)}% — Autorité : ${activePalier.decision})`,
      `• AMENDE FINALE APPLIQUÉE    : ${formatCurrency(activePalier.amende)}`,
      `• PEINE DE PRISON APPLIQUÉE  : ${formatMinutesToHours(activePalier.peineMinutes)} (${activePalier.peineMinutes} minutes)`,
      ``
    ].join("\n");

    // Si un template spécifique (Braquage Supérette, Fleeca, Pacific, Poursuite, Fusillade, Deal, etc.) est choisi
    if (activeReportTemplateId && activeReportTemplateId !== "standard") {
      const selectedTpl = LSPD_TEMPLATES.find(t => t.id === activeReportTemplateId);
      if (selectedTpl) {
        return selectedTpl.generateContent({
          caseNumber: serial || "LSPD-RA-2026",
          title: selectedTpl.title,
          agent,
          targetName: prevenu,
          targetGroup: "",
          location: lieuInterpellation || "Los Santos",
          date,
          heure,
          extraChargesBlock: chargesAndSentenceBlock
        });
      }
    }

    const infractionsShortList =
      summary.activeRows.length > 0
        ? summary.activeRows
            .map(r => {
              const aggs = r.calc.selectedAggravantesObjects.map(a => a.circonstance);
              return `${r.calc.chefAccusation}${aggs.length ? ` (${aggs.join(", ")})` : ""}`;
            })
            .join(", ")
        : "aucune infraction";

    const defaultNarrative =
      circonstancesFaits.trim() ||
      `Le ${date} aux alentours de ${heure}, sur le secteur de ${lieuInterpellation || "Los Santos"}, les effectifs du Los Santos Police Department (${unitesPresentes || agent}) ont procédé au contrôle et à l'interpellation de l'individu identifié comme ${prevenu} suite à une suspicion raisonnable et la constatation des faits suivants : ${infractionsShortList}.\n` +
        `1. Menottage & Sécurisation : L'individu a été menotté sur les lieux pour garantir sa sécurité et celle des agents, puis informé de sa mise en état d'arrestation.\n` +
        `2. Fouille initiale & Transport : Une fouille de sécurité initiale a été effectuée sur place avant l'embarquement dans le véhicule de patrouille et le retour au poste de police.\n` +
        `3. Identification & Droits Miranda : Au poste de police, l'individu a été démenotté sous surveillance (${statutIdentite}). Ses droits constitutionnels Miranda ainsi que ses chefs d'inculpation lui ont été notifiés (${statutMiranda}).\n` +
        `4. Fouille complète & Mise en cellule : Après fouille complète et inventaire des effets saisis, l'individu a été placé en cellule.`;

    const avocatDetail = allHaveAvocat
      ? `OUI — Assisté d'un avocat${nomAvocat.trim() ? ` (${nomAvocat.trim()})` : " (Commis d'office / Privé)"} [Remise légale ×${config.avocatMultiplier}]`
      : `NON — L'individu n'a pas souhaité ou n'est pas assisté d'un avocat${
          summary.judgeRequired
            ? " (Informé que l'absence d'avocat lors d'un délit majeur/crime peut entraîner des sanctions plus sévères)"
            : ""
        }`;

    const lines = [
      `╔══════════════════════════════════════════════════════════════════╗`,
      `     LOS SANTOS POLICE DEPARTMENT — RAPPORT D'ARRESTATION (MDT)`,
      `     RÉFÉRENCE DOSSIER : ${serial || "LSPD-RA-2026"}`,
      `╚══════════════════════════════════════════════════════════════════╝`,
      ``,
      `[1. INFORMATIONS GÉNÉRALES D'INTERVENTION]`,
      `• Date & Heure d'arrestation : ${date} à ${heure}`,
      `• Lieu de l'interpellation   : ${lieuInterpellation || "Los Santos"}`,
      `• Agent rédacteur (En charge): ${agent}`,
      `• Unités / Agents présents   : ${unitesPresentes || agent}`,
      ``,
      `[2. IDENTITÉ & COMPORTEMENT DU MIS EN CAUSE]`,
      `• Nom & Prénom du prévenu    : ${prevenu}`,
      `• Vérification d'identité    : ${statutIdentite}`,
      `• Réaction & Coopération     : ${attitudeSuspect}`,
      ``,
      `[3. DROITS CONSTITUTIONNELS MIRANDA & DÉFENSE (ART. 123)]`,
      `• Notification des droits    : Lus le ${date} à ${heure} — ${statutMiranda}`,
      `• Assistance d'un avocat     : ${avocatDetail}`,
      ``,
      `[4. CIRCONSTANCES DE L'ARRESTATION & CAUSE PROBABLE (ART. 117-5)]`,
      defaultNarrative,
      ``,
      `[5. FOUILLES (INITIALE & COMPLÈTE) ET OBJETS SAISIS / SCELLÉS]`,
      `• Inventaire des saisies     : ${objetsSaisis || "Aucun objet illégal saisi"}`,
      ...(summary.allSpecialNotes.length > 0
        ? [
            `• Mesures complémentaires    : ${summary.allSpecialNotes
              .map(s => `[${s.article}] ${s.note}`)
              .join(" • ")}`
          ]
        : [`• Mesures complémentaires    : Aucune mesure spéciale additionnelle`]),
      ``,
      chargesAndSentenceBlock,
      ...(notes.trim() ? [`[OBSERVATIONS SUPPLÉMENTAIRES]`, `${notes.trim()}`, ``] : []),
      `Rapport rédigé et certifié exact par : ${agent} — Los Santos Police Department.`
    ];

    return lines.join("\n");
  }, [
    activeReportTemplateId,
    meta,
    serial,
    lieuInterpellation,
    unitesPresentes,
    statutIdentite,
    attitudeSuspect,
    statutMiranda,
    nomAvocat,
    objetsSaisis,
    circonstancesFaits,
    notes,
    allHaveAvocat,
    config,
    summary,
    activePalier
  ]);

  // Synchronise le texte éditable sauf si l'utilisateur l'a modifié à la main
  useEffect(() => {
    if (!isReportManuallyEdited) {
      setEditedReportText(autoGeneratedReportText);
    }
  }, [autoGeneratedReportText, isReportManuallyEdited]);

  // Si l'agent signataire change alors que le rapport a déjà été édité manuellement, met à jour la ligne de signature sans écraser le reste
  useEffect(() => {
    if (isReportManuallyEdited && meta.agent) {
      setEditedReportText(prev => syncSigningAgentInText(prev, meta.agent));
    }
  }, [meta.agent, isReportManuallyEdited]);

  useEffect(() => {
    if (!isMirandaManuallyEdited) {
      setEditedMirandaText(summary.mirandaText);
    }
  }, [summary.mirandaText, isMirandaManuallyEdited]);

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Ouvre la Fiche de Peines & Amendes au format Feuille Papier A4 Officielle LSPD (.PNG + Lien Imprimante FiveM)
  const handleCopyImageToClipboard = () => {
    setShowPenaltyPrintModal(true);
  };

  const renderPenaltyPaperCanvas = useCallback(
    ({ signingAgent, commandVisa, docNumber }) =>
      generatePenaltyCanvas({
        meta: { ...meta, agent: signingAgent },
        serial: docNumber,
        commandVisa,
        summary,
        activePalier,
        config,
        notes
      }),
    [meta, summary, activePalier, config, notes]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const activeText = outputTab === "miranda" ? editedMirandaText : editedReportText;
    navigator.clipboard.writeText(activeText);
    if (onValidateAndArchive) {
      onValidateAndArchive({
        id: serial || generateDossierRef("LSPD"),
        date: meta.date,
        heure: meta.heure,
        agent: meta.agent,
        prevenu: meta.prevenu,
        infractionsCount: summary.activeRows.length,
        amendeMax: summary.sumAmendesMax,
        peineMaxMinutes: summary.sumPeinesMaxMinutes,
        palierRetenu: activePalier.label,
        amendeRetenue: activePalier.amende,
        peineRetenueMinutes: activePalier.peineMinutes,
        notes,
        commandVisa: "",
        reportText: editedReportText,
        rowsSnapshot: summary.activeRows.map(r => ({
          infractionId: r.infractionId,
          aggravanteIds: r.aggravanteIds,
          qte: r.qte,
          tentative: r.tentative,
          complicite: r.complicite,
          avocat: r.avocat,
          article: r.calc.article,
          chefAccusation: r.calc.chefAccusation,
          categorie: r.calc.categorie,
          totalFine: r.calc.totalFine,
          totalPeineMinutes: r.calc.totalPeineMinutes
        }))
      });
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 780px) minmax(380px, 1fr)", gap: "24px", alignItems: "start" }}>
      {/* LEFT CARD: CALCULATOR & CART */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2>
            <i className="fas fa-shield-halved"></i> Enregistrer une arrestation / Calculer une peine
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleCopyImageToClipboard}
              title="Générer et copier une image PNG avec toutes les amendes mises"
            >
              <i className="fas fa-camera"></i> Image des amendes (.PNG)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${showCoefPanel ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowCoefPanel(s => !s)}
            >
              <i className="fas fa-sliders"></i> Coefficients
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onResetToSheetSample}>
              <i className="fas fa-wand-magic-sparkles"></i> Exemple Sheet
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => setRows([])}>
              <i className="fas fa-trash"></i> Vider
            </button>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Row 1: Nom du Prévenu (RP) | Agent en charge | Assistance Avocat */}
            <div className="form-row">
              <div className="form-group">
                <label>Nom du prévenu (RP)</label>
                <input
                  type="text"
                  placeholder="Ex: Mike Armstrong"
                  value={meta.prevenu}
                  onChange={e => setMeta(p => ({ ...p, prevenu: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Agent en charge / Matricule</label>
                <input
                  type="text"
                  placeholder="Ex: 16 | Vance Winchester"
                  value={meta.agent}
                  onChange={e => setMeta(p => ({ ...p, agent: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>
                  <i className="fas fa-scale-balanced"></i> Assistance Avocat
                </label>
                <select value={allHaveAvocat ? "OUI" : "NON"} onChange={handleGlobalAvocatChange}>
                  <option value="NON">Aucun avocat (Sans remise)</option>
                  <option value="OUI">
                    Avocat présent (×{config.avocatMultiplier} soit -{Math.round((1 - config.avocatMultiplier) * 100)}%)
                  </option>
                </select>
              </div>
            </div>

            {/* Collapsible Live Coefficients Slider Box */}
            {showCoefPanel && (
              <div className="add-article-section" style={{ borderColor: "var(--accent)" }}>
                <div className="add-article-title" style={{ justifyContent: "space-between" }}>
                  <span>
                    <i className="fas fa-sliders"></i> Réglage en direct des coefficients du Sheet (J12:K23)
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() =>
                        setConfig(p => ({
                          ...p,
                          tentativeMultiplier: 0.5,
                          compliciteMultiplier: 0.75,
                          avocatMultiplier: 0.9
                        }))
                      }
                    >
                      Sheet (0.5 / 0.75 / 0.9)
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={onOpenSettings}>
                      Tous les réglages
                    </button>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tentative : ×{config.tentativeMultiplier}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={config.tentativeMultiplier}
                      onChange={e => setConfig(p => ({ ...p, tentativeMultiplier: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Complicité : ×{config.compliciteMultiplier}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={config.compliciteMultiplier}
                      onChange={e => setConfig(p => ({ ...p, compliciteMultiplier: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Avocat : ×{config.avocatMultiplier}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={config.avocatMultiplier}
                      onChange={e => setConfig(p => ({ ...p, avocatMultiplier: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* + AJOUTER UN CHEF D'ACCUSATION AU PANIER */}
            <div className="add-article-section">
              <div className="add-article-title" style={{ justifyContent: "space-between" }}>
                <span>
                  <i className="fas fa-plus"></i> Ajouter un chef d'accusation au panier
                </span>
                <input
                  type="text"
                  placeholder="Recherche rapide (ex: 403, Braquage, Vitesse)..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{
                    width: 240,
                    padding: "5px 10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 13
                  }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Catégorie</label>
                  <select value={catFilter} onChange={handleCategoryChange}>
                    <option value="">Toutes ({infractions.length})</option>
                    <option value="Contravention">Contraventions</option>
                    <option value="Délit mineur">Délits mineurs</option>
                    <option value="Délit majeur">Délits majeurs</option>
                    <option value="Crime">Crimes</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1.6 }}>
                  <label>Article / Chef d'accusation</label>
                  <select value={articleId} onChange={handleArticleChange}>
                    <option value="">Choisir un article...</option>
                    {filteredInfractions.map(inf => (
                      <option key={inf.id} value={inf.id}>
                        [{inf.article}] {inf.chefAccusation} — ${inf.amendeBase.toLocaleString()} — {inf.peineBaseMinutes} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Aggravating Circumstances for the selected Infraction */}
              {articleId && availableBuilderAggs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "var(--accent)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontWeight: 700,
                      marginBottom: 8
                    }}
                  >
                    <i className="fas fa-triangle-exclamation"></i> Circonstances aggravantes ({availableBuilderAggs.length}) :
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {availableBuilderAggs.map(agg => {
                      const isSel = selectedAggUids.includes(agg.uid);
                      return (
                        <button
                          key={agg.uid}
                          type="button"
                          onClick={() => handleToggleBuilderAgg(agg.uid)}
                          className={`agg-chip ${isSel ? "selected" : ""}`}
                        >
                          <span>{isSel ? "✓" : "+"}</span>
                          <span>{agg.circonstance}</span>
                          <span style={{ opacity: 0.85, fontSize: 12 }}>
                            (+${agg.amendeSupplementaire} / +{agg.peineSupplementaireMinutes}m)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Row: N° de dossier | Quantité & Modificateurs | Sous-total ($ et Temps) */}
              <div className="form-row">
                <div className="form-group">
                  <label>N° de dossier</label>
                  <input
                    type="text"
                    placeholder="Ex: LSPD-RA-00142"
                    value={serial}
                    onChange={e => setSerial(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleGenerateSerial}
                    style={{ marginTop: 6 }}
                  >
                    <i className="fas fa-random"></i> Générer auto
                  </button>
                </div>

                <div className="form-group">
                  <label>Quantité & Circonstances</label>
                  <input
                    type="number"
                    value={qty}
                    min="1"
                    onChange={e => setQty(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setBuilderTentative(v => !v)}
                      className={`modifier-pill ${builderTentative ? "active-tentative" : ""}`}
                    >
                      Tentative {builderTentative ? `×${config.tentativeMultiplier}` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderComplicite(v => !v)}
                      className={`modifier-pill ${builderComplicite ? "active-complicite" : ""}`}
                    >
                      Complicité {builderComplicite ? `×${config.compliciteMultiplier}` : ""}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Sous-total</label>
                  <div className="sale-total">${builderPreview.totalFine.toLocaleString()}</div>
                  {!builderPreview.isEmpty && (
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "var(--blue)", fontWeight: 700 }}>
                      {formatMinutesToHours(builderPreview.totalPeineMinutes)} ({builderPreview.totalPeineMinutes}m)
                    </div>
                  )}
                </div>
              </div>

              <button type="button" className="btn btn-outline btn-full" onClick={handleAddToCart}>
                <i className="fas fa-cart-plus"></i> Ajouter au panier
              </button>
            </div>

            {/* PANIER DES AMENDES MISES */}
            <div className="sale-cart-section">
              <div className="sale-cart-header">
                <span>
                  <i className="fas fa-shopping-cart"></i> Panier ({summary.activeRows.length} amende{summary.activeRows.length > 1 ? "s" : ""})
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {summary.activeRows.length > 0 && (
                    <>
                      <strong className="cart-grand-total">
                        Max : ${summary.sumAmendesMax.toLocaleString()} • {formatMinutesToHours(summary.sumPeinesMaxMinutes)} ({summary.sumPeinesMaxMinutes}m)
                      </strong>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleCopyImageToClipboard}
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        title="Créer et copier une image PNG de toutes les amendes mises"
                      >
                        <i className="fas fa-image"></i> Créer Image PNG
                      </button>
                    </>
                  )}
                </div>
              </div>

              {summary.activeRows.length === 0 ? (
                <div className="cart-empty">
                  <i className="fas fa-shopping-cart"></i> Le panier est vide — ajoutez des chefs d'accusation ci-dessus
                </div>
              ) : (
                summary.activeRows.map(row => {
                  const { calc } = row;
                  const rowAggs = aggravantesByInf.get(row.infractionId) || [];
                  return (
                    <div
                      className="cart-item"
                      key={row.id}
                      style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div className="cart-item-info">
                          <span className="cart-item-name">
                            <span style={{ color: "var(--accent)", marginRight: 8 }}>[{calc.article}]</span>
                            {calc.chefAccusation}
                            <span className={getCategoryBadgeClass(calc.categorie)} style={{ marginLeft: 8 }}>
                              {calc.categorie}
                            </span>
                          </span>
                          <span className="cart-item-meta">
                            x{row.qte} · Barème Sheet : ${calc.baseFine.toLocaleString()} ({calc.basePeine}m)
                            {calc.aggravantesFine > 0 || calc.aggravantesPeine > 0
                              ? ` + Aggravantes $${calc.aggravantesFine.toLocaleString()} (+${calc.aggravantesPeine}m)`
                              : ""}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number"
                            min="1"
                            className="cart-serial-input"
                            style={{ width: 62, textAlign: "center" }}
                            value={row.qte}
                            onChange={e => handleUpdateRow(row.id, { qte: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            title="Quantité"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(row.id, { tentative: !row.tentative })}
                            className={`modifier-pill ${row.tentative ? "active-tentative" : ""}`}
                          >
                            Tent. {row.tentative ? `×${config.tentativeMultiplier}` : "Non"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(row.id, { complicite: !row.complicite })}
                            className={`modifier-pill ${row.complicite ? "active-complicite" : ""}`}
                          >
                            Comp. {row.complicite ? `×${config.compliciteMultiplier}` : "Non"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(row.id, { avocat: !row.avocat })}
                            className={`modifier-pill ${row.avocat ? "active-avocat" : ""}`}
                          >
                            Avocat {row.avocat ? `×${config.avocatMultiplier}` : "Non"}
                          </button>
                        </div>

                        <div className="cart-item-total">
                          <div>${calc.totalFine.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: "var(--blue)" }}>
                            {formatMinutesToHours(calc.totalPeineMinutes)} ({calc.totalPeineMinutes}m)
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveRow(row.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>

                      {rowAggs.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {rowAggs.map(agg => {
                            const isSelected = (row.aggravanteIds || []).includes(agg.uid);
                            return (
                              <button
                                key={agg.uid}
                                type="button"
                                onClick={() => handleToggleRowAgg(row.id, agg.uid)}
                                className={`agg-chip ${isSelected ? "selected" : ""}`}
                                style={{ padding: "4px 9px", fontSize: 12 }}
                              >
                                <span>{isSelected ? "✓" : "+"}</span>
                                <span>{agg.circonstance}</span>
                                <span style={{ opacity: 0.8 }}>
                                  (+${agg.amendeSupplementaire} / +{agg.peineSupplementaireMinutes}m)
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {calc.specialText && (
                        <div style={{ fontSize: 12, color: "var(--orange)", fontWeight: 700 }}>
                          <i className="fas fa-triangle-exclamation"></i> Spécial : {calc.specialText}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ÉLÉMENTS DU RAPPORT D'ARRESTATION OFFICIEL LSPD (Art. 117-5, Art. 123 & Procédure d'Arrestation) */}
            <div className="add-article-section" style={{ marginBottom: 16 }}>
              <div
                className="add-article-title"
                style={{ justifyContent: "space-between", cursor: "pointer", marginBottom: showReportFields ? 14 : 0 }}
                onClick={() => setShowReportFields(s => !s)}
              >
                <span>
                  <i className="fas fa-file-shield"></i> Détails du Rapport d'Arrestation Officiel LSPD (Art. 123 & Étape 8)
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {showReportFields ? "Masquer ▲" : "Afficher ▼"}
                </span>
              </div>

              {showReportFields && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Lieu de l'interpellation</label>
                      <input
                        type="text"
                        placeholder="Ex: Strawberry Ave / Supérette"
                        value={lieuInterpellation}
                        onChange={e => setLieuInterpellation(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Unités / Agents présents</label>
                      <input
                        type="text"
                        placeholder="Ex: Lincoln-16, Adam-12"
                        value={unitesPresentes}
                        onChange={e => setUnitesPresentes(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Papiers d'identité (Étape 5)</label>
                      <select value={statutIdentite} onChange={e => setStatutIdentite(e.target.value)}>
                        <option value="Carte d'identité présentée et vérifiée au poste">Papiers présentés au poste</option>
                        <option value="Refus de présenter ses papiers d'identité (Art. 305)">Refus de présenter ses papiers</option>
                        <option value="Individu non porteur de documents (Identifié au poste)">Sans papiers sur lui</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Attitude & Réaction (Étape 8)</label>
                      <select value={attitudeSuspect} onChange={e => setAttitudeSuspect(e.target.value)}>
                        <option value="Coopératif lors de la procédure">Coopératif et calme</option>
                        <option value="Non coopératif / Attitude provocatrice">Non coopératif</option>
                        <option value="Résistance / Tentative de fuite lors de l'interpellation">Résistance / Tentative de fuite</option>
                        <option value="Violent / Menaces envers les agents">Violent / Menaces</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Droits Miranda (Étape 6)</label>
                      <select value={statutMiranda} onChange={e => setStatutMiranda(e.target.value)}>
                        <option value="Lus et compris dès la 1ère lecture">Compris dès la 1ère lecture</option>
                        <option value="Lus 2 fois — Compris par le suspect">Compris après 2 lectures</option>
                        <option value="Lus 3 fois — Considérés comme compris conformément à la procédure">Lus 3 fois (Considérés compris)</option>
                      </select>
                    </div>
                    {allHaveAvocat && (
                      <div className="form-group">
                        <label>Nom de l'Avocat (Délit Majeur)</label>
                        <input
                          type="text"
                          placeholder="Nom de l'avocat privé ou commis..."
                          value={nomAvocat}
                          onChange={e => setNomAvocat(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Fouilles (Initiale & Complète) et Objets Saisis / Scellés (Étapes 2 & 7)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1x Pistolet 9mm saisi, 10x pochons, téléphone et radio retirés avant cellule..."
                      value={objetsSaisis}
                      onChange={e => setObjetsSaisis(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Circonstances détaillées & Suspicion raisonnable (Vide = Généré automatiquement)</label>
                    <textarea
                      rows="2"
                      placeholder="Laissez vide pour générer automatiquement le récit complet de l'arrestation, ou écrivez vos propres circonstances..."
                      value={circonstancesFaits}
                      onChange={e => setCirconstancesFaits(e.target.value)}
                    ></textarea>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline btn-full"
                onClick={handleCopyImageToClipboard}
                disabled={summary.activeRows.length === 0}
                style={{ borderColor: "var(--accent)", color: "var(--text-primary)" }}
              >
                <i className="fas fa-camera" style={{ color: "var(--accent)" }}></i> Générer & Copier l'Image des Amendes
              </button>

              <button type="submit" className="btn btn-primary btn-full" disabled={summary.activeRows.length === 0}>
                <i className="fas fa-check"></i> Valider la peine & Copier le Rapport
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: SHEET PALIERS (MIN 1 .. MAXIMAL), RETENTION, UP & RAPPORT MODIFIABLE */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* 5 PALIERS OFFICIELS DU SHEET (I26:K30) */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>
              <i className="fas fa-gavel"></i> Paliers de Peine (Sheet I26:K30)
            </h2>
            <span className="role-badge patron">{activePalier.label}</span>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: 16,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                  Amende Retenue
                </div>
                <div className="sale-total" style={{ padding: "4px 0" }}>
                  ${activePalier.amende.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Max (100%) : ${summary.sumAmendesMax.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                  Peine Retenue
                </div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--blue)", padding: "4px 0" }}>
                  {formatMinutesToHours(activePalier.peineMinutes)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Soit {activePalier.peineMinutes} min (Max: {summary.sumPeinesMaxMinutes}m)
                </div>
              </div>
            </div>

            {summary.judgeRequired && (
              <div className="alert-banner alert-danger">
                <i className="fas fa-gavel"></i>
                <span>
                  *JUGE / PROC OBLIGATOIRE — Rétention Max : <strong>{formatRetentionHours(summary.maxRetentionHours)}</strong>
                </span>
              </div>
            )}

            {/* 5 Clickable Paliers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {summary.paliers.map(p => {
                const isSelected = selectedPalierId === p.id;
                const pct = Math.round((p.factorAmende ?? 1) * 100);
                return (
                  <div
                    key={p.id}
                    className={`palier-card ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedPalierId(p.id)}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>{p.label}</strong>
                        <span className="brand-badge">{pct}%</span>
                      </div>
                      <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        Décision : {p.decision}
                      </small>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: "var(--green)", fontSize: 15 }}>
                        ${p.amende.toLocaleString()}
                      </div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: "var(--blue)", fontSize: 12 }}>
                        {formatMinutesToHours(p.peineMinutes)} ({p.peineMinutes}m)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category breakdown & UP Conversion */}
            <div className="form-row" style={{ marginTop: 4 }}>
              <div
                style={{
                  flex: 1,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                  fontSize: 13
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", fontSize: 11 }}>
                  Décompte & Rétention (B25:E29)
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Contraventions :</span>
                  <strong>{summary.counts["Contravention"]}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Délits mineurs (3h) :</span>
                  <strong>{summary.counts["Délit mineur"]}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Délits majeurs (12h) :</span>
                  <strong>{summary.counts["Délit majeur"]}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Crimes (24h) :</span>
                  <strong>{summary.counts["Crime"]}</strong>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--orange)", textTransform: "uppercase", fontSize: 11 }}>
                  Conversion UP (O26)
                </div>
                <input
                  type="number"
                  className="input"
                  style={{ padding: "6px 10px", fontSize: 13 }}
                  placeholder={`Auto: $${summary.sumAmendesMax}`}
                  value={meta.upCustomAmount ?? ""}
                  onChange={e => setMeta(p => ({ ...p, upCustomAmount: e.target.value }))}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Total UP :</span>
                  <strong style={{ fontFamily: "'Orbitron', sans-serif", color: "var(--orange)", fontSize: 15 }}>
                    {summary.totalUpMinutes.toFixed(2)} UP
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RAPPORT D'ARRESTATION LSPD & DROITS MIRANDA — 100% MODIFIABLE & COPIABLE */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${outputTab === "rapport" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setOutputTab("rapport")}
              >
                <i className="fas fa-file-shield"></i> Rapport d'Arrestation LSPD
              </button>
              <button
                type="button"
                className={`btn btn-sm ${outputTab === "miranda" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setOutputTab("miranda")}
              >
                <i className="fas fa-scroll"></i> Droits Miranda (N3)
              </button>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {outputTab === "rapport" && isReportManuallyEdited && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setIsReportManuallyEdited(false);
                    setEditedReportText(autoGeneratedReportText);
                  }}
                  title="Régénérer le rapport automatique depuis le formulaire"
                >
                  <i className="fas fa-arrows-rotate"></i> Régénérer auto
                </button>
              )}
              {outputTab === "miranda" && isMirandaManuallyEdited && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setIsMirandaManuallyEdited(false);
                    setEditedMirandaText(summary.mirandaText);
                  }}
                  title="Régénérer les droits Miranda automatiques"
                >
                  <i className="fas fa-arrows-rotate"></i> Régénérer auto
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                onClick={() => setShowPrintModal(true)}
                title="Générer une feuille papier A4 officielle LSPD imprimable en jeu (FiveM) + Lien .PNG direct"
              >
                <i className="fas fa-print"></i> Imprimer en jeu
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() =>
                  handleCopy(
                    outputTab,
                    outputTab === "miranda" ? editedMirandaText : editedReportText
                  )
                }
              >
                <i className={`fas fa-${copiedKey === outputTab ? "check" : "copy"}`}></i>
                {copiedKey === outputTab ? "Copié dans le presse-papiers !" : "Copier le texte"}
              </button>
            </div>
          </div>

          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {outputTab === "rapport" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--gold-seal)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  <i className="fas fa-file-signature" style={{ marginRight: 5 }}></i>
                  Template de Rapport :
                </label>
                <select
                  className="select"
                  style={{ flex: 1, padding: "6px 10px", fontSize: 13 }}
                  value={activeReportTemplateId || "standard"}
                  onChange={e => {
                    if (setActiveReportTemplateId) setActiveReportTemplateId(e.target.value);
                    setIsReportManuallyEdited(false);
                  }}
                >
                  <option value="standard">Rapport d'Arrestation LSPD Standard (Art. 117-5 & 123)</option>
                  <optgroup label="━━ BRAQUAGES (ART. 403) ━━">
                    {LSPD_TEMPLATES.filter(t => t.group === "braquage").map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="━━ INTERVENTIONS TERRAIN ━━">
                    {LSPD_TEMPLATES.filter(t => t.group === "intervention").map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="━━ DETECTIVE BUREAU & MANDATS DOJ ━━">
                    {LSPD_TEMPLATES.filter(t => t.group === "enquete" || t.group === "doj").map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-secondary)" }}>
              <span>
                <i className="fas fa-pen" style={{ color: "var(--accent)", marginRight: 6 }}></i>
                <strong>Zone éditable :</strong> Vous pouvez modifier le texte du rapport directement ci-dessous avant de le copier-coller.
              </span>
              {(outputTab === "rapport" ? isReportManuallyEdited : isMirandaManuallyEdited) && (
                <span className="brand-badge">Modifié manuellement</span>
              )}
            </div>

            {outputTab === "rapport" ? (
              <textarea
                rows={22}
                className="textarea"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.55,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  padding: 14
                }}
                value={editedReportText}
                onChange={e => {
                  setIsReportManuallyEdited(true);
                  setEditedReportText(e.target.value);
                }}
              />
            ) : (
              <textarea
                rows={14}
                className="textarea"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  padding: 14
                }}
                value={editedMirandaText}
                onChange={e => {
                  setIsMirandaManuallyEdited(true);
                  setEditedMirandaText(e.target.value);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* MODAL FICHE DE PEINES & AMENDES AU FORMAT PAPIER A4 OFFICIEL LSPD (.PNG + LIEN IMPRIMANTE FIVEM) */}
      <PrintReportModal
        isOpen={showPenaltyPrintModal}
        onClose={() => setShowPenaltyPrintModal(false)}
        modalTitle="Fiche de Peines & Amendes Officielle LSPD (Format Papier A4 .PNG / Imprimable en jeu)"
        downloadPrefix="Fiche_Peines_LSPD"
        title="FICHE OFFICIELLE DE CALCUL DES PEINES & AMENDES"
        docNumber={serial || "LSPD-RA-2026"}
        date={meta.date}
        agent={meta.agent}
        prevenu={meta.prevenu}
        renderCustomCanvas={renderPenaltyPaperCanvas}
        autoCopyOnOpen={true}
        onSaveChanges={({ agent: nextAgent, docNumber: nextDoc }) => {
          if (nextAgent !== undefined) {
            setMeta(p => ({ ...p, agent: nextAgent }));
            setEditedReportText(prev => syncSigningAgentInText(prev, nextAgent));
          }
          if (nextDoc !== undefined) {
            setSerial(nextDoc);
          }
        }}
      />

      {/* MODAL IMPRESSION PAPIER EN JEU (FEUILLE A4 LSPD + LIEN DIRECT IMPRIMANTE FIVEM) */}
      <PrintReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={
          outputTab === "miranda"
            ? "NOTIFICATION OFFICIELLE DES DROITS MIRANDA"
            : activeReportTemplateId && activeReportTemplateId !== "standard"
            ? (LSPD_TEMPLATES.find(t => t.id === activeReportTemplateId)?.title || "RAPPORT D'INTERVENTION LSPD")
            : "RAPPORT D'ARRESTATION & PROCÈS-VERBAL (ART. 123)"
        }
        docNumber={serial || "LSPD-RA-2026"}
        date={meta.date}
        agent={meta.agent}
        prevenu={meta.prevenu}
        reportText={outputTab === "miranda" ? editedMirandaText : editedReportText}
        onSaveChanges={({ agent: nextAgent, docNumber: nextDoc, reportText: nextText }) => {
          if (nextAgent !== undefined) {
            setMeta(p => ({ ...p, agent: nextAgent }));
          }
          if (nextDoc !== undefined) {
            setSerial(nextDoc);
          }
          if (outputTab === "rapport" && nextText !== undefined) {
            setEditedReportText(nextText);
          }
        }}
      />

      {/* MODAL LOI */}
      {inspectedInfraction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setInspectedInfraction(null)}
        >
          <div className="card" style={{ maxWidth: 640, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-book-open"></i> {inspectedInfraction.article} — {inspectedInfraction.chefAccusation}
              </h2>
              <button className="btn btn-sm btn-outline" onClick={() => setInspectedInfraction(null)}>
                Fermer
              </button>
            </div>
            <div className="card-body">
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, lineHeight: 1.6 }}>
                {inspectedInfraction.legalExcerpt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
