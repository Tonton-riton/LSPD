import React, { useState, useMemo } from "react";
import { formatMinutesToHours } from "../utils/formulaEngine";
import { getCategoryBadgeClass } from "./CalculatorView";
import PrintReportModal from "./PrintReportModal";
import { syncSigningAgentInText } from "../utils/generatePrintableReport";

function buildFallbackReportFromArchive(item) {
  const charges = (item.rowsSnapshot || [])
    .map(
      (r, idx) =>
        `  ${idx + 1}. [${r.article || "CODE PÉNAL"}] ${r.chefAccusation} (x${r.qte || 1}) — $${Number(r.totalFine || 0).toLocaleString()} / ${formatMinutesToHours(r.totalPeineMinutes || 0)}`
    )
    .join("\n");

  return [
    `╔══════════════════════════════════════════════════════════════════╗`,
    `     LOS SANTOS POLICE DEPARTMENT — RAPPORT D'ARRESTATION (ARCHIVE)`,
    `     RÉFÉRENCE DOSSIER : ${item.id || "LSPD-RA-2026"}`,
    `╚══════════════════════════════════════════════════════════════════╝`,
    ``,
    `[1. INFORMATIONS DU DOSSIER ARCHIVÉ]`,
    `• Date & Heure               : ${item.date || "—"} à ${item.heure || "—"}`,
    `• Agent rédacteur (En charge): ${item.agent || "Officier LSPD"}`,
    `• Prévenu (RP)               : ${item.prevenu || "—"}`,
    ``,
    `[2. CHEFS D'INCULPATION RETENUS]`,
    charges || "  (Aucun chef enregistré)",
    ``,
    `[3. DÉCISION & PEINE PRONONCÉE]`,
    `• Palier appliqué            : ${item.palierRetenu || "NOMINALE"}`,
    `• Amende finale              : $${Number(item.amendeRetenue || 0).toLocaleString()}`,
    `• Peine de prison            : ${formatMinutesToHours(item.peineRetenueMinutes || 0)} (${item.peineRetenueMinutes || 0} min)`,
    ...(item.notes ? [``, `[OBSERVATIONS]`, item.notes] : []),
    ``,
    `Rapport rédigé et certifié exact par : ${item.agent || "Officier LSPD"} — Los Santos Police Department.`
  ].join("\n");
}

