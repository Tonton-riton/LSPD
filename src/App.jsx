import React, { useState, useEffect, useMemo } from "react";
import {
  DEFAULT_FORMULA_CONFIG,
  INITIAL_INFRACTIONS,
  INITIAL_AGGRAVANTES
} from "./data/sheetData";
import { calculateDossierSummary } from "./utils/formulaEngine";
import CalculatorView from "./components/CalculatorView";
import PenalTableView from "./components/PenalTableView";
import WeaponsGuideView from "./components/WeaponsGuideView";
import ProceduresAndCodesView from "./components/ProceduresAndCodesView";
import SettingsAndFormulasView from "./components/SettingsAndFormulasView";
import DashboardAndHistoryView from "./components/DashboardAndHistoryView";

const STORAGE_KEYS = {
  THEME: "sa_mdt_theme_v4",
  CONFIG: "sa_mdt_formula_config_v1",
  INFRACTIONS: "sa_mdt_infractions_v1",
  AGGRAVANTES: "sa_mdt_aggravantes_v1",
  ROWS: "sa_mdt_rows_v1",
  META: "sa_mdt_meta_v1",
  HISTORY: "sa_mdt_history_v1"
};

const NAV_ITEMS = [
  { page: "dashboard",   icon: "chart-line",          label: "Dashboard" },
  { page: "calculator",  icon: "plus-circle",         label: "Calculateur Peine", badgeKey: "activeRows" },
  { page: "history",     icon: "scroll",              label: "Historique Peines", badgeKey: "history" },
  { page: "penal-table", icon: "scale-balanced",      label: "Catalogue Peines" },
  { page: "weapons",     icon: "gun",                 label: "Armes & LSPD" },
  { page: "procedures",  icon: "book-journal-whills", label: "Procédures & Lois" },
  { page: "settings",    icon: "sliders",             label: "Formules & Réglages" }
];

const PAGE_TITLES = {
  dashboard: "Dashboard LSPD // DOJ",
  calculator: "Calculateur de Peines & Rapport d'Arrestation",
  history: "Historique des Arrestations",
  "penal-table": "Catalogue des Infractions & Aggravantes (243)",
  weapons: "Catalogue des Armes & Équipements LSPD",
  procedures: "Procédures & Codes Juridiques San Andreas",
  settings: "Formules du Sheet & Réglages"
};

