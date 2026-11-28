import React, { useState } from "react";
import { apiLogin, apiRegister } from "../utils/apiClient";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";
import { LSPD_RANKS } from "../data/lspdRanks";

export default function AuthScreen({ onAuthenticated, dbMode }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [rank, setRank] = useState("Officier");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await apiLogin(username, password);
      } else {
        data = await apiRegister({
          username,
          password,
          fullName: fullName.trim() || username.trim(),
          matricule: matricule.trim(),
          rank: rank.trim() || "Officier"
        });
      }
      if (data?.user) {
        onAuthenticated(data.user, data.dbMode || dbMode);
      }
    } catch (err) {
      setError(err.message || "Erreur d'authentification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #0f2447 0%, #050a14 65%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          border: "1px solid rgba(223, 181, 86, 0.45)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.75)"
        }}
      >
        {/* TOP HEADER */}
        <div
          style={{
            background: "linear-gradient(180deg, #0b1e36 0%, #071324 100%)",
            borderBottom: "2px solid var(--gold-seal)",
            padding: "24px 24px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10
          }}
        >
          <img
            src={LSPD_LOGO_DATA_URL}
            alt="Los Santos Police Department"
            style={{
              width: 84,
              height: 84,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.7))"
            }}
          />
          <div>
            <div
              className="mono"
              style={{ fontSize: 10.5, letterSpacing: 1.5, color: "var(--gold-seal)", fontWeight: 700 }}
            >
              STATE OF SAN ANDREAS • TERMINAL SÉCURISÉ
            </div>
            <h1
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 20,
                fontWeight: 900,
                color: "#ffffff",
                margin: "4px 0 2px"
              }}
            >
              LSPD // DOJ — ACCÈS MDT
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Calculateur de Peines, Rapports Officiels, Demandes de Descente & Validation DOJ
            </p>
          </div>
        </div>

        {/* MODE SWITCH */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#081224",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              padding: "13px 12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "'Rajdhani', sans-serif",
              background: mode === "login" ? "rgba(59, 130, 246, 0.16)" : "transparent",
              color: mode === "login" ? "#ffffff" : "var(--text-secondary)",
              borderBottom: mode === "login" ? "2px solid var(--accent)" : "2px solid transparent"
            }}
          >
            <i className="fas fa-right-to-bracket" style={{ marginRight: 7, color: "var(--accent)" }}></i>
            Connexion (LSPD / DOJ)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              padding: "13px 12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "'Rajdhani', sans-serif",
              background: mode === "register" ? "rgba(223, 181, 86, 0.14)" : "transparent",
              color: mode === "register" ? "#ffffff" : "var(--text-secondary)",
              borderBottom: mode === "register" ? "2px solid var(--gold-seal)" : "2px solid transparent"
            }}
          >
            <i className="fas fa-user-plus" style={{ marginRight: 7, color: "var(--gold-seal)" }}></i>
            Créer un compte Officier
          </button>
        </div>

        <div className="card-body" style={{ padding: 24 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.14)",
                border: "1px solid rgba(239, 68, 68, 0.45)",
                color: "#fca5a5",
                fontSize: 13.5,
                fontWeight: 700,
                marginBottom: 16
              }}
            >
              <i className="fas fa-circle-exclamation" style={{ marginRight: 8 }}></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Identifiant de connexion</label>
              <input
                type="text"
                placeholder="Ex: v.winchester ou matricule16"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === "register" && (
              <>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ flex: 0.7, marginBottom: 0 }}>
                    <label>Matricule</label>
                    <input
                      type="text"
                      placeholder="Ex: 16"
                      value={matricule}
                      onChange={e => setMatricule(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                    <label>Nom & Prénom (RP)</label>
                    <input
                      type="text"
                      placeholder="Ex: Vance Winchester"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Grade LSPD</label>
                  <select value={rank} onChange={e => setRank(e.target.value)}>
                    {LSPD_RANKS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    fontSize: 12.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.45
                  }}
                >
                  <i className="fas fa-shield-halved" style={{ color: "var(--gold-seal)", marginRight: 6 }}></i>
                  Tout nouveau compte est créé avec l'accès <strong>Officier LSPD</strong>. Pour obtenir le rôle{" "}
                  <strong style={{ color: "var(--gold-seal)" }}>DOJ (Juge / Procureur)</strong> ou{" "}
                  <strong>Haut Gradé LSPD</strong>, un Haut Gradé LSPD doit l'attribuer depuis la gestion des comptes.
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 6, padding: "11px 16px", fontSize: 15 }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Connexion en cours...
                </>
              ) : mode === "login" ? (
                <>
                  <i className="fas fa-lock-open"></i> Se connecter au Terminal MDT
                </>
              ) : (
                <>
                  <i className="fas fa-user-check"></i> Créer mon compte Officier LSPD
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11.5,
              color: "var(--text-muted)"
            }}
          >
            <span>
              <i className="fas fa-database" style={{ marginRight: 5, color: dbMode === "postgresql" ? "var(--green)" : "var(--gold-seal)" }}></i>
              Base de données :{" "}
              <strong style={{ color: dbMode === "postgresql" ? "var(--green)" : "var(--gold-seal)" }}>
                {dbMode === "postgresql" ? "PostgreSQL (Cloud BDA)" : "Mode Local / En attente DATABASE_URL"}
              </strong>
            </span>
            <span className="mono">CODE 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
