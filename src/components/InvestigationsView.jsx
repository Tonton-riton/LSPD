import React, { useState, useMemo } from "react";
import { LSPD_TEMPLATES, LSPD_TEMPLATE_GROUPS } from "../data/lspdTemplates";
import PrintReportModal from "./PrintReportModal";
import { syncSigningAgentInText } from "../utils/generatePrintableReport";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";

export { LSPD_TEMPLATES };

const INITIAL_SAMPLE_CASES = [
  {
    id: "case_sample_1",
    caseNumber: "LSPD-BRQ-2026-014",
    title: "Braquage Supérette Strawberry & Refus d'obtempérer",
    templateId: "tpl_braquage_superette",
    division: "Patrouille / Intervention LSPD",
    status: "in_progress",
    priority: "high",
    leadAgent: "16 | Vance Winchester",
    targetName: "Mike Armstrong",
    targetGroup: "Indépendant",
    location: "Strawberry Ave — Supérette 24/7",
    createdAt: "25/11/2026 02:21",
    suspects: [
      { name: "Mike Armstrong", status: "En garde à vue", role: "Braqueur principal" }
    ],
    evidence: [
      { code: "SC-01", label: "Vidéosurveillance de la supérette Strawberry (10-90)" },
      { code: "SC-02", label: "Rapport de course-poursuite 10-80 (Art. 301)" }
    ],
    reportText: ""
  },
  {
    id: "case_sample_2",
    caseNumber: "LSPD-FLC-2026-009",
    title: "Braquage Banque Fleeca Hawick Ave — Équipe de 4 individus",
    templateId: "tpl_braquage_banque_fleeca",
    division: "Major Crimes / SWAT / LSPD",
    status: "warrant_needed",
    priority: "critical",
    leadAgent: "16 | Vance Winchester",
    targetName: "Équipe Fleeca (Suspects masqués)",
    targetGroup: "Organisation Criminelle",
    location: "Hawick Ave — Banque Fleeca",
    createdAt: "24/11/2026 21:45",
    suspects: [
      { name: "Suspect non identifié #1", status: "Recherché", role: "Négociateur / Armé Cat. B" }
    ],
    evidence: [
      { code: "SC-01", label: "Relevé de plaques véhicule de fuite (Sultan RS noire)" },
      { code: "SC-02", label: "Déposition des 2 otages libérés (Examen EMS RAS)" }
    ],
    reportText: ""
  }
];

INITIAL_SAMPLE_CASES.forEach(c => {
  const tpl = LSPD_TEMPLATES.find(t => t.id === c.templateId) || LSPD_TEMPLATES[0];
  const [d, h] = c.createdAt.split(" ");
  c.reportText = tpl.generateContent({
    caseNumber: c.caseNumber,
    title: c.title,
    agent: c.leadAgent,
    targetName: c.targetName,
    targetGroup: c.targetGroup,
    location: c.location,
    date: d || "25/11/2026",
    heure: h || "02:21"
  });
});

