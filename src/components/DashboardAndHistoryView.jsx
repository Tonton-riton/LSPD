import React from "react";
import { formatMinutesToHours } from "../utils/formulaEngine";
import { getCategoryBadgeClass } from "./CalculatorView";

export default function DashboardAndHistoryView({
  mode,
  history,
  onClearHistory,
  onDeleteHistoryItem,
  onLoadHistoryItem,
  onNavigate,
  infractions,
  aggravantes
}) {
  const totalAmended = history.reduce((s, h) => s + (Number(h.amendeRetenue) || 0), 0);
  const totalMinutes = history.reduce((s, h) => s + (Number(h.peineRetenueMinutes) || 0), 0);

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
                <h3>Detective Bureau & Templates</h3>
                <div className="stat-value">8 Templates</div>
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
                <div className="weapon-name">Calculateur de Peines & Rapport</div>
                <span className="weapon-badge badge-pistolet">MDT</span>
              </div>
              <div className="weapon-desc">
                Calculer les amendes, peines, circonstances aggravantes, paliers MIN 1 à MAXIMAL, générer l'image PNG et le Rapport d'Arrestation LSPD.
              </div>
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-calculator"></i> Ouvrir le calculateur
              </button>
            </div>

            <div className="weapon-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("investigations")}>
              <div className="weapon-card-top">
                <div className="weapon-name">Dossiers d'Enquête & Templates</div>
                <span className="weapon-badge badge-sniper">Detective Bureau</span>
              </div>
              <div className="weapon-desc">
                Gérer les dossiers d'enquête LSPD (suspects, preuves, scellés) et utiliser les 8 templates officiels (Enquête, Interrogatoire, Mandat, BOLO, Plainte, Scellés).
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
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N° Dossier</th>
                    <th>Date & Heure</th>
                    <th>Prévenu (RP)</th>
                    <th>Agent</th>
                    <th>Chefs d'inculpation</th>
                    <th>Palier Retenu</th>
                    <th>Amende Finale</th>
                    <th>Peine Prison</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={item.id + "_" + idx}>
                      <td className="serial">{item.id}</td>
                      <td>{item.date} {item.heure}</td>
                      <td><strong style={{ color: "var(--text-primary)" }}>{item.prevenu || "—"}</strong></td>
                      <td>{item.agent || "—"}</td>
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
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-sm btn-outline" onClick={() => onLoadHistoryItem(item)}>
                            <i className="fas fa-rotate-left"></i> Recharger
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => onDeleteHistoryItem(idx)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
