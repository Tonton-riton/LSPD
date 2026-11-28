import React, { useState, useMemo, useEffect } from "react";
import { formatMinutesToHours } from "../utils/formulaEngine";
import { LSPD_TEMPLATES } from "../data/lspdTemplates";
import { buildArrestReportText } from "../utils/buildArrestReportText";
import { syncSigningAgentInText } from "../utils/generatePrintableReport";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";
import PrintReportModal from "./PrintReportModal";

export const REPORT_DOJ_STATUS_META = {
  draft:             { label: "Brouillon LSPD",          color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", icon: "file-pen" },
  submitted:         { label: "Transmis au DOJ",         color: "#38bdf8", bg: "rgba(56, 189, 248, 0.16)",  icon: "paper-plane" },
  approved:          { label: "Validé par le DOJ",       color: "#00e676", bg: "rgba(0, 230, 118, 0.16)",   icon: "circle-check" },
  changes_requested: { label: "Complément requis (DOJ)", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)",  icon: "triangle-exclamation" },
  rejected:          { label: "Refusé par le DOJ",       color: "#ef4444", bg: "rgba(239, 68, 68, 0.16)",   icon: "circle-xmark" }
};

export default function ReportsView({
  reports = [],
  activeReportId,
  setActiveReportId,
  onSaveReport,
  onDeleteReport,
  onRefreshReports,
  onOpenCalculator,
  meta,
  summary,
  config,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [criminalFilter, setCriminalFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "agent_asc" | "agent_desc" | "criminal_asc" | "criminal_desc" | "fine_desc"
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [showMirandaDrawer, setShowMirandaDrawer] = useState(false);

  // Local editable draft synced with selected report
  const activeReport = useMemo(
    () => reports.find(r => r.id === activeReportId) || reports[0] || null,
    [reports, activeReportId]
  );

  const [draft, setDraft] = useState(null);
  const draftDirtyRef = React.useRef(false);
  const lastReportIdRef = React.useRef(null);

  // Intervention detail helpers (for quick text regeneration)
  const [lieu, setLieu] = useState("Los Santos");
  const [unites, setUnites] = useState("");
  const [identite, setIdentite] = useState("Carte d'identité vérifiée");
  const [attitude, setAttitude] = useState("Coopératif");
  const [miranda, setMiranda] = useState("Lus et compris au poste de police (Art. 123)");
  const [nomAvocat, setNomAvocat] = useState("");
  const [objetsSaisis, setObjetsSaisis] = useState("");
  const [circonstances, setCirconstances] = useState("");

  useEffect(() => {
    if (!activeReport) {
      setDraft(null);
      lastReportIdRef.current = null;
      draftDirtyRef.current = false;
      return;
    }
    const switchedReport = lastReportIdRef.current !== activeReport.id;
    lastReportIdRef.current = activeReport.id;

    if (switchedReport || !draftDirtyRef.current) {
      draftDirtyRef.current = false;
      setDraft({ ...activeReport });
    } else {
      // L'agent est en train de taper : on fusionne uniquement les retours DOJ sans écraser sa saisie
      setDraft(prev =>
        prev
          ? {
              ...prev,
              dojStatus: activeReport.dojStatus,
              dojReviewerName: activeReport.dojReviewerName,
              dojReviewerRank: activeReport.dojReviewerRank,
              dojComment: activeReport.dojComment,
              dojReviewedAt: activeReport.dojReviewedAt,
              commandVisa: activeReport.dojStatus === "approved" ? activeReport.commandVisa : prev.commandVisa
            }
          : { ...activeReport }
      );
    }
  }, [activeReport?.id, activeReport?.updatedAt]);

  const agentOptions = useMemo(() => {
    const counts = new Map();
    reports.forEach(r => {
      const name = (r.authorName || "Inconnu").trim();
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [reports]);

  const criminalOptions = useMemo(() => {
    const counts = new Map();
    reports.forEach(r => {
      const name = (r.prevenu || "Non renseigné").trim();
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = reports.filter(r => {
      if (statusFilter !== "ALL" && (r.dojStatus || "draft") !== statusFilter) return false;
      if (agentFilter !== "ALL" && (r.authorName || "Inconnu").trim() !== agentFilter) return false;
      if (criminalFilter !== "ALL" && (r.prevenu || "Non renseigné").trim() !== criminalFilter) return false;
      if (!q) return true;
      return (
        (r.reportNumber || "").toLowerCase().includes(q) ||
        (r.prevenu || "").toLowerCase().includes(q) ||
        (r.authorName || "").toLowerCase().includes(q) ||
        (r.dojComment || "").toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    if (sortBy === "agent_asc") {
      sorted.sort((a, b) => (a.authorName || "").localeCompare(b.authorName || "", "fr"));
    } else if (sortBy === "agent_desc") {
      sorted.sort((a, b) => (b.authorName || "").localeCompare(a.authorName || "", "fr"));
    } else if (sortBy === "criminal_asc") {
      sorted.sort((a, b) => (a.prevenu || "").localeCompare(b.prevenu || "", "fr"));
    } else if (sortBy === "criminal_desc") {
      sorted.sort((a, b) => (b.prevenu || "").localeCompare(a.prevenu || "", "fr"));
    } else if (sortBy === "fine_desc") {
      sorted.sort((a, b) => (Number(b.amendeRetenue) || 0) - (Number(a.amendeRetenue) || 0));
    }
    return sorted;
  }, [reports, searchQuery, statusFilter, agentFilter, criminalFilter, sortBy]);

  const handleCreateBlankReport = async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const num = `LSPD-RA-${Math.floor(1000 + Math.random() * 8999)}`;
    const defaultAgent =
      currentUser
        ? `${currentUser.matricule ? currentUser.matricule + " | " : ""}${currentUser.fullName}`
        : meta?.agent || "16 | Vance Winchester";

    const reportText = buildArrestReportText({
      templateId: "standard",
      reportNumber: num,
      date: dateStr,
      heure: heureStr,
      agent: defaultAgent,
      prevenu: meta?.prevenu || "Nom du prévenu"
    });

    const created = await onSaveReport({
      reportNumber: num,
      authorName: defaultAgent,
      prevenu: meta?.prevenu || "Nom du prévenu",
      date: dateStr,
      heure: heureStr,
      templateId: "standard",
      palierRetenu: "NOMINALE",
      amendeRetenue: 0,
      peineMinutes: 0,
      rowsSnapshot: [],
      reportText,
      notes: "",
      commandVisa: "",
      dojStatus: "draft"
    });
    if (created?.id) setActiveReportId(created.id);
  };

  const handlePersistDraft = async (overridePatch = {}) => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = { ...draft, ...overridePatch };
      const saved = await onSaveReport(payload);
      draftDirtyRef.current = false;
      if (saved) setDraft(saved);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateText = (nextTemplateId) => {
    if (!draft) return;
    const tplId = nextTemplateId ?? draft.templateId ?? "standard";
    const regenerated = buildArrestReportText({
      templateId: tplId,
      reportNumber: draft.reportNumber,
      date: draft.date,
      heure: draft.heure,
      agent: draft.authorName,
      prevenu: draft.prevenu,
      lieuInterpellation: lieu,
      unitesPresentes: unites,
      statutIdentite: identite,
      attitudeSuspect: attitude,
      statutMiranda: miranda,
      hasAvocat: (draft.rowsSnapshot || []).some(r => r.avocat),
      nomAvocat,
      avocatMultiplier: config?.avocatMultiplier ?? 0.9,
      objetsSaisis,
      circonstancesFaits: circonstances,
      notes: draft.notes,
      palierRetenu: draft.palierRetenu,
      amendeRetenue: draft.amendeRetenue,
      peineMinutes: draft.peineMinutes,
      rowsSnapshot: draft.rowsSnapshot || []
    });
    setDraft(prev => ({ ...prev, templateId: tplId, reportText: regenerated }));
  };

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text || "");
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stMeta = REPORT_DOJ_STATUS_META[draft?.dojStatus || "draft"] || REPORT_DOJ_STATUS_META.draft;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TOP BAR */}
      <div className="card">
        <div
          className="card-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <h2 style={{ margin: 0 }}>
              Rapports d'Arrestation & Transfert DOJ ({reports.length})
            </h2>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${showMirandaDrawer ? "btn-primary" : "btn-outline"}`}
              onClick={() => setShowMirandaDrawer(s => !s)}
            >
              <i className="fas fa-scroll"></i> Droits Miranda (N3)
            </button>
            {onRefreshReports && (
              <button type="button" className="btn btn-sm btn-outline" onClick={onRefreshReports}>
                <i className="fas fa-arrows-rotate"></i> Actualiser
              </button>
            )}
            <button type="button" className="btn btn-sm btn-outline" onClick={onOpenCalculator}>
              <i className="fas fa-calculator"></i> Calculateur de Peines
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleCreateBlankReport}>
              <i className="fas fa-plus-circle"></i> Nouveau Rapport
            </button>
          </div>
        </div>
      </div>

      {/* DROITS MIRANDA RAPIDE (COLLAPSIBLE) */}
      {showMirandaDrawer && (
        <div className="card" style={{ borderColor: "rgba(223, 181, 86, 0.45)" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>
              <i className="fas fa-scroll" style={{ color: "var(--gold-seal)" }}></i> Droits Constitutionnels Miranda (Cellule N3)
            </h2>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => handleCopy("miranda_quick", summary?.mirandaText || "")}
            >
              <i className={`fas fa-${copiedId === "miranda_quick" ? "check" : "copy"}`}></i>
              {copiedId === "miranda_quick" ? "Copié !" : "Copier Miranda"}
            </button>
          </div>
          <div className="card-body">
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Rajdhani', sans-serif", fontSize: 15, lineHeight: 1.6, margin: 0, color: "var(--text-primary)" }}>
              {summary?.mirandaText || "Vous avez le droit de garder le silence..."}
            </pre>
          </div>
        </div>
      )}

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* LEFT: SHARED REPORTS REGISTRY */}
        <div className="card">
          <div className="card-header">
            <h2>
              <i className="fas fa-folder-open"></i> Registre des Rapports ({filteredReports.length})
            </h2>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="text"
              className="input"
              placeholder="Rechercher N° rapport, prévenu, agent..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <select
              className="select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tous les statuts ({reports.length})</option>
              {Object.entries(REPORT_DOJ_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select
                className="select"
                style={{ fontSize: 12.5, padding: "6px 8px" }}
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                title="Filtrer par Agent"
              >
                <option value="ALL">Tous les agents</option>
                {agentOptions.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </select>

              <select
                className="select"
                style={{ fontSize: 12.5, padding: "6px 8px" }}
                value={criminalFilter}
                onChange={e => setCriminalFilter(e.target.value)}
                title="Filtrer par Criminel / Prévenu"
              >
                <option value="ALL">Tous les criminels</option>
                {criminalOptions.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                className="select"
                style={{ fontSize: 12.5, padding: "6px 8px", flex: 1 }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                title="Trier les rapports"
              >
                <option value="recent">Tri : Plus récents</option>
                <option value="agent_asc">Tri : Par Agent (A → Z)</option>
                <option value="agent_desc">Tri : Par Agent (Z → A)</option>
                <option value="criminal_asc">Tri : Par Criminel (A → Z)</option>
                <option value="criminal_desc">Tri : Par Criminel (Z → A)</option>
                <option value="fine_desc">Tri : Par Amende (Décroissant)</option>
              </select>

              {(agentFilter !== "ALL" || criminalFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setAgentFilter("ALL");
                    setCriminalFilter("ALL");
                    setStatusFilter("ALL");
                    setSearchQuery("");
                    setSortBy("recent");
                  }}
                  title="Réinitialiser tous les filtres"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "68vh", overflowY: "auto" }}>
              {filteredReports.map(rep => {
                const isSelected = activeReport?.id === rep.id;
                const st = REPORT_DOJ_STATUS_META[rep.dojStatus || "draft"] || REPORT_DOJ_STATUS_META.draft;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setActiveReportId(rep.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--bg-secondary)",
                      border: `1px solid ${isSelected ? "var(--gold-seal)" : "var(--border)"}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                        {rep.reportNumber}
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
                        <i className={`fas fa-${st.icon}`} style={{ marginRight: 4 }}></i>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                      {rep.prevenu || "Prévenu non renseigné"}
                    </div>

                    <div style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>
                        ${Number(rep.amendeRetenue || 0).toLocaleString()}
                      </span>
                      <span style={{ color: "var(--blue)", fontWeight: 700 }}>
                        {formatMinutesToHours(rep.peineMinutes || 0)} ({rep.palierRetenu || "NOMINALE"})
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span>
                        <i className="fas fa-signature" style={{ marginRight: 4, color: "var(--gold-seal)" }}></i>
                        {rep.authorName || "LSPD"}
                      </span>
                      <span>{rep.date} {rep.heure}</span>
                    </div>

                    {rep.dojComment && (
                      <div
                        style={{
                          fontSize: 11.5,
                          padding: "5px 8px",
                          borderRadius: 5,
                          background: "rgba(245, 158, 11, 0.12)",
                          borderLeft: `3px solid ${st.color}`,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        <strong>DOJ :</strong> {rep.dojComment}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredReports.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                  <p style={{ marginBottom: 10 }}>Aucun rapport d'arrestation enregistré.</p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleCreateBlankReport}>
                    <i className="fas fa-plus"></i> Créer un premier rapport
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: REPORT EDITOR + DOJ STATUS + PRINT */}
        {draft ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* BANDEAU RETOUR / DÉCISION DOJ */}
            {draft.dojStatus && draft.dojStatus !== "draft" && (
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: 10,
                  background: stMeta.bg,
                  border: `1.5px solid ${stMeta.color}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: stMeta.color }}>
                    <i className={`fas fa-${stMeta.icon}`} style={{ marginRight: 8 }}></i>
                    STATUT DOJ : {stMeta.label.toUpperCase()}
                  </span>
                  {draft.dojReviewerName && (
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)" }}>
                      Revu par : <strong>{draft.dojReviewerName}</strong> {draft.dojReviewedAt ? `• ${draft.dojReviewedAt}` : ""}
                    </span>
                  )}
                </div>

                {draft.dojComment && (
                  <div
                    style={{
                      background: "rgba(5, 10, 20, 0.55)",
                      padding: "10px 12px",
                      borderRadius: 6,
                      color: "#ffffff",
                      fontSize: 14,
                      lineHeight: 1.5
                    }}
                  >
                    <strong style={{ color: stMeta.color }}>Explication / Retour du DOJ :</strong> {draft.dojComment}
                  </div>
                )}

                {draft.dojStatus === "changes_requested" && (
                  <div style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6, color: "#fbbf24" }}></i>
                    Corrigez les éléments demandés ci-dessous puis cliquez sur <strong>« Re-transférer au DOJ »</strong>.
                  </div>
                )}
              </div>
            )}

            {/* METADATA & SIGNATURES CARD */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 22, height: 22, objectFit: "contain" }} />
                  <span>Rapport {draft.reportNumber} — {draft.prevenu || "Sans prévenu"}</span>
                </h2>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={saving}
                    onClick={() => handlePersistDraft()}
                  >
                    <i className={`fas fa-${saving ? "spinner fa-spin" : "floppy-disk"}`}></i> Enregistrer
                  </button>

                  {draft.dojStatus !== "approved" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={saving}
                      style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderColor: "var(--gold-seal)" }}
                      onClick={() => handlePersistDraft({ dojStatus: "submitted" })}
                    >
                      <i className="fas fa-paper-plane"></i>{" "}
                      {draft.dojStatus === "changes_requested" || draft.dojStatus === "rejected"
                        ? "Re-transférer au DOJ"
                        : draft.dojStatus === "submitted"
                        ? "Mettre à jour & Maintenir au DOJ"
                        : "Transférer au DOJ"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                    onClick={() => setShowPrintModal(true)}
                  >
                    <i className="fas fa-print"></i> Imprimer en jeu
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onDeleteReport(draft.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div
                  className="form-row"
                  style={{
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(223, 181, 86, 0.35)",
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
                      value={draft.authorName || ""}
                      onChange={e => {
                        const v = e.target.value;
                        setDraft(p => ({
                          ...p,
                          authorName: v,
                          reportText: syncSigningAgentInText(p.reportText, v)
                        }));
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>
                      <i className="fas fa-gavel" style={{ marginRight: 5 }}></i>
                      Visa Commandement / DOJ
                    </label>
                    <input
                      type="text"
                      placeholder="Rempli automatiquement si validé DOJ"
                      value={draft.commandVisa || ""}
                      onChange={e => setDraft(p => ({ ...p, commandVisa: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>N° Rapport</label>
                    <input
                      type="text"
                      value={draft.reportNumber || ""}
                      onChange={e => setDraft(p => ({ ...p, reportNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Prévenu (RP)</label>
                    <input
                      type="text"
                      value={draft.prevenu || ""}
                      onChange={e => setDraft(p => ({ ...p, prevenu: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="text"
                      value={draft.date || ""}
                      onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Heure</label>
                    <input
                      type="text"
                      value={draft.heure || ""}
                      onChange={e => setDraft(p => ({ ...p, heure: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amende ($) / Prison (min)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        value={draft.amendeRetenue ?? 0}
                        onChange={e => setDraft(p => ({ ...p, amendeRetenue: Number(e.target.value) || 0 }))}
                        title="Amende retenue ($)"
                      />
                      <input
                        type="number"
                        value={draft.peineMinutes ?? 0}
                        onChange={e => setDraft(p => ({ ...p, peineMinutes: Number(e.target.value) || 0 }))}
                        title="Peine prison (minutes)"
                      />
                    </div>
                  </div>
                </div>

                {/* DÉTAILS D'INTERVENTION OPTIONNELS POUR RÉGÉNÉRATION AUTO */}
                <div className="add-article-section" style={{ marginBottom: 0 }}>
                  <div
                    className="add-article-title"
                    style={{ justifyContent: "space-between", cursor: "pointer", marginBottom: showDetailsForm ? 12 : 0 }}
                    onClick={() => setShowDetailsForm(s => !s)}
                  >
                    <span>
                      <i className="fas fa-clipboard-list"></i> Assistant de rédaction LSPD (Lieu, Unités, Miranda, Saisies, Récit)
                    </span>
                    <span className="brand-badge">
                      {showDetailsForm ? "Masquer" : "Afficher & Régénérer"}
                    </span>
                  </div>

                  {showDetailsForm && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Lieu d'interpellation</label>
                          <input type="text" value={lieu} onChange={e => setLieu(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Unités présentes</label>
                          <input type="text" placeholder="Ex: Lincoln-16, Adam-12" value={unites} onChange={e => setUnites(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Identité</label>
                          <select value={identite} onChange={e => setIdentite(e.target.value)}>
                            <option value="Carte d'identité vérifiée">Carte d'identité vérifiée</option>
                            <option value="Empreintes digitales relevées au poste">Empreintes digitales</option>
                            <option value="Refus d'identification (Art. 305)">Refus d'identification</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Attitude du suspect</label>
                          <select value={attitude} onChange={e => setAttitude(e.target.value)}>
                            <option value="Coopératif">Coopératif</option>
                            <option value="Peu coopératif / Réticent">Peu coopératif</option>
                            <option value="Hostile / Virulent / Outrage">Hostile / Outrage</option>
                            <option value="Tentative de fuite / Rébellion">Fuite / Rébellion</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Droits Miranda (Art. 123)</label>
                          <input type="text" value={miranda} onChange={e => setMiranda(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>Avocat</label>
                          <input type="text" placeholder="Me ... (optionnel)" value={nomAvocat} onChange={e => setNomAvocat(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Objets saisis / Scellés</label>
                        <input type="text" placeholder="Ex: 1x Pistolet 9mm, 12x Pochons..." value={objetsSaisis} onChange={e => setObjetsSaisis(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Récit des faits (Cause probable — Art. 117-5)</label>
                        <textarea rows={3} value={circonstances} onChange={e => setCirconstances(e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => handleRegenerateText()}>
                        <i className="fas fa-wand-magic-sparkles"></i> Régénérer le texte du rapport avec ces infos
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* EDITABLE REPORT TEXT CARD */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2>
                  <i className="fas fa-file-shield"></i> Texte du Rapport (100% Modifiable & Copiable)
                </h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="select"
                    style={{ width: 260, padding: "5px 10px", fontSize: 13 }}
                    value={draft.templateId || "standard"}
                    onChange={e => handleRegenerateText(e.target.value)}
                  >
                    <option value="standard">Rapport d'Arrestation LSPD Standard (Art. 117-5 & 123)</option>
                    {LSPD_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>[{t.category}] {t.title}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => handleCopy("report_text", draft.reportText)}
                  >
                    <i className={`fas fa-${copiedId === "report_text" ? "check" : "copy"}`}></i>
                    {copiedId === "report_text" ? "Copié !" : "Copier le texte"}
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
                  value={draft.reportText || ""}
                  onChange={e => {
                    draftDirtyRef.current = true;
                    setDraft(p => ({ ...p, reportText: e.target.value }));
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body empty-state">
              <i className="fas fa-file-shield"></i>
              <p>Sélectionnez un rapport à gauche, créez-en un nouveau, ou envoyez un calcul depuis le Calculateur de Peines.</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL IMPRESSION EN JEU */}
      <PrintReportModal
        isOpen={showPrintModal && Boolean(draft)}
        onClose={() => setShowPrintModal(false)}
        title={
          draft?.templateId && draft.templateId !== "standard"
            ? (LSPD_TEMPLATES.find(t => t.id === draft.templateId)?.title || "RAPPORT D'INTERVENTION LSPD")
            : "RAPPORT D'ARRESTATION & PROCÈS-VERBAL (ART. 123)"
        }
        docNumber={draft?.reportNumber || "LSPD-RA-2026"}
        date={draft?.date}
        agent={draft?.authorName}
        initialCommandVisa={draft?.commandVisa || ""}
        prevenu={draft?.prevenu}
        reportText={draft?.reportText || ""}
        dojDecision={
          draft && ["approved", "changes_requested", "rejected"].includes(draft.dojStatus)
            ? {
                status: draft.dojStatus,
                reviewerName: draft.dojReviewerName || draft.commandVisa || "Magistrat DOJ",
                comment: draft.dojComment || "",
                reviewedAt: draft.dojReviewedAt || ""
              }
            : null
        }
        stampTopText={
          ["approved", "changes_requested", "rejected"].includes(draft?.dojStatus)
            ? "DOJ • SAN ANDREAS"
            : "LSPD • SAN ANDREAS"
        }
        stampMainText={
          draft?.dojStatus === "approved"
            ? "VALIDÉ PAR LE DOJ"
            : draft?.dojStatus === "rejected"
            ? "REFUSÉ PAR LE DOJ"
            : draft?.dojStatus === "changes_requested"
            ? "COMPLÉMENT REQUIS"
            : "CERTIFIÉ CONFORME"
        }
        statusLabel={
          draft?.dojStatus === "approved"
            ? "VALIDÉ DOJ"
            : draft?.dojStatus === "rejected"
            ? "REFUSÉ DOJ"
            : draft?.dojStatus === "changes_requested"
            ? "COMPLÉMENT DOJ"
            : "OFFICIEL LSPD"
        }
        onSaveChanges={({ agent: nextAgent, commandVisa: nextVisa, docNumber: nextDoc, reportText: nextText }) => {
          if (!draft) return;
          const patched = {
            ...draft,
            authorName: nextAgent,
            commandVisa: nextVisa,
            reportNumber: nextDoc,
            ...(nextText ? { reportText: nextText } : {})
          };
          setDraft(patched);
          onSaveReport(patched);
        }}
      />
    </div>
  );
}