const STATUS_BADGES = {
  in_progress:    { label: "Enquête en cours", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  surveillance:   { label: "Sous surveillance", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  warrant_needed: { label: "Mandat DOJ requis", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  prosecutor:     { label: "Transmis au Procureur", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)" },
  closed:         { label: "Clôturé / Résolu", color: "#00e676", bg: "rgba(0, 230, 118, 0.14)" }
};

const PRIORITY_BADGES = {
  critical: { label: "Code 3 • Critique", color: "#ef4444", bg: "rgba(239, 68, 68, 0.16)" },
  high:     { label: "Code 2 • Haute", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  medium:   { label: "Code 1 • Normale", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.14)" }
};

const STORAGE_CASES_KEY = "sa_lspd_investigations_v2";

export default function InvestigationsView({
  meta,
  onSendSuspectToCalculator,
  onLoadTemplatePresetToCalculator
}) {
  const [cases, setCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CASES_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_CASES;
    } catch {
      return INITIAL_SAMPLE_CASES;
    }
  });

  const [activeCaseId, setActiveCaseId] = useState(() => cases[0]?.id || null);
  const [subView, setSubView] = useState("templates"); // Open straight on Templates or Dossiers
  const [templateGroupFilter, setTemplateGroupFilter] = useState("ALL");
  const [templateSearch, setTemplateSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);

  // New Case Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    templateId: LSPD_TEMPLATES[0].id,
    caseNumber: `LSPD-BRQ-2026-${String(Math.floor(100 + Math.random() * 899))}`,
    title: "",
    leadAgent: meta?.agent || "16 | Vance Winchester",
    division: "Patrouille / Intervention LSPD",
    status: "in_progress",
    priority: "high",
    targetName: "",
    targetGroup: "",
    location: "Los Santos"
  });

  const [newSuspectName, setNewSuspectName] = useState("");
  const [newSuspectStatus, setNewSuspectStatus] = useState("Recherché");
  const [newEvidenceLabel, setNewEvidenceLabel] = useState("");

  const saveCases = (next) => {
    setCases(next);
    try {
      localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const activeCase = useMemo(() => {
    return cases.find(c => c.id === activeCaseId) || cases[0] || null;
  }, [cases, activeCaseId]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return LSPD_TEMPLATES.filter(t => {
      if (templateGroupFilter !== "ALL" && t.group !== templateGroupFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [templateGroupFilter, templateSearch]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.targetName || "").toLowerCase().includes(q) ||
        (c.targetGroup || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q)
      );
    });
  }, [cases, searchQuery, statusFilter]);

  const handleCreateCase = (e) => {
    e.preventDefault();
    const tpl = LSPD_TEMPLATES.find(t => t.id === newForm.templateId) || LSPD_TEMPLATES[0];
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const titleVal = newForm.title.trim() || tpl.title;

    const chosenAgent = (newForm.leadAgent || "").trim() || meta?.agent || "16 | Vance Winchester";
    const generatedText = tpl.generateContent({
      caseNumber: newForm.caseNumber,
      title: titleVal,
      agent: chosenAgent,
      targetName: newForm.targetName,
      targetGroup: newForm.targetGroup,
      location: newForm.location,
      date: dateStr,
      heure: heureStr
    });

    const created = {
      id: `case_${Date.now()}`,
      caseNumber: newForm.caseNumber || `LSPD-2026-${Math.floor(100 + Math.random() * 899)}`,
      title: titleVal,
      templateId: tpl.id,
      division: newForm.division,
      status: newForm.status,
      priority: newForm.priority,
      leadAgent: chosenAgent,
      targetName: newForm.targetName.trim() || "Contre X",
      targetGroup: newForm.targetGroup.trim() || "Indépendant",
      location: newForm.location.trim() || "Los Santos",
      createdAt: `${dateStr} ${heureStr}`,
      suspects: newForm.targetName.trim()
        ? [{ name: newForm.targetName.trim(), status: "Cible principale", role: "Suspect" }]
        : [],
      evidence: [],
      reportText: generatedText
    };

    const next = [created, ...cases];
    saveCases(next);
    setActiveCaseId(created.id);
    setShowNewModal(false);
    setSubView("dossiers");
    setNewForm({
      templateId: LSPD_TEMPLATES[0].id,
      caseNumber: `LSPD-BRQ-2026-${String(Math.floor(100 + Math.random() * 899))}`,
      title: "",
      leadAgent: meta?.agent || "16 | Vance Winchester",
      division: "Patrouille / Intervention LSPD",
      status: "in_progress",
      priority: "high",
      targetName: "",
      targetGroup: "",
      location: "Los Santos"
    });
  };

  const handleUseTemplate = (tpl) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const num = `LSPD-${tpl.category.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;

    const generatedText = tpl.generateContent({
      caseNumber: num,
      title: tpl.title,
      agent: meta?.agent || "16 | Vance Winchester",
      targetName: meta?.prevenu || "Suspect / Cible",
      targetGroup: "",
      location: "Los Santos",
      date: dateStr,
      heure: heureStr
    });

    const created = {
      id: `case_${Date.now()}`,
      caseNumber: num,
      title: `${tpl.category} — ${meta?.prevenu || "Nouveau Dossier"}`,
      templateId: tpl.id,
      division: tpl.defaultDivision,
      status: "in_progress",
      priority: tpl.defaultPriority,
      leadAgent: meta?.agent || "16 | Vance Winchester",
      targetName: meta?.prevenu || "À compléter",
      targetGroup: "À compléter",
      location: "Los Santos",
      createdAt: `${dateStr} ${heureStr}`,
      suspects: meta?.prevenu
        ? [{ name: meta.prevenu, status: "Mis en cause", role: "Principal" }]
        : [],
      evidence: [],
      reportText: generatedText
    };

    const next = [created, ...cases];
    saveCases(next);
    setActiveCaseId(created.id);
    setSubView("dossiers");
  };

  const handlePatchCaseById = (caseId, patch) => {
    if (!caseId) return;
    setCases(prev => {
      const next = prev.map(c => (c.id === caseId ? { ...c, ...patch } : c));
      try {
        localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleUpdateActiveCase = (field, value) => {
    if (!activeCase) return;
    const next = cases.map(c => {
      if (c.id !== activeCase.id) return c;
      if (field === "leadAgent" && c.reportText) {
        return {
          ...c,
          leadAgent: value,
          reportText: syncSigningAgentInText(c.reportText, value)
        };
      }
      return { ...c, [field]: value };
    });
    saveCases(next);
  };

  const handleApplyTemplateToActiveCase = (tplId) => {
    if (!activeCase) return;
    const tpl = LSPD_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const [d, h] = (activeCase.createdAt || "").split(" ");
    const regenerated = tpl.generateContent({
      caseNumber: activeCase.caseNumber,
      title: activeCase.title,
      agent: activeCase.leadAgent || meta?.agent,
      targetName: activeCase.targetName,
      targetGroup: activeCase.targetGroup,
      location: activeCase.location,
      date: d || new Date().toLocaleDateString("fr-FR"),
      heure: h || "02:21"
    });
    handleUpdateActiveCase("reportText", regenerated);
  };

  const handleAddSuspect = () => {
    if (!activeCase || !newSuspectName.trim()) return;
    const list = Array.isArray(activeCase.suspects) ? activeCase.suspects : [];
    handleUpdateActiveCase("suspects", [
      ...list,
      { name: newSuspectName.trim(), status: newSuspectStatus, role: "Suspect" }
    ]);
    setNewSuspectName("");
  };

  const handleRemoveSuspect = (idx) => {
    if (!activeCase) return;
    const list = (activeCase.suspects || []).filter((_, i) => i !== idx);
    handleUpdateActiveCase("suspects", list);
  };

  const handleAddEvidence = () => {
    if (!activeCase || !newEvidenceLabel.trim()) return;
    const list = Array.isArray(activeCase.evidence) ? activeCase.evidence : [];
    const code = `SC-${String(list.length + 1).padStart(2, "0")}`;
    handleUpdateActiveCase("evidence", [...list, { code, label: newEvidenceLabel.trim() }]);
    setNewEvidenceLabel("");
  };

  const handleRemoveEvidence = (idx) => {
    if (!activeCase) return;
    const list = (activeCase.evidence || []).filter((_, i) => i !== idx);
    handleUpdateActiveCase("evidence", list);
  };

  const handleDeleteCase = (id) => {
    const next = cases.filter(c => c.id !== id);
    saveCases(next);
    if (activeCaseId === id) {
      setActiveCaseId(next[0]?.id || null);
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TOP BAR */}
      <div className="card">
        <div
          className="card-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${subView === "templates" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("templates")}
            >
              <i className="fas fa-file-signature"></i> Templates Braquages, Interventions & Enquêtes ({LSPD_TEMPLATES.length})
            </button>
            <button
              type="button"
              className={`btn ${subView === "dossiers" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("dossiers")}
            >
              <i className="fas fa-folder-open"></i> Mes Dossiers d'Enquête LSPD ({cases.length})
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewModal(true)}
          >
            <i className="fas fa-plus-circle"></i> Nouveau Dossier d'Enquête
          </button>
        </div>
      </div>

      {/* VIEW 1: BIBLIOTHÈQUE DES 16 TEMPLATES LSPD (BRAQUAGES, INTERVENTIONS, DB, MANDATS) */}
      {subView === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filter bar */}
          <div className="card">
            <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                className="input"
                style={{ flex: "1 1 260px" }}
                placeholder="Rechercher un template (ex: Braquage, Fleeca, Pacific, Supérette, Fusillade, Poursuite, Deal, Mandat)..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LSPD_TEMPLATE_GROUPS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    className={`btn btn-sm ${templateGroupFilter === g.id ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setTemplateGroupFilter(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="catalogue-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
            {filteredTemplates.map(tpl => {
              const sampleText = tpl.generateContent({
                caseNumber: "LSPD-2026-001",
                title: tpl.title,
                agent: meta?.agent || "16 | Vance Winchester",
                targetName: meta?.prevenu || "Mike Armstrong",
                targetGroup: "",
                location: "Los Santos",
                date: meta?.date || "25/11/2026",
                heure: meta?.heure || "02:21"
              });
              return (
                <div key={tpl.id} className="weapon-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="weapon-card-top">
                    <div className="weapon-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={`fas fa-${tpl.icon}`} style={{ color: "var(--accent)" }}></i>
                      <span>{tpl.title}</span>
                    </div>
                    <span className={`cat-badge ${tpl.badgeClass}`}>{tpl.category}</span>
                  </div>

                  <p className="weapon-desc" style={{ marginBottom: 2 }}>
                    {tpl.description}
                  </p>

                  <pre
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: 10,
                      fontSize: 11.5,
                      color: "var(--text-secondary)",
                      fontFamily: "'Rajdhani', sans-serif",
                      maxHeight: 150,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {sampleText}
                  </pre>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => handleUseTemplate(tpl)}
                    >
                      <i className="fas fa-pen-to-square"></i> Ouvrir & Modifier
                    </button>

                    {tpl.presetOffenses && onLoadTemplatePresetToCalculator && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                        onClick={() => onLoadTemplatePresetToCalculator(tpl)}
                        title="Charger automatiquement les amendes correspondantes + ce template dans le Calculateur"
                      >
                        <i className="fas fa-calculator"></i> Peines
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                      onClick={() =>
                        setPrintPayload({
                          title: tpl.title,
                          docNumber: `LSPD-${tpl.category.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()}-2026`,
                          date: meta?.date,
                          agent: meta?.agent,
                          prevenu: meta?.prevenu,
                          reportText: sampleText
                        })
                      }
                      title="Imprimer ce template en jeu (Feuille Papier A4 LSPD + Lien .PNG)"
                    >
                      <i className="fas fa-print"></i> Imprimer
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleCopyText(tpl.id, sampleText)}
                      title="Copier le template dans le presse-papiers"
                    >
                      <i className={`fas fa-${copiedId === tpl.id ? "check" : "copy"}`}></i>
                      {copiedId === tpl.id ? "Copié" : "Copier"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: GESTIONNAIRE DES DOSSIERS D'ENQUÊTE + ÉDITEUR DE RAPPORT */}
      {subView === "dossiers" && (
        <div style={{ display: "grid", gridTemplateColumns: "370px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          {/* LEFT LIST OF INVESTIGATION DOSSIERS */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-folder-tree"></i> Registre des Dossiers ({filteredCases.length})
              </h2>
            </div>

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                className="input"
                placeholder="Rechercher N° dossier, braquage, suspect, lieu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />

              <select
                className="select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tous les statuts ({cases.length})</option>
                {Object.entries(STATUS_BADGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
                {filteredCases.map(c => {
                  const isSelected = activeCase?.id === c.id;
                  const st = STATUS_BADGES[c.status] || STATUS_BADGES.in_progress;
                  const pr = PRIORITY_BADGES[c.priority] || PRIORITY_BADGES.medium;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCaseId(c.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--bg-secondary)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                          {c.caseNumber}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: st.bg,
                            color: st.color
                          }}
                        >
                          {st.label}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                        {c.title}
                      </div>

                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                        <span>
                          <i className="fas fa-user-tag" style={{ marginRight: 5, color: "var(--accent)" }}></i>
                          {c.targetName}
                        </span>
                        <span style={{ color: pr.color, fontWeight: 700 }}>{pr.label}</span>
                      </div>

                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <span>
                          <i className="fas fa-signature" style={{ marginRight: 4, color: "var(--gold-seal)" }}></i>
                          {c.leadAgent || meta?.agent || "LSPD"}
                        </span>
                        <span>{c.createdAt}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredCases.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                    Aucun dossier d'enquête trouvé.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT ACTIVE CASE WORKSPACE & EDITABLE TEMPLATE REPORT */}
          {activeCase ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    <span>Dossier {activeCase.caseNumber} — {activeCase.title}</span>
                  </h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => onSendSuspectToCalculator(activeCase.targetName)}
                    >
                      <i className="fas fa-calculator"></i> Calculer la peine de {activeCase.targetName}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteCase(activeCase.id)}
                    >
                      <i className="fas fa-trash"></i> Supprimer
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>N° de Dossier LSPD</label>
                      <input
                        type="text"
                        value={activeCase.caseNumber}
                        onChange={e => handleUpdateActiveCase("caseNumber", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Intitulé de l'Affaire / Braquage / Opération</label>
                      <input
                        type="text"
                        value={activeCase.title}
                        onChange={e => handleUpdateActiveCase("title", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut du Dossier</label>
                      <select
                        value={activeCase.status}
                        onChange={e => handleUpdateActiveCase("status", e.target.value)}
                      >
                        {Object.entries(STATUS_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    className="form-row"
                    style={{
                      background: "rgba(59, 130, 246, 0.07)",
                      border: "1px solid rgba(223, 181, 86, 0.3)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 14
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: "var(--gold-seal)" }}>
                        <i className="fas fa-signature" style={{ marginRight: 5 }}></i>
                        Agent qui signe / Rédacteur
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 16 | Vance Winchester"
                        value={activeCase.leadAgent ?? ""}
                        onChange={e => handleUpdateActiveCase("leadAgent", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>
                        <i className="fas fa-stamp" style={{ marginRight: 5 }}></i>
                        Visa Commandement / DOJ
                      </label>
                      <input
                        type="text"
                        placeholder="Optionnel (Ex: Cdt. Miller / Procureur)"
                        value={activeCase.commandVisa || ""}
                        onChange={e => handleUpdateActiveCase("commandVisa", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Division LSPD</label>
                      <input
                        type="text"
                        value={activeCase.division || ""}
                        onChange={e => handleUpdateActiveCase("division", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Date & Heure</label>
                      <input
                        type="text"
                        value={activeCase.createdAt || ""}
                        onChange={e => handleUpdateActiveCase("createdAt", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Suspect / Cible Principale</label>
                      <input
                        type="text"
                        value={activeCase.targetName}
                        onChange={e => handleUpdateActiveCase("targetName", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Groupe / Gang / Organisation</label>
                      <input
                        type="text"
                        value={activeCase.targetGroup}
                        onChange={e => handleUpdateActiveCase("targetGroup", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Lieu / Établissement</label>
                      <input
                        type="text"
                        value={activeCase.location}
                        onChange={e => handleUpdateActiveCase("location", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Priorité</label>
                      <select
                        value={activeCase.priority}
                        onChange={e => handleUpdateActiveCase("priority", e.target.value)}
                      >
                        {Object.entries(PRIORITY_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SUSPECTS & PREUVES / SCELLÉS */}
                  <div className="form-row" style={{ marginTop: 4 }}>
                    <div className="add-article-section" style={{ flex: 1, marginBottom: 0 }}>
                      <div className="add-article-title">
                        <i className="fas fa-users-viewfinder"></i> Personnes d'intérêt & Suspects ({(activeCase.suspects || []).length})
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          placeholder="Nom RP du suspect..."
                          value={newSuspectName}
                          onChange={e => setNewSuspectName(e.target.value)}
                        />
                        <select
                          className="select"
                          style={{ width: 135, padding: "6px 8px", fontSize: 13 }}
                          value={newSuspectStatus}
                          onChange={e => setNewSuspectStatus(e.target.value)}
                        >
                          <option value="Recherché">Recherché</option>
                          <option value="Sous surveillance">Surveillance</option>
                          <option value="En garde à vue">Garde à vue</option>
                          <option value="Condamné">Condamné</option>
                        </select>
                        <button type="button" className="btn btn-sm btn-primary" onClick={handleAddSuspect}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(activeCase.suspects || []).map((s, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                              fontSize: 13
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <strong>{s.name}</strong>
                              <select
                                className="select"
                                style={{ padding: "2px 6px", fontSize: 11.5, width: "auto" }}
                                value={s.status}
                                onChange={e => {
                                  const nextList = (activeCase.suspects || []).map((item, i) =>
                                    i === idx ? { ...item, status: e.target.value } : item
                                  );
                                  handleUpdateActiveCase("suspects", nextList);
                                }}
                              >
                                <option value="Recherché">Recherché</option>
                                <option value="Sous surveillance">Surveillance</option>
                                <option value="En garde à vue">Garde à vue</option>
                                <option value="Condamné">Condamné</option>
                                <option value="Cible principale">Cible principale</option>
                                <option value="Mis en cause">Mis en cause</option>
                              </select>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                style={{ padding: "2px 7px", fontSize: 11 }}
                                onClick={() => onSendSuspectToCalculator(s.name)}
                              >
                                <i className="fas fa-gavel"></i> Peine
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ padding: "2px 7px", fontSize: 11 }}
                                onClick={() => handleRemoveSuspect(idx)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="add-article-section" style={{ flex: 1, marginBottom: 0 }}>
                      <div className="add-article-title">
                        <i className="fas fa-boxes-stacked"></i> Preuves & Scellés rattachés ({(activeCase.evidence || []).length})
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          placeholder="Ajouter une preuve, arme saisie, otage, photo..."
                          value={newEvidenceLabel}
                          onChange={e => setNewEvidenceLabel(e.target.value)}
                        />
                        <button type="button" className="btn btn-sm btn-primary" onClick={handleAddEvidence}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(activeCase.evidence || []).map((ev, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                              fontSize: 13
                            }}
                          >
                            <div>
                              <span className="mono" style={{ color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>
                                [{ev.code}]
                              </span>
                              <span>{ev.label}</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              style={{ padding: "2px 7px", fontSize: 11 }}
                              onClick={() => handleRemoveEvidence(idx)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EDITABLE TEMPLATE REPORT */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2>
                    <i className="fas fa-file-contract"></i> Rapport & Template du Dossier (100% Modifiable & Copiable)
                  </h2>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className="select"
                      style={{ width: 290, padding: "5px 10px", fontSize: 13 }}
                      value={activeCase.templateId || ""}
                      onChange={e => {
                        handleUpdateActiveCase("templateId", e.target.value);
                        handleApplyTemplateToActiveCase(e.target.value);
                      }}
                    >
                      {LSPD_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.category}] {t.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleApplyTemplateToActiveCase(activeCase.templateId || LSPD_TEMPLATES[0].id)}
                    >
                      <i className="fas fa-arrows-rotate"></i> Actualiser Template
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                      onClick={() =>
                        setPrintPayload({
                          caseId: activeCase.id,
                          title: activeCase.title,
                          docNumber: activeCase.caseNumber,
                          date: (activeCase.createdAt || "").split(" ")[0] || meta?.date,
                          agent: activeCase.leadAgent || meta?.agent,
                          commandVisa: activeCase.commandVisa || "",
                          prevenu: activeCase.targetName,
                          reportText: activeCase.reportText
                        })
                      }
                      title="Imprimer ce dossier en jeu (Feuille Papier A4 LSPD + Lien .PNG direct)"
                    >
                      <i className="fas fa-print"></i> Imprimer en jeu
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCopyText("active_case_report", activeCase.reportText)}
                    >
                      <i className={`fas fa-${copiedId === "active_case_report" ? "check" : "copy"}`}></i>
                      {copiedId === "active_case_report" ? "Rapport copié !" : "Copier le Rapport"}
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <textarea
                    rows={22}
                    className="textarea"
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      padding: 16
                    }}
                    value={activeCase.reportText}
                    onChange={e => handleUpdateActiveCase("reportText", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL IMPRESSION EN JEU (FEUILLE PAPIER A4 LSPD + LIEN DIRECT IMPRIMANTE FIVEM) */}
      <PrintReportModal
        isOpen={Boolean(printPayload)}
        onClose={() => setPrintPayload(null)}
        title={printPayload?.title}
        docNumber={printPayload?.docNumber}
        date={printPayload?.date}
        agent={printPayload?.agent}
        initialCommandVisa={printPayload?.commandVisa || ""}
        prevenu={printPayload?.prevenu}
        reportText={printPayload?.reportText}
        onSaveChanges={
          printPayload?.caseId
            ? ({ agent: nextAgent, commandVisa: nextVisa, docNumber: nextDoc, reportText: nextText }) => {
                handlePatchCaseById(printPayload.caseId, {
                  leadAgent: nextAgent,
                  commandVisa: nextVisa,
                  caseNumber: nextDoc,
                  reportText: nextText
                });
              }
            : undefined
        }
      />

      {/* MODAL CRÉATION DOSSIER */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div className="card" style={{ maxWidth: 660, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-folder-plus"></i> Ouvrir un Nouveau Dossier (Braquage, Enquête, Mandat...)
              </h2>
              <button className="btn btn-sm btn-outline" onClick={() => setShowNewModal(false)}>
                Fermer
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateCase}>
                <div className="form-group">
                  <label>Template Officiel LSPD / DOJ à utiliser</label>
                  <select
                    value={newForm.templateId}
                    onChange={e => {
                      const tpl = LSPD_TEMPLATES.find(t => t.id === e.target.value);
                      setNewForm(p => ({
                        ...p,
                        templateId: e.target.value,
                        division: tpl ? tpl.defaultDivision : p.division,
                        priority: tpl ? tpl.defaultPriority : p.priority
                      }));
                    }}
                  >
                    {LSPD_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.category}] {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° de Dossier</label>
                    <input
                      type="text"
                      value={newForm.caseNumber}
                      onChange={e => setNewForm(p => ({ ...p, caseNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.8 }}>
                    <label>Intitulé de l'Affaire / Braquage</label>
                    <input
                      type="text"
                      placeholder="Ex: Braquage Fleeca Hawick / Supérette Strawberry..."
                      value={newForm.title}
                      onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Agent rédacteur / Signataire</label>
                    <input
                      type="text"
                      placeholder="Ex: 16 | Vance Winchester"
                      value={newForm.leadAgent}
                      onChange={e => setNewForm(p => ({ ...p, leadAgent: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Suspect / Cible (RP)</label>
                    <input
                      type="text"
                      placeholder="Ex: Mike Armstrong ou Contre X"
                      value={newForm.targetName}
                      onChange={e => setNewForm(p => ({ ...p, targetName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Organisation / Gang</label>
                    <input
                      type="text"
                      placeholder="Ex: Indépendant / Gang..."
                      value={newForm.targetGroup}
                      onChange={e => setNewForm(p => ({ ...p, targetGroup: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Lieu / Établissement</label>
                    <input
                      type="text"
                      placeholder="Ex: Banque Fleeca / Supérette 24/7"
                      value={newForm.location}
                      onChange={e => setNewForm(p => ({ ...p, location: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Division LSPD</label>
                    <input
                      type="text"
                      value={newForm.division}
                      onChange={e => setNewForm(p => ({ ...p, division: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowNewModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-check"></i> Créer & Générer le Dossier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