export default function DashboardAndHistoryView({
  mode,
  history,
  onClearHistory,
  onDeleteHistoryItem,
  onUpdateHistoryItem,
  onLoadHistoryItem,
  onNavigate,
  infractions,
  aggravantes
}) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [copiedEdit, setCopiedEdit] = useState(false);
  const [printArchiveIdx, setPrintArchiveIdx] = useState(null);
  const [histSearch, setHistSearch] = useState("");
  const [histAgentFilter, setHistAgentFilter] = useState("ALL");
  const [histCriminalFilter, setHistCriminalFilter] = useState("ALL");
  const [histSortBy, setHistSortBy] = useState("recent");

  const histAgentOptions = useMemo(() => {
    const counts = new Map();
    history.forEach(h => {
      const a = (h.agent || "Inconnu").trim();
      counts.set(a, (counts.get(a) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [history]);

  const histCriminalOptions = useMemo(() => {
    const counts = new Map();
    history.forEach(h => {
      const c = (h.prevenu || "Non renseigné").trim();
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [history]);

  const filteredHistoryRows = useMemo(() => {
    const q = histSearch.trim().toLowerCase();
    const indexed = history
      .map((item, origIdx) => ({ item, origIdx }))
      .filter(({ item }) => {
        if (histAgentFilter !== "ALL" && (item.agent || "Inconnu").trim() !== histAgentFilter) return false;
        if (histCriminalFilter !== "ALL" && (item.prevenu || "Non renseigné").trim() !== histCriminalFilter) return false;
        if (!q) return true;
        return (
          (item.id || "").toLowerCase().includes(q) ||
          (item.prevenu || "").toLowerCase().includes(q) ||
          (item.agent || "").toLowerCase().includes(q)
        );
      });

    if (histSortBy === "agent_asc") {
      indexed.sort((a, b) => (a.item.agent || "").localeCompare(b.item.agent || "", "fr"));
    } else if (histSortBy === "agent_desc") {
      indexed.sort((a, b) => (b.item.agent || "").localeCompare(a.item.agent || "", "fr"));
    } else if (histSortBy === "criminal_asc") {
      indexed.sort((a, b) => (a.item.prevenu || "").localeCompare(b.item.prevenu || "", "fr"));
    } else if (histSortBy === "criminal_desc") {
      indexed.sort((a, b) => (b.item.prevenu || "").localeCompare(a.item.prevenu || "", "fr"));
    } else if (histSortBy === "fine_desc") {
      indexed.sort((a, b) => (Number(b.item.amendeRetenue) || 0) - (Number(a.item.amendeRetenue) || 0));
    }
    return indexed;
  }, [history, histSearch, histAgentFilter, histCriminalFilter, histSortBy]);

  const totalAmended = history.reduce((s, h) => s + (Number(h.amendeRetenue) || 0), 0);
  const totalMinutes = history.reduce((s, h) => s + (Number(h.peineRetenueMinutes) || 0), 0);

  const openEditModal = (idx) => {
    const item = history[idx];
    if (!item) return;
    setEditingIdx(idx);
    setEditDraft({
      id: item.id || "",
      date: item.date || "",
      heure: item.heure || "",
      prevenu: item.prevenu || "",
      agent: item.agent || "",
      commandVisa: item.commandVisa || "",
      palierRetenu: item.palierRetenu || "NOMINALE",
      amendeRetenue: item.amendeRetenue ?? 0,
      peineRetenueMinutes: item.peineRetenueMinutes ?? 0,
      notes: item.notes || "",
      reportText: item.reportText || buildFallbackReportFromArchive(item)
    });
  };

  const handleDraftAgentChange = (val) => {
    setEditDraft(prev => ({
      ...prev,
      agent: val,
      reportText: syncSigningAgentInText(prev.reportText, val)
    }));
  };

  const handleSaveEditModal = (e) => {
    e.preventDefault();
    if (editingIdx === null || !editDraft || !onUpdateHistoryItem) return;
    onUpdateHistoryItem(editingIdx, {
      ...editDraft,
      amendeRetenue: Number(editDraft.amendeRetenue) || 0,
      peineRetenueMinutes: Number(editDraft.peineRetenueMinutes) || 0
    });
    setEditingIdx(null);
    setEditDraft(null);
  };

  const printItem = printArchiveIdx !== null ? history[printArchiveIdx] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {mode === "dashboard" && (
        <>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => onNavigate("investigations")} style={{ cursor: "pointer" }}>
              <div className="stat-icon blue">
                <i className="fas fa-user-secret"></i>
              </div>
              <div className="stat-info">
                <h3>Templates & Dossiers LSPD</h3>
                <div className="stat-value">16 Templates</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate("penal-table")} style={{ cursor: "pointer" }}>
              <div className="stat-icon orange">
                <i className="fas fa-scale-balanced"></i>
              </div>
              <div className="stat-info">
                <h3>Infractions & Aggravantes</h3>
                <div className="stat-value">{infractions.length} / {aggravantes.length}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-info">
                <h3>Total Amendes Prononcées</h3>
                <div className="stat-value">${totalAmended.toLocaleString()}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-info">
                <h3>Peines de Prison Cumulées</h3>
                <div className="stat-value">{formatMinutesToHours(totalMinutes)}</div>
              </div>
            </div>
          </div>

          <div className="catalogue-grid">
            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("calculator")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Calculateur de Peines</div>
                <span className="weapon-badge badge-pistolet">MDT</span>
              </div>
              <div className="weapon-desc">
                Calculer les amendes, peines, circonstances aggravantes, paliers MIN 1 à MAXIMAL et générer la Fiche Peines A4 (.PNG).
              </div>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-calculator"></i> Ouvrir le calculateur
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("reports")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Rapports d'Arrestation & Transfert DOJ</div>
                <span className="weapon-badge badge-pistolet">Onglet Dédié</span>
              </div>
              <div className="weapon-desc">
                Rédiger, modifier, imprimer en jeu vos rapports d'arrestation et les transférer directement au DOJ pour validation.
              </div>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-file-shield"></i> Ouvrir les rapports
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("doj-requests")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Demandes DOJ & Descentes</div>
                <span className="weapon-badge badge-sniper">10 Templates + Preuves</span>
              </div>
              <div className="weapon-desc">
                Rédiger vos demandes de descente (Raid QG), perquisitions, mandats d'arrêt, écoutes, joindre des preuves photos et imprimer en jeu.
              </div>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-gavel"></i> Ouvrir les demandes DOJ
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("investigations")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Dossiers d'Enquête & Templates</div>
                <span className="weapon-badge badge-sniper">Detective Bureau</span>
              </div>
              <div className="weapon-desc">
                Gérer les dossiers d'enquête LSPD (suspects, preuves, scellés) et utiliser les 16 templates officiels (Braquages, Interventions, Enquête, Mandats, Scellés).
              </div>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-user-secret"></i> Voir les dossiers & templates
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("penal-table")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Catalogue Code Pénal (243)</div>
                <span className="weapon-badge badge-pistolet">Loi</span>
              </div>
              <div className="weapon-desc">
                Consulter toutes les contraventions, délits mineurs, délits majeurs, crimes et circonstances aggravantes du Sheet.
              </div>
              <button className="btn btn-outline btn-sm">
                <i className="fas fa-book"></i> Voir le catalogue
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("weapons")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Armes & Équipements LSPD</div>
                <span className="weapon-badge badge-smg">95 Armes</span>
              </div>
              <div className="weapon-desc">
                Vérifier la légalité, le PPA/PPAL, la catégorie (D, C, B1, B2, A1, A2, A3) et inculper automatiquement une arme.
              </div>
              <button className="btn btn-outline btn-sm">
                <i className="fas fa-gun"></i> Registre des armes
              </button>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>
            <i className="fas fa-scroll"></i> Historique des Arrestations & Peines ({history.length})
          </h2>
          {history.length > 0 && (
            <button className="btn btn-sm btn-danger" onClick={onClearHistory}>
              <i className="fas fa-trash"></i> Vider l'historique
            </button>
          )}
        </div>
        <div className="card-body">
          {history.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-folder-open"></i>
              <p>Aucun dossier enregistré pour le moment.</p>
            </div>
          ) : (
            <>
              {/* BARRE DE FILTRE & TRI PAR AGENT / CRIMINEL */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: "1 1 200px", padding: "7px 10px", fontSize: 13 }}
                  placeholder="Rechercher N° dossier, criminel, agent..."
                  value={histSearch}
                  onChange={e => setHistSearch(e.target.value)}
                />
                <select
                  className="select"
                  style={{ width: 210, padding: "7px 10px", fontSize: 13 }}
                  value={histAgentFilter}
                  onChange={e => setHistAgentFilter(e.target.value)}
                >
                  <option value="ALL">Tous les agents ({history.length})</option>
                  {histAgentOptions.map(([name, count]) => (
                    <option key={name} value={name}>{name} ({count})</option>
                  ))}
                </select>
                <select
                  className="select"
                  style={{ width: 210, padding: "7px 10px", fontSize: 13 }}
                  value={histCriminalFilter}
                  onChange={e => setHistCriminalFilter(e.target.value)}
                >
                  <option value="ALL">Tous les criminels</option>
                  {histCriminalOptions.map(([name, count]) => (
                    <option key={name} value={name}>{name} ({count})</option>
                  ))}
                </select>
                <select
                  className="select"
                  style={{ width: 210, padding: "7px 10px", fontSize: 13 }}
                  value={histSortBy}
                  onChange={e => setHistSortBy(e.target.value)}
                >
                  <option value="recent">Tri : Plus récents</option>
                  <option value="agent_asc">Tri : Par Agent (A → Z)</option>
                  <option value="agent_desc">Tri : Par Agent (Z → A)</option>
                  <option value="criminal_asc">Tri : Par Criminel (A → Z)</option>
                  <option value="criminal_desc">Tri : Par Criminel (Z → A)</option>
                  <option value="fine_desc">Tri : Par Amende (Décroissant)</option>
                </select>
              </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Dossier</th>
                    <th>Date & Heure</th>
                    <th>Prévenu (RP)</th>
                    <th>Agent Signataire</th>
                    <th>Chefs d'inculpation</th>
                    <th>Palier Retenu</th>
                    <th>Amende Finale</th>
                    <th>Peine Prison</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryRows.map(({ item, origIdx }) => (
                    <tr key={item.id + "_" + origIdx}>
                      <td className="serial">{item.id}</td>
                      <td>{item.date} {item.heure}</td>
                      <td><strong style={{ color: "var(--text-primary)" }}>{item.prevenu || "—"}</strong></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            <i className="fas fa-signature" style={{ color: "var(--gold-seal)", marginRight: 5, fontSize: 11 }}></i>
                            {item.agent || "—"}
                          </span>
                          {item.commandVisa && (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              Visa : {item.commandVisa}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(item.rowsSnapshot || []).map((r, rIdx) => (
                            <span key={rIdx} className={getCategoryBadgeClass(r.categorie)}>
                              {r.article} • {r.chefAccusation}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className="brand-badge">{item.palierRetenu}</span></td>
                      <td className="price">${Number(item.amendeRetenue || 0).toLocaleString()}</td>
                      <td style={{ color: "var(--blue)", fontWeight: 700 }}>
                        {formatMinutesToHours(item.peineRetenueMinutes)} ({item.peineRetenueMinutes}m)
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => openEditModal(origIdx)}
                            title="Modifier ce dossier déjà créé (Agent signataire, infos, rapport)"
                          >
                            <i className="fas fa-pen-to-square"></i> Modifier
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                            onClick={() => setPrintArchiveIdx(origIdx)}
                            title="Imprimer ce dossier en jeu (Feuille A4 LSPD + Lien .PNG)"
                          >
                            <i className="fas fa-print"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onLoadHistoryItem(item)}
                            title="Recharger les infractions dans le calculateur"
                          >
                            <i className="fas fa-rotate-left"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => onDeleteHistoryItem(origIdx)}
                            title="Supprimer ce dossier"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL MODIFICATION D'UN DOSSIER D'ARRESTATION DÉJÀ CRÉÉ */}
      {editingIdx !== null && editDraft && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 15, 0.84)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => {
            setEditingIdx(null);
            setEditDraft(null);
          }}
        >
          <div
            className="card"
            style={{ maxWidth: 820, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h2>
                <i className="fas fa-pen-to-square" style={{ color: "var(--gold-seal)" }}></i> Modifier le Dossier Archivé — {editDraft.id}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(editDraft.reportText || "");
                    setCopiedEdit(true);
                    setTimeout(() => setCopiedEdit(false), 2000);
                  }}
                >
                  <i className={`fas fa-${copiedEdit ? "check" : "copy"}`}></i> {copiedEdit ? "Copié !" : "Copier Rapport"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                  onClick={() => {
                    if (onUpdateHistoryItem) {
                      onUpdateHistoryItem(editingIdx, {
                        ...editDraft,
                        amendeRetenue: Number(editDraft.amendeRetenue) || 0,
                        peineRetenueMinutes: Number(editDraft.peineRetenueMinutes) || 0
                      });
                    }
                    const targetIdx = editingIdx;
                    setEditingIdx(null);
                    setEditDraft(null);
                    setPrintArchiveIdx(targetIdx);
                  }}
                >
                  <i className="fas fa-print"></i> Enregistrer & Imprimer
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setEditingIdx(null);
                    setEditDraft(null);
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="card-body" style={{ overflowY: "auto" }}>
              <form onSubmit={handleSaveEditModal}>
                <div
                  className="form-row"
                  style={{
                    background: "rgba(59, 130, 246, 0.07)",
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
                      placeholder="Ex: 16 | Vance Winchester"
                      value={editDraft.agent}
                      onChange={e => handleDraftAgentChange(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>
                      <i className="fas fa-stamp" style={{ marginRight: 5 }}></i>
                      Visa Commandement / DOJ (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cdt. Miller / Procureur"
                      value={editDraft.commandVisa}
                      onChange={e => setEditDraft(p => ({ ...p, commandVisa: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° Dossier</label>
                    <input
                      type="text"
                      value={editDraft.id}
                      onChange={e => setEditDraft(p => ({ ...p, id: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prévenu (RP)</label>
                    <input
                      type="text"
                      value={editDraft.prevenu}
                      onChange={e => setEditDraft(p => ({ ...p, prevenu: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="text"
                      value={editDraft.date}
                      onChange={e => setEditDraft(p => ({ ...p, date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Heure</label>
                    <input
                      type="text"
                      value={editDraft.heure}
                      onChange={e => setEditDraft(p => ({ ...p, heure: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Palier Retenu</label>
                    <input
                      type="text"
                      value={editDraft.palierRetenu}
                      onChange={e => setEditDraft(p => ({ ...p, palierRetenu: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amende Finale ($)</label>
                    <input
                      type="number"
                      value={editDraft.amendeRetenue}
                      onChange={e => setEditDraft(p => ({ ...p, amendeRetenue: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Peine Prison (Minutes)</label>
                    <input
                      type="number"
                      value={editDraft.peineRetenueMinutes}
                      onChange={e => setEditDraft(p => ({ ...p, peineRetenueMinutes: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Texte complet du Rapport (Modifiable)</label>
                  <textarea
                    rows={14}
                    className="textarea"
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: 14,
                      lineHeight: 1.55,
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      padding: 12
                    }}
                    value={editDraft.reportText}
                    onChange={e => setEditDraft(p => ({ ...p, reportText: e.target.value }))}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEditingIdx(null);
                      setEditDraft(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-floppy-disk"></i> Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSION EN JEU D'UN DOSSIER ARCHIVÉ */}
      <PrintReportModal
        isOpen={Boolean(printItem)}
        onClose={() => setPrintArchiveIdx(null)}
        title={`RAPPORT D'ARRESTATION LSPD — ${printItem?.prevenu || ""}`}
        docNumber={printItem?.id || "LSPD-RA-2026"}
        date={printItem?.date}
        agent={printItem?.agent}
        initialCommandVisa={printItem?.commandVisa || ""}
        prevenu={printItem?.prevenu}
        reportText={printItem ? (printItem.reportText || buildFallbackReportFromArchive(printItem)) : ""}
        onSaveChanges={
          printArchiveIdx !== null && onUpdateHistoryItem
            ? ({ agent: nextAgent, commandVisa: nextVisa, docNumber: nextDoc, reportText: nextText }) => {
                onUpdateHistoryItem(printArchiveIdx, {
                  agent: nextAgent,
                  commandVisa: nextVisa,
                  id: nextDoc,
                  reportText: nextText
                });
              }
            : undefined
        }
      />
    </div>
  );
}