function getInitialSheetSampleRows(aggravantes) {
  const superetteAgg = aggravantes.find(
    a => a.idInfraction === "ART403" && a.circonstance.toLowerCase().includes("supérette")
  );
  return [
    {
      id: "row_sample_1",
      infractionId: "ART403",
      aggravanteIds: superetteAgg ? [superetteAgg.uid] : [],
      qte: 1,
      tentative: false,
      complicite: false,
      avocat: false
    },
    {
      id: "row_sample_2",
      infractionId: "ART301",
      aggravanteIds: [],
      qte: 1,
      tentative: false,
      complicite: false,
      avocat: false
    }
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || "lspd-blue";
  });

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? { ...DEFAULT_FORMULA_CONFIG, ...JSON.parse(saved) } : DEFAULT_FORMULA_CONFIG;
    } catch {
      return DEFAULT_FORMULA_CONFIG;
    }
  });

  const [infractions, setInfractions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INFRACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_INFRACTIONS;
    } catch {
      return INITIAL_INFRACTIONS;
    }
  });

  const [aggravantes, setAggravantes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AGGRAVANTES);
      return saved ? JSON.parse(saved) : INITIAL_AGGRAVANTES;
    } catch {
      return INITIAL_AGGRAVANTES;
    }
  });

  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROWS);
      return saved ? JSON.parse(saved) : getInitialSheetSampleRows(INITIAL_AGGRAVANTES);
    } catch {
      return getInitialSheetSampleRows(INITIAL_AGGRAVANTES);
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [meta, setMeta] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.META);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const now = new Date();
    return {
      date: now.toLocaleDateString("fr-FR"),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      agent: "16 | Vance Winchester",
      roleLabel: "OFFICIER LSPD",
      prevenu: "Mike Armstrong",
      upCustomAmount: ""
    };
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INFRACTIONS, JSON.stringify(infractions));
  }, [infractions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AGGRAVANTES, JSON.stringify(aggravantes));
  }, [aggravantes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROWS, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(meta));
  }, [meta]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const summary = useMemo(() => {
    return calculateDossierSummary(rows, infractions, aggravantes, config, meta);
  }, [rows, infractions, aggravantes, config, meta]);

  const handleResetToSheetSample = () => {
    setRows(getInitialSheetSampleRows(aggravantes));
    setMeta(prev => ({
      ...prev,
      agent: "16 | Vance Winchester",
      prevenu: "Mike Armstrong",
      upCustomAmount: ""
    }));
    showToast("Exemple officiel du Google Sheet chargé !");
  };

  const handleResetAllData = () => {
    setSyncing(true);
    setConfig(DEFAULT_FORMULA_CONFIG);
    setInfractions(INITIAL_INFRACTIONS);
    setAggravantes(INITIAL_AGGRAVANTES);
    setRows(getInitialSheetSampleRows(INITIAL_AGGRAVANTES));
    setTimeout(() => {
      setSyncing(false);
      showToast("Données et formules synchronisées avec le Google Sheet");
    }, 450);
  };

  const handleValidateAndArchive = (archiveEntry) => {
    setHistory(prev => [archiveEntry, ...prev]);
    showToast(`Dossier ${archiveEntry.id} enregistré (${archiveEntry.prevenu}) — Total $${Number(archiveEntry.amendeRetenue).toLocaleString("fr-FR")}`);
  };

  const handleLoadHistoryItem = (item) => {
    if (Array.isArray(item.rowsSnapshot)) {
      setRows(
        item.rowsSnapshot.map((r, i) => ({
          id: `restored_${Date.now()}_${i}`,
          infractionId: r.infractionId,
          aggravanteIds: r.aggravanteIds || [],
          qte: r.qte || 1,
          tentative: Boolean(r.tentative),
          complicite: Boolean(r.complicite),
          avocat: Boolean(r.avocat)
        }))
      );
    }
    setMeta(prev => ({
      ...prev,
      prevenu: item.prevenu || prev.prevenu,
      agent: item.agent || prev.agent,
      date: item.date || prev.date,
      heure: item.heure || prev.heure
    }));
    setActiveTab("calculator");
    showToast(`Dossier ${item.id} rechargé dans le calculateur`);
  };

  const handleAddInfractionWithAggravante = (infractionId, aggUid = null) => {
    const inf = infractions.find(i => i.id === infractionId);
    if (!inf) return;

    setRows(prev => {
      const cleanPrev = prev.filter(r => r.infractionId);
      if (aggUid) {
        const existingIdx = cleanPrev.findIndex(r => r.infractionId === infractionId);
        if (existingIdx !== -1) {
          const copy = [...cleanPrev];
          const currAggs = Array.isArray(copy[existingIdx].aggravanteIds) ? copy[existingIdx].aggravanteIds : [];
          if (!currAggs.includes(aggUid)) {
            copy[existingIdx] = {
              ...copy[existingIdx],
              aggravanteIds: [...currAggs, aggUid]
            };
          }
          return copy;
        }
      }

      return [
        ...cleanPrev,
        {
          id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          infractionId,
          aggravanteIds: aggUid ? [aggUid] : [],
          qte: 1,
          tentative: false,
          complicite: false,
          avocat: cleanPrev.some(r => r.avocat)
        }
      ];
    });

    showToast(`${inf.chefAccusation} ajouté au panier`);
  };

  const handleAddWeaponOffenses = (weapon) => {
    const addedNames = [];
    const cat = String(weapon.categorie || "").toUpperCase();
    let targetInfId = null;

    if (cat.includes("CAT A")) targetInfId = "ART701_3_3";
    else if (cat.includes("CAT B")) targetInfId = "ART701_3_2";
    else if (cat.includes("CAT C")) targetInfId = "ART701_3_1";
    else targetInfId = "ART705";

    if (targetInfId) {
      handleAddInfractionWithAggravante(targetInfId, null);
      const inf = infractions.find(i => i.id === targetInfId);
      if (inf) addedNames.push(inf.chefAccusation);
    }

    if (weapon.achat === "POLICE" || weapon.remarque.includes("GOUVERNEMENTAUX")) {
      const aggArme = aggravantes.find(
        a => a.idInfraction === "ART402" && a.circonstance.toLowerCase().includes("arme")
      );
      handleAddInfractionWithAggravante("ART402", aggArme ? aggArme.uid : null);
      addedNames.push("Art. 402 Équipement gouvernemental");
    }

    showToast(`Arme "${weapon.nom}" ajoutée au dossier`);
    setActiveTab("calculator");
  };

  const agentDisplayName = (meta.agent || "Winchester").split("|").pop().trim();
  const agentInitial = (agentDisplayName[0] || "W").toUpperCase();

  return (
    <div className="app">
      {/* SIDEBAR AUX COULEURS LSPD */}
      <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo" style={{ color: "var(--accent)" }}>
            <i className="fas fa-shield-halved" style={{ fontSize: 30, color: "#3b82f6", filter: "drop-shadow(0 0 10px rgba(59,130,246,0.6))" }}></i>
            <span>LSPD // MDT</span>
          </div>
          <p className="logo-subtitle">Los Santos Police Dept.</p>
        </div>

        <ul className="nav-menu">
          {NAV_ITEMS.map(item => (
            <li
              key={item.page}
              className={`nav-item${activeTab === item.page ? " active" : ""}`}
              onClick={() => {
                setActiveTab(item.page);
                setSidebarOpen(false);
              }}
            >
              <i className={`fas fa-${item.icon}`}></i>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badgeKey === "activeRows" && summary.activeRows.length > 0 && (
                <span className="brand-badge">{summary.activeRows.length}</span>
              )}
              {item.badgeKey === "history" && history.length > 0 && (
                <span className="brand-badge">{history.length}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div
            className="user-info sidebar-profile-btn"
            style={{ cursor: "pointer" }}
            onClick={() => setShowProfileEdit(s => !s)}
            title="Modifier mon profil / thème"
          >
            <div
              className="user-avatar"
              style={{
                background: "rgba(59, 130, 246, 0.16)",
                color: "var(--accent)",
                borderColor: "var(--accent)"
              }}
            >
              {agentInitial}
            </div>
            <div className="user-details">
              <span className="user-name">{agentDisplayName}</span>
              <span
                className="user-role"
                style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}
              >
                <i className="fas fa-shield-halved" style={{ fontSize: 10 }}></i>
                {meta.roleLabel || "OFFICIER LSPD"}
              </span>
            </div>
            <i className="fas fa-pen-to-square sidebar-edit-icon" style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}></i>
          </div>

          {showProfileEdit && (
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="text"
                className="input"
                style={{ padding: "6px 10px", fontSize: 13 }}
                placeholder="Agent / Matricule"
                value={meta.agent}
                onChange={e => setMeta(p => ({ ...p, agent: e.target.value }))}
              />
              <select
                className="select"
                style={{ padding: "6px 10px", fontSize: 13 }}
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="lspd-blue">Thème LSPD (Bleu Police)</option>
                <option value="doj-gold">Thème DOJ (Or Fédéral)</option>
                <option value="bcso-emerald">Thème Sheriff (Vert BCSO)</option>
              </select>
            </div>
          )}

          <button className="btn-logout" onClick={handleResetToSheetSample}>
            <i className="fas fa-rotate-left"></i> Réinitialiser Dossier
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT & TOPBAR LSPD */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)}>
            <i className="fas fa-bars"></i>
          </button>
          <h1>{PAGE_TITLES[activeTab] || "Calculateur de Peines"}</h1>
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={handleResetAllData}
              title="Synchroniser avec les valeurs et formules du Google Sheet"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              <i className={`fas fa-arrows-rotate ${syncing ? "fa-spin" : ""}`} style={{ color: "var(--accent)" }}></i>
              <span className="hide-mobile">Synchro Sheet</span>
            </button>
            <div className="topbar-user">
              <span>Officier {agentDisplayName}</span>
              <span
                className="role-badge"
                style={{
                  background: "rgba(59, 130, 246, 0.16)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="fas fa-shield-halved"></i>
                {(meta.roleLabel || "LSPD").toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <section className="page active">
          {(activeTab === "dashboard" || activeTab === "history") && (
            <DashboardAndHistoryView
              mode={activeTab}
              history={history}
              onClearHistory={() => setHistory([])}
              onDeleteHistoryItem={idx => setHistory(prev => prev.filter((_, i) => i !== idx))}
              onLoadHistoryItem={handleLoadHistoryItem}
              onNavigate={setActiveTab}
              infractions={infractions}
              aggravantes={aggravantes}
            />
          )}

          {activeTab === "calculator" && (
            <CalculatorView
              rows={rows}
              setRows={setRows}
              infractions={infractions}
              aggravantes={aggravantes}
              config={config}
              setConfig={setConfig}
              meta={meta}
              setMeta={setMeta}
              summary={summary}
              onResetToSheetSample={handleResetToSheetSample}
              onOpenSettings={() => setActiveTab("settings")}
              onValidateAndArchive={handleValidateAndArchive}
            />
          )}

          {activeTab === "penal-table" && (
            <PenalTableView
              infractions={infractions}
              aggravantes={aggravantes}
              onAddInfractionWithAggravante={handleAddInfractionWithAggravante}
            />
          )}

          {activeTab === "weapons" && (
            <WeaponsGuideView
              onAddWeaponOffenses={handleAddWeaponOffenses}
            />
          )}

          {activeTab === "procedures" && (
            <ProceduresAndCodesView />
          )}

          {activeTab === "settings" && (
            <SettingsAndFormulasView
              config={config}
              setConfig={setConfig}
              infractions={infractions}
              setInfractions={setInfractions}
              aggravantes={aggravantes}
              setAggravantes={setAggravantes}
              onResetAllData={handleResetAllData}
            />
          )}
        </section>
      </main>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9999,
            padding: "12px 18px",
            borderRadius: "8px",
            background: "var(--bg-card)",
            border: "1px solid var(--accent)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)"
          }}
        >
          <i className="fas fa-circle-check" style={{ color: "var(--green)" }}></i>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
