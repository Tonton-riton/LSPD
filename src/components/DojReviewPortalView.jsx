import React, { useState, useMemo, useEffect } from "react";
import { formatMinutesToHours } from "../utils/formulaEngine";
import { REPORT_DOJ_STATUS_META } from "./ReportsView";
import PrintReportModal from "./PrintReportModal";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";

const DOJ_REQ_STATUS_META = {
  draft:             { label: "Brouillon",              color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)" },
  submitted:         { label: "Transmis au DOJ",        color: "#38bdf8", bg: "rgba(56, 189, 248, 0.16)" },
  pending:           { label: "En étude DOJ",           color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  approved:          { label: "Mandat Approuvé DOJ",    color: "#00e676", bg: "rgba(0, 230, 118, 0.16)" },
  changes_requested: { label: "Complément requis",      color: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)" },
  rejected:          { label: "Mandat Refusé",          color: "#ef4444", bg: "rgba(239, 68, 68, 0.16)" },
  executed:          { label: "Exécuté",                color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)" }
};

const QUICK_COMMENTS_REPORT = [
  "Rapport complet, procédure conforme (Art. 117-5 & 123). Validé par le DOJ.",
  "Il manque l'heure précise de lecture des droits Miranda et la confirmation de compréhension (Art. 123).",
  "Il manque l'inventaire détaillé des objets saisis et scellés (Art. 146 & 147).",
  "La cause probable / circonstances de l'interpellation doivent être davantage détaillées (Art. 117-5).",
  "Incohérence entre les chefs d'accusation retenus et la peine / amende appliquée."
];

const QUICK_COMMENTS_WARRANT = [
  "Base légale et cause probable établies (Art. 151 & 158). Mandat approuvé — Exécution autorisée dans les limites fixées.",
  "Cause probable insuffisante (Art. 151-1) : merci de joindre des preuves visuelles / témoignages supplémentaires.",
  "Désignation du lieu / périmètre ou des véhicules trop imprécise (Art. 151-4 & 158-3).",
  "Il manque les pièces photographiques (photos QG, plaques, armes observées) pour étayer la demande de descente.",
  "Mesure disproportionnée en l'état (Art. 151-3) : privilégier un mandat de surveillance ou de comparution d'abord."
];

export default function DojReviewPortalView({
  reports = [],
  dojRequests = [],
  onReviewReport,
  onReviewDojRequest,
  onRefreshAll,
  currentUser
}) {
  const [queueTab, setQueueTab] = useState("warrants"); // "warrants" | "reports"
  const [filterMode, setFilterMode] = useState("pending"); // "pending" | "all" | "approved" | "changes_requested" | "rejected"
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [criminalFilter, setCriminalFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "agent_asc" | "criminal_asc"
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [zoomedExhibit, setZoomedExhibit] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);

  const pendingReportsCount = useMemo(
    () => reports.filter(r => r.dojStatus === "submitted").length,
    [reports]
  );
  const pendingWarrantsCount = useMemo(
    () => dojRequests.filter(r => r.status === "submitted" || r.status === "pending").length,
    [dojRequests]
  );

  const nonDraftSource = useMemo(() => {
    if (queueTab === "reports") return reports.filter(r => (r.dojStatus || "draft") !== "draft");
    return dojRequests.filter(r => (r.status || "draft") !== "draft");
  }, [queueTab, reports, dojRequests]);

  const dojAgentOptions = useMemo(() => {
    const counts = new Map();
    nonDraftSource.forEach(item => {
      const a = (queueTab === "reports" ? item.authorName : item.leadAgent) || "Inconnu";
      counts.set(a.trim(), (counts.get(a.trim()) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [nonDraftSource, queueTab]);

  const dojCriminalOptions = useMemo(() => {
    const counts = new Map();
    nonDraftSource.forEach(item => {
      const c = (queueTab === "reports" ? item.prevenu : item.targetName) || "Non renseigné";
      counts.set(c.trim(), (counts.get(c.trim()) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [nonDraftSource, queueTab]);

  const filteredItems = useMemo(() => {
    const base = nonDraftSource.filter(item => {
      const st = queueTab === "reports" ? (item.dojStatus || "draft") : (item.status || "draft");
      if (filterMode === "pending") {
        if (queueTab === "reports" ? st !== "submitted" : st !== "submitted" && st !== "pending") return false;
      } else if (filterMode !== "all" && st !== filterMode) {
        return false;
      }
      const agentName = ((queueTab === "reports" ? item.authorName : item.leadAgent) || "Inconnu").trim();
      const crimName = ((queueTab === "reports" ? item.prevenu : item.targetName) || "Non renseigné").trim();
      if (agentFilter !== "ALL" && agentName !== agentFilter) return false;
      if (criminalFilter !== "ALL" && crimName !== criminalFilter) return false;
      return true;
    });

    const sorted = [...base];
    if (sortBy === "agent_asc") {
      sorted.sort((a, b) => {
        const aa = (queueTab === "reports" ? a.authorName : a.leadAgent) || "";
        const bb = (queueTab === "reports" ? b.authorName : b.leadAgent) || "";
        return aa.localeCompare(bb, "fr");
      });
    } else if (sortBy === "criminal_asc") {
      sorted.sort((a, b) => {
        const ca = (queueTab === "reports" ? a.prevenu : a.targetName) || "";
        const cb = (queueTab === "reports" ? b.prevenu : b.targetName) || "";
        return ca.localeCompare(cb, "fr");
      });
    }
    return sorted;
  }, [nonDraftSource, queueTab, filterMode, agentFilter, criminalFilter, sortBy]);

  const activeItem = useMemo(() => {
    return filteredItems.find(i => i.id === selectedId) || filteredItems[0] || null;
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (activeItem) {
      setComment(activeItem.dojComment || "");
    } else {
      setComment("");
    }
  }, [activeItem?.id]);

  const handleDecision = async (decisionStatus) => {
    if (!activeItem) return;
    if ((decisionStatus === "changes_requested" || decisionStatus === "rejected") && !comment.trim()) {
      setFeedbackMsg({
        type: "error",
        text: "Veuillez indiquer une explication (ce qui manque ou le motif du refus) pour l'officier LSPD."
      });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      if (queueTab === "reports") {
        await onReviewReport(activeItem.id, { dojStatus: decisionStatus, dojComment: comment.trim() });
      } else {
        await onReviewDojRequest(activeItem.id, { status: decisionStatus, dojComment: comment.trim() });
      }
      setFeedbackMsg({
        type: "success",
        text:
          decisionStatus === "approved"
            ? "Décision enregistrée : Dossier VALIDÉ avec votre signature officielle DOJ !"
            : decisionStatus === "changes_requested"
            ? "Retour envoyé à l'officier LSPD avec vos explications (Complément requis)."
            : "Décision enregistrée : Dossier REFUSÉ avec votre motif officiel."
      });
      setTimeout(() => setFeedbackMsg(null), 4500);
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message || "Erreur lors de l'enregistrement de la décision." });
    } finally {
      setSubmitting(false);
    }
  };

  const quickChips = queueTab === "reports" ? QUICK_COMMENTS_REPORT : QUICK_COMMENTS_WARRANT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER BAR */}
      <div className="card" style={{ borderColor: "rgba(223, 181, 86, 0.45)" }}>
        <div
          className="card-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <img src={LSPD_LOGO_DATA_URL} alt="LSPD / DOJ" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <button
              type="button"
              className={`btn ${queueTab === "warrants" ? "btn-primary" : "btn-outline"}`}
              onClick={() => {
                setQueueTab("warrants");
                setSelectedId(null);
              }}
            >
              <i className="fas fa-gavel"></i> Demandes de Descente & Mandats
              {pendingWarrantsCount > 0 && (
                <span className="brand-badge" style={{ marginLeft: 6, background: "#f59e0b", color: "#050a14", border: "none" }}>
                  {pendingWarrantsCount} en attente
                </span>
              )}
            </button>
            <button
              type="button"
              className={`btn ${queueTab === "reports" ? "btn-primary" : "btn-outline"}`}
              onClick={() => {
                setQueueTab("reports");
                setSelectedId(null);
              }}
            >
              <i className="fas fa-file-shield"></i> Rapports d'Arrestation transmis
              {pendingReportsCount > 0 && (
                <span className="brand-badge" style={{ marginLeft: 6, background: "#38bdf8", color: "#050a14", border: "none" }}>
                  {pendingReportsCount} en attente
                </span>
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--gold-seal)" }}>
              <i className="fas fa-scale-balanced" style={{ marginRight: 5 }}></i>
              Magistrat connecté : <strong>{currentUser?.rank} {currentUser?.fullName}</strong>
            </span>
            {onRefreshAll && (
              <button type="button" className="btn btn-sm btn-outline" onClick={onRefreshAll}>
                <i className="fas fa-arrows-rotate"></i> Actualiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN REVIEW WORKSPACE */}
      <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        {/* LEFT QUEUE */}
        <div className="card">
          <div className="card-header">
            <h2>
              <i className="fas fa-inbox"></i> File DOJ ({filteredItems.length})
            </h2>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "pending", label: "En attente" },
                { id: "all", label: "Tous" },
                { id: "approved", label: "Validés" },
                { id: "changes_requested", label: "À corriger" },
                { id: "rejected", label: "Refusés" }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  className={`btn btn-sm ${filterMode === f.id ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setFilterMode(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <select
                className="select"
                style={{ fontSize: 12, padding: "5px 7px" }}
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
              >
                <option value="ALL">Tous agents</option>
                {dojAgentOptions.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </select>
              <select
                className="select"
                style={{ fontSize: 12, padding: "5px 7px" }}
                value={criminalFilter}
                onChange={e => setCriminalFilter(e.target.value)}
              >
                <option value="ALL">Tous criminels</option>
                {dojCriminalOptions.map(([name, count]) => (
                  <option key={name} value={name}>{name} ({count})</option>
                ))}
              </select>
            </div>

            <select
              className="select"
              style={{ fontSize: 12, padding: "5px 7px" }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="recent">Tri : Plus récents</option>
              <option value="agent_asc">Tri : Par Agent (A → Z)</option>
              <option value="criminal_asc">Tri : Par Criminel / Cible (A → Z)</option>
            </select>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "62vh", overflowY: "auto" }}>
              {filteredItems.map(item => {
                const isSelected = activeItem?.id === item.id;
                const stKey = queueTab === "reports" ? item.dojStatus : item.status;
                const st =
                  queueTab === "reports"
                    ? REPORT_DOJ_STATUS_META[stKey] || REPORT_DOJ_STATUS_META.submitted
                    : DOJ_REQ_STATUS_META[stKey] || DOJ_REQ_STATUS_META.submitted;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
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
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold-seal)" }}>
                        {queueTab === "reports" ? item.reportNumber : item.requestNumber}
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
                      {queueTab === "reports"
                        ? `Prévenu : ${item.prevenu || "Non renseigné"}`
                        : item.title}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <i className="fas fa-user-shield" style={{ marginRight: 5, color: "var(--accent)" }}></i>
                        {queueTab === "reports" ? item.authorName : item.leadAgent}
                      </span>
                      {queueTab === "reports" ? (
                        <span style={{ color: "var(--green)", fontWeight: 700 }}>
                          ${Number(item.amendeRetenue || 0).toLocaleString()} • {formatMinutesToHours(item.peineMinutes || 0)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--blue)", fontWeight: 700 }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 4 }}></i>
                          {(item.exhibits || []).length} preuve(s)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
                  <i className="fas fa-circle-check" style={{ fontSize: 28, color: "var(--green)", display: "block", marginBottom: 8 }}></i>
                  Aucun dossier dans cette catégorie.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: DOSSIER INSPECTION + DECISION DOJ */}
        {activeItem ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* DECISION PANEL */}
            <div className="card" style={{ borderColor: "var(--gold-seal)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2>
                  <i className="fas fa-gavel" style={{ color: "var(--gold-seal)" }}></i> Décision du Magistrat / Bureau du Procureur
                </h2>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                  onClick={() =>
                    setPrintPayload(
                      queueTab === "reports"
                        ? {
                            title: "RAPPORT D'ARRESTATION & PROCÈS-VERBAL (ART. 123)",
                            docNumber: activeItem.reportNumber,
                            date: activeItem.date,
                            agent: activeItem.authorName,
                            commandVisa: activeItem.commandVisa || "",
                            prevenu: activeItem.prevenu,
                            reportText: activeItem.reportText,
                            exhibits: [],
                            dojDecision: ["approved", "changes_requested", "rejected"].includes(activeItem.dojStatus)
                              ? {
                                  status: activeItem.dojStatus,
                                  reviewerName: activeItem.dojReviewerName || activeItem.commandVisa || "Magistrat DOJ",
                                  comment: activeItem.dojComment || "",
                                  reviewedAt: activeItem.dojReviewedAt || ""
                                }
                              : null,
                            stampTopText: ["approved", "changes_requested", "rejected"].includes(activeItem.dojStatus)
                              ? "DOJ • SAN ANDREAS"
                              : "LSPD • SAN ANDREAS",
                            stampMainText:
                              activeItem.dojStatus === "approved"
                                ? "VALIDÉ PAR LE DOJ"
                                : activeItem.dojStatus === "rejected"
                                ? "REFUSÉ PAR LE DOJ"
                                : activeItem.dojStatus === "changes_requested"
                                ? "COMPLÉMENT REQUIS"
                                : "EN ÉTUDE DOJ",
                            statusLabel: activeItem.dojStatus === "approved" ? "VALIDÉ DOJ" : "TRANSMIS DOJ"
                          }
                        : {
                            title: activeItem.title,
                            docNumber: activeItem.requestNumber,
                            date: (activeItem.createdAt || "").split(" ")[0],
                            agent: activeItem.leadAgent,
                            commandVisa: activeItem.commandVisa || activeItem.dojReviewerName || "",
                            prevenu: activeItem.targetGroup
                              ? `${activeItem.targetName} (${activeItem.targetGroup})`
                              : activeItem.targetName,
                            reportText: activeItem.reportText,
                            exhibits: activeItem.exhibits || [],
                            dojDecision: ["approved", "changes_requested", "rejected"].includes(activeItem.status)
                              ? {
                                  status: activeItem.status,
                                  reviewerName: activeItem.dojReviewerName || activeItem.commandVisa || "Magistrat DOJ",
                                  comment: activeItem.dojComment || "",
                                  reviewedAt: activeItem.dojReviewedAt || ""
                                }
                              : null,
                            stampTopText: ["approved", "changes_requested", "rejected"].includes(activeItem.status)
                              ? "DOJ • SAN ANDREAS"
                              : "LSPD • REQUÊTE DOJ",
                            stampMainText:
                              activeItem.status === "approved"
                                ? "MANDAT APPROUVÉ"
                                : activeItem.status === "rejected"
                                ? "MANDAT REFUSÉ"
                                : activeItem.status === "changes_requested"
                                ? "COMPLÉMENT REQUIS"
                                : "DOSSIER JUDICIAIRE",
                            statusLabel: activeItem.status === "approved" ? "MANDAT APPROUVÉ" : "REQUÊTE DOJ"
                          }
                    )
                  }
                >
                  <i className="fas fa-print"></i> Aperçu / Imprimer en jeu
                </button>
              </div>

              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {feedbackMsg && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: feedbackMsg.type === "success" ? "rgba(0, 230, 118, 0.14)" : "rgba(239, 68, 68, 0.14)",
                      border: `1px solid ${feedbackMsg.type === "success" ? "#00e676" : "#ef4444"}`,
                      color: feedbackMsg.type === "success" ? "#00e676" : "#fca5a5",
                      fontWeight: 700,
                      fontSize: 13.5
                    }}
                  >
                    {feedbackMsg.text}
                  </div>
                )}

                {activeItem.dojReviewerName && (
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    Dernière décision par <strong style={{ color: "var(--gold-seal)" }}>{activeItem.dojReviewerName}</strong>{" "}
                    {activeItem.dojReviewedAt ? `le ${activeItem.dojReviewedAt}` : ""}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--gold-seal)", marginBottom: 6 }}>
                    EXPLICATION / COMMENTAIRE DOJ (Ce qui manque, réserves, ou motif de décision) :
                  </label>
                  <textarea
                    rows={3}
                    className="textarea"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      padding: 12,
                      fontSize: 14
                    }}
                    placeholder="Expliquez ici à l'officier ce qui manque, les réserves imposées ou confirmez la conformité du dossier..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>

                {/* Quick DOJ legal templates */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: 11.5, padding: "4px 9px" }}
                      onClick={() => setComment(prev => (prev.trim() ? `${prev.trim()}\n${chip}` : chip))}
                    >
                      + {chip.slice(0, 52)}...
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={submitting}
                    onClick={() => handleDecision("approved")}
                    style={{ justifyContent: "center", fontWeight: 800 }}
                  >
                    <i className="fas fa-circle-check"></i> Valider & Apposer Visa DOJ
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={submitting}
                    onClick={() => handleDecision("changes_requested")}
                    style={{ justifyContent: "center", borderColor: "#f59e0b", color: "#fbbf24", fontWeight: 800 }}
                  >
                    <i className="fas fa-triangle-exclamation"></i> Demander Complément
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={submitting}
                    onClick={() => handleDecision("rejected")}
                    style={{ justifyContent: "center", fontWeight: 800 }}
                  >
                    <i className="fas fa-circle-xmark"></i> Refuser le Dossier
                  </button>
                </div>
              </div>
            </div>

            {/* EXHIBITS GALLERY FOR WARRANTS */}
            {queueTab === "warrants" && (activeItem.exhibits || []).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h2>
                    <i className="fas fa-images" style={{ color: "var(--gold-seal)" }}></i> Preuves & Pièces à Conviction jointes ({activeItem.exhibits.length})
                  </h2>
                </div>
                <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {activeItem.exhibits.map(ex => {
                    const src = ex.imageData || ex.imageUrl || "";
                    return (
                      <div
                        key={ex.id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          overflow: "hidden"
                        }}
                      >
                        <div style={{ padding: "6px 10px", background: "#0b1930", fontSize: 12, fontWeight: 700, color: "var(--gold-seal)" }} className="mono">
                          [{ex.code}] {ex.source} {ex.date ? `• ${ex.date}` : ""}
                        </div>
                        {src && (
                          <div
                            onClick={() => setZoomedExhibit(ex)}
                            style={{ height: 170, background: "#050b16", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in" }}
                          >
                            <img src={src} alt={ex.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                          </div>
                        )}
                        <div style={{ padding: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{ex.title}</div>
                          {ex.description && (
                            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>{ex.description}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FULL DOCUMENT VIEWER */}
            <div className="card">
              <div className="card-header">
                <h2>
                  <i className="fas fa-file-lines"></i> Contenu complet du Dossier
                </h2>
              </div>
              <div className="card-body">
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 16,
                    color: "var(--text-primary)",
                    margin: 0
                  }}
                >
                  {activeItem.reportText || "(Aucun texte)"}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body empty-state">
              <i className="fas fa-scale-balanced"></i>
              <p>Sélectionnez un rapport ou une demande de descente à gauche pour l'examiner et rendre votre décision DOJ.</p>
            </div>
          </div>
        )}
      </div>

      {/* ZOOM EXHIBIT */}
      {zoomedExhibit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setZoomedExhibit(null)}
        >
          <div className="card" style={{ maxWidth: 960, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>[{zoomedExhibit.code}] {zoomedExhibit.title}</h2>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setZoomedExhibit(null)}>Fermer</button>
            </div>
            <div className="card-body" style={{ textAlign: "center", background: "#050b16" }}>
              <img
                src={zoomedExhibit.imageData || zoomedExhibit.imageUrl}
                alt={zoomedExhibit.title}
                style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
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
        exhibits={printPayload?.exhibits || []}
        dojDecision={printPayload?.dojDecision || null}
        stampTopText={printPayload?.stampTopText}
        stampMainText={printPayload?.stampMainText}
        statusLabel={printPayload?.statusLabel}
      />
    </div>
  );
}
