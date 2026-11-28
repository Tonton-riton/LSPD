import React, { useState, useEffect, useCallback } from "react";
import {
  apiListUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiGetSettings,
  apiSaveSettings
} from "../utils/apiClient";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";

const ROLE_LABELS = {
  OFFICER:      { label: "Officier LSPD",             color: "#38bdf8", bg: "rgba(56, 189, 248, 0.16)" },
  DOJ:          { label: "DOJ (Juge / Procureur)",    color: "#dfb556", bg: "rgba(223, 181, 86, 0.18)" },
  HIGH_COMMAND: { label: "Haut Gradé LSPD (Command)", color: "#00e676", bg: "rgba(0, 230, 118, 0.16)" },
  ADMIN:        { label: "Administrateur",            color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)" }
};

export default function UserManagementView({ currentUser, dbMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Create account form (for High Command)
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newMatricule, setNewMatricule] = useState("");
  const [newRank, setNewRank] = useState("Procureur DOJ");
  const [newRole, setNewRole] = useState("DOJ");

  // Password reset inline
  const [resetTargetId, setResetTargetId] = useState(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  // Optional Discord webhooks
  const [webhookDojSubmit, setWebhookDojSubmit] = useState("");
  const [webhookDojDecision, setWebhookDojDecision] = useState("");

  const showNotice = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4500);
  };

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        apiListUsers(),
        silent ? Promise.resolve(null) : apiGetSettings()
      ]);
      setUsers(uRes.users || []);
      if (sRes) {
        setWebhookDojSubmit(sRes.settings?.webhookDojSubmit || "");
        setWebhookDojDecision(sRes.settings?.webhookDojDecision || "");
      }
    } catch (err) {
      if (!silent) showNotice("error", err.message || "Impossible de charger les comptes.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(false);
    const interval = setInterval(() => {
      if (!document.hidden) loadAll(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const handleRoleChange = async (userId, role) => {
    try {
      const res = await apiUpdateUser(userId, { role });
      setUsers(prev => prev.map(u => (u.id === userId ? res.user : u)));
      showNotice("success", `Rôle mis à jour : ${res.user.fullName} → ${ROLE_LABELS[role]?.label || role}`);
    } catch (err) {
      showNotice("error", err.message);
    }
  };

  const handleFieldSave = async (userId, patch) => {
    try {
      const res = await apiUpdateUser(userId, patch);
      setUsers(prev => prev.map(u => (u.id === userId ? res.user : u)));
      showNotice("success", `Compte ${res.user.fullName} mis à jour.`);
    } catch (err) {
      showNotice("error", err.message);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Supprimer définitivement le compte "${u.fullName}" (${u.username}) ?`)) return;
    try {
      await apiDeleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      showNotice("success", `Compte "${u.fullName}" supprimé.`);
    } catch (err) {
      showNotice("error", err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCreateUser({
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        matricule: newMatricule,
        rank: newRank,
        role: newRole
      });
      setUsers(prev => [...prev, res.user]);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewMatricule("");
      showNotice("success", `Compte "${res.user.fullName}" créé avec le rôle ${ROLE_LABELS[res.user.role]?.label} !`);
    } catch (err) {
      showNotice("error", err.message);
    }
  };

  const handleSaveWebhooks = async (e) => {
    e.preventDefault();
    try {
      await apiSaveSettings({ webhookDojSubmit, webhookDojDecision });
      showNotice("success", "Webhooks Discord enregistrés dans la base de données !");
    } catch (err) {
      showNotice("error", err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER + DB STATUS */}
      <div className="card" style={{ borderColor: "rgba(223, 181, 86, 0.45)" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 26, height: 26, objectFit: "contain" }} />
            <span>Gestion des Comptes LSPD & Attribution des Rôles DOJ ({users.length})</span>
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              className="brand-badge"
              style={{
                color: dbMode === "postgresql" ? "#00e676" : "#fbbf24",
                borderColor: dbMode === "postgresql" ? "#00e676" : "#fbbf24"
              }}
            >
              <i className="fas fa-database" style={{ marginRight: 5 }}></i>
              BDA : {dbMode === "postgresql" ? "PostgreSQL Connectée" : "Stockage Local JSON"}
            </span>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => loadAll(false)}>
              <i className="fas fa-arrows-rotate"></i> Actualiser
            </button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            <i className="fas fa-shield-halved" style={{ color: "var(--gold-seal)", marginRight: 6 }}></i>
            Tous les officiers peuvent créer librement leur propre compte (rôle <strong>Officier LSPD</strong> par défaut).{" "}
            <strong>Seuls les Hauts Gradés LSPD</strong> peuvent attribuer ici le rôle{" "}
            <strong style={{ color: "var(--gold-seal)" }}>DOJ (Juge / Procureur)</strong> ou{" "}
            <strong style={{ color: "#00e676" }}>Haut Gradé LSPD</strong>, désactiver un compte ou réinitialiser un mot de passe.
          </div>
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: msg.type === "success" ? "rgba(0, 230, 118, 0.14)" : "rgba(239, 68, 68, 0.14)",
            border: `1px solid ${msg.type === "success" ? "#00e676" : "#ef4444"}`,
            color: msg.type === "success" ? "#00e676" : "#fca5a5",
            fontWeight: 700,
            fontSize: 14
          }}
        >
          {msg.text}
        </div>
      )}

      {/* TABLE DES COMPTES */}
      <div className="card">
        <div className="card-header">
          <h2>
            <i className="fas fa-users-gear"></i> Liste des Officiers LSPD & Membres DOJ
          </h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i> Chargement des comptes...
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identifiant</th>
                    <th>Matricule</th>
                    <th>Nom & Prénom RP</th>
                    <th>Grade</th>
                    <th>Rôle & Accès</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isSelf = u.id === currentUser?.id;
                    const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.OFFICER;
                    return (
                      <tr key={u.id}>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          {u.username} {isSelf && <span className="brand-badge" style={{ marginLeft: 4 }}>Vous</span>}
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input mono"
                            style={{ width: 68, padding: "4px 8px", fontSize: 12.5 }}
                            defaultValue={u.matricule}
                            onBlur={e => {
                              if (e.target.value !== u.matricule) {
                                handleFieldSave(u.id, { matricule: e.target.value });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            style={{ minWidth: 150, padding: "4px 8px", fontSize: 13 }}
                            defaultValue={u.fullName}
                            onBlur={e => {
                              if (e.target.value !== u.fullName) {
                                handleFieldSave(u.id, { fullName: e.target.value });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            style={{ minWidth: 135, padding: "4px 8px", fontSize: 13 }}
                            defaultValue={u.rank}
                            onBlur={e => {
                              if (e.target.value !== u.rank) {
                                handleFieldSave(u.id, { rank: e.target.value });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="select"
                            disabled={isSelf}
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={{
                              padding: "5px 8px",
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: roleInfo.color,
                              borderColor: roleInfo.color,
                              minWidth: 190
                            }}
                          >
                            <option value="OFFICER">Officier LSPD</option>
                            <option value="DOJ">DOJ (Juge / Procureur)</option>
                            <option value="HIGH_COMMAND">Haut Gradé LSPD (Command)</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={isSelf}
                            className={`btn btn-sm ${u.status === "active" ? "btn-outline" : "btn-danger"}`}
                            style={u.status === "active" ? { borderColor: "#00e676", color: "#00e676" } : undefined}
                            onClick={() =>
                              handleFieldSave(u.id, { status: u.status === "active" ? "disabled" : "active" })
                            }
                          >
                            {u.status === "active" ? "Actif" : "Désactivé"}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {resetTargetId === u.id ? (
                              <>
                                <input
                                  type="password"
                                  className="input"
                                  style={{ width: 110, padding: "4px 6px", fontSize: 12 }}
                                  placeholder="Nouv. MDP"
                                  value={resetPasswordVal}
                                  onChange={e => setResetPasswordVal(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={async () => {
                                    if (resetPasswordVal.length < 4) return showNotice("error", "4 caractères minimum.");
                                    await handleFieldSave(u.id, { password: resetPasswordVal });
                                    setResetTargetId(null);
                                    setResetPasswordVal("");
                                  }}
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => {
                                    setResetTargetId(null);
                                    setResetPasswordVal("");
                                  }}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setResetTargetId(u.id)}
                                  title="Réinitialiser le mot de passe"
                                >
                                  <i className="fas fa-key"></i>
                                </button>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDelete(u)}
                                    title="Supprimer le compte"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CRÉER UN COMPTE DIRECTEMENT (EX: JUGE / PROCUREUR DOJ) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <div className="card-header">
            <h2>
              <i className="fas fa-user-plus" style={{ color: "var(--gold-seal)" }}></i> Créer un Compte Directement (DOJ ou LSPD)
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateAccount}>
              <div className="form-row">
                <div className="form-group">
                  <label>Identifiant</label>
                  <input type="text" placeholder="Ex: juge.harrison" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Mot de passe initial</label>
                  <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 0.6 }}>
                  <label>Matricule</label>
                  <input type="text" placeholder="Ex: DOJ-01" value={newMatricule} onChange={e => setNewMatricule(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1.4 }}>
                  <label>Nom & Prénom RP</label>
                  <input type="text" placeholder="Ex: Arthur Harrison" value={newFullName} onChange={e => setNewFullName(e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Grade / Titre</label>
                  <input type="text" value={newRank} onChange={e => setNewRank(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Rôle attribué</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="DOJ">DOJ (Juge / Procureur)</option>
                    <option value="OFFICER">Officier LSPD</option>
                    <option value="HIGH_COMMAND">Haut Gradé LSPD</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                <i className="fas fa-check"></i> Créer le compte
              </button>
            </form>
          </div>
        </div>

        {/* WEBHOOKS DISCORD OPTIONNELS */}
        <div className="card">
          <div className="card-header">
            <h2>
              <i className="fab fa-discord" style={{ color: "#5865F2" }}></i> Notifications Discord (Optionnel)
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveWebhooks}>
              <div className="form-group">
                <label>Webhook Discord — Dépôt Rapport / Demande au DOJ</label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookDojSubmit}
                  onChange={e => setWebhookDojSubmit(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Webhook Discord — Décision / Validation du DOJ</label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookDojDecision}
                  onChange={e => setWebhookDojDecision(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-outline btn-full" style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}>
                <i className="fas fa-floppy-disk"></i> Enregistrer les Webhooks
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
