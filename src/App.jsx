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
import InvestigationsView, { LSPD_TEMPLATES } from "./components/InvestigationsView";

const STORAGE_KEYS = {
  THEME: "sa_mdt_theme_v4",
  CONFIG: "sa_mdt_formula_config_v1",
  INFRACTIONS: "sa_mdt_infractions_v1",
  AGGRAVANTES: "sa_mdt_aggravantes_v1",
  ROWS: "sa_mdt_rows_v1",
  META: "sa_mdt_meta_v1",
  HISTORY: "sa_mdt_history_v1"
};

const NAV_SECTIONS = [
  {
    section: "// OPÉRATIONS & PATROUILLE",
    items: [
      { page: "dashboard",  icon: "table-columns", label: "Tableau de Bord LSPD" },
      { page: "calculator", icon: "calculator",    label: "Calculateur & Rapport", badgeKey: "activeRows" },
      { page: "history",    icon: "folder-closed", label: "Archives Arrestations", badgeKey: "history" }
    ]
  },
  {
    section: "// DETECTIVE BUREAU & TEMPLATES",
    items: [
      { page: "investigations", icon: "user-secret", label: "Dossiers d'Enquête & Templates", badgeKey: "templates" }
    ]
  },
  {
    section: "// BASE JURIDIQUE & ARMURERIE",
    items: [
      { page: "penal-table", icon: "scale-balanced",      label: "Code Pénal & Amendes (243)" },
      { page: "weapons",     icon: "gun",                 label: "Registre Armes LSPD (95)" },
      { page: "procedures",  icon: "book-journal-whills", label: "Procédures & Textes de Loi" }
    ]
  },
  {
    section: "// COMMANDEMENT & BARÈMES",
    items: [
      { page: "settings", icon: "sliders", label: "Formules Sheet & Réglages" }
    ]
  }
];

const PAGE_TITLES = {
  dashboard: "TERMINAL LSPD — TABLEAU DE BORD OPÉRATIONNEL",
  calculator: "CALCULATEUR DE PEINES & RAPPORT D'ARRESTATION (MDT)",
  investigations: "DETECTIVE BUREAU — DOSSIERS D'ENQUÊTE & TEMPLATES LSPD",
  history: "REGISTRE & ARCHIVES DES ARRESTATIONS LSPD",
  "penal-table": "CODE PÉNAL — CATALOGUE DES INFRACTIONS & AGGRAVANTES (243)",
  weapons: "ARMURERIE LSPD — CLASSIFICATION & LÉGALITÉ DES ARMES (95)",
  procedures: "PROCÉDURES D'INTERVENTION & CODES DE LOI SAN ANDREAS",
  settings: "PARAMÉTRAGE DES BARÈMES & FORMULES DU GOOGLE SHEET"
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
  const [activeReportTemplateId, setActiveReportTemplateId] = useState("standard");
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

  const handleSendSuspectToCalculator = (suspectName) => {
    if (suspectName) {
      setMeta(p => ({ ...p, prevenu: suspectName }));
    }
    setActiveTab("calculator");
    showToast(`Suspect "${suspectName}" chargé dans le Calculateur de Peine`);
  };

  const handleLoadTemplatePresetToCalculator = (tpl) => {
    if (Array.isArray(tpl.presetOffenses) && tpl.presetOffenses.length > 0) {
      const nextRows = tpl.presetOffenses
        .map((preset, idx) => {
          const inf = infractions.find(i => i.id === preset.infractionId);
          if (!inf) return null;
          let aggIds = [];
          if (preset.aggKeyword) {
            const matchedAgg = aggravantes.find(
              a =>
                a.idInfraction === inf.id &&
                a.circonstance.toLowerCase().includes(preset.aggKeyword.toLowerCase())
            );
            if (matchedAgg) aggIds = [matchedAgg.uid];
          }
          return {
            id: `preset_${Date.now()}_${idx}`,
            infractionId: inf.id,
            aggravanteIds: aggIds,
            qte: 1,
            tentative: false,
            complicite: false,
            avocat: false
          };
        })
        .filter(Boolean);

      if (nextRows.length > 0) {
        setRows(nextRows);
      }
    }
    setActiveReportTemplateId(tpl.id);
    setActiveTab("calculator");
    showToast(`Template "${tpl.category}" + amendes chargés dans le Calculateur !`);
  };

  const agentParts = (meta.agent || "16 | Vance Winchester").split("|");
  const agentMatricule = agentParts.length > 1 ? agentParts[0].trim() : "16";
  const agentDisplayName = agentParts[agentParts.length - 1].trim() || "Vance Winchester";

  return (
    <div className="app">
      {/* BANDEAU SUPÉRIEUR OFFICIEL LSPD / SAN ANDREAS */}
      <header id="lspd-top-ribbon">
        <div className="lspd-ribbon-left">
          <svg viewBox="0 0 20 14" width="16" height="11">
            <rect width="20" height="14" fill="#0b1e36" />
            <line x1="0" y1="2.5" x2="20" y2="2.5" stroke="#3b82f6" strokeWidth="1.4" />
            <line x1="0" y1="5.5" x2="20" y2="5.5" stroke="#ffffff" strokeWidth="1.3" />
            <line x1="0" y1="8.5" x2="20" y2="8.5" stroke="#3b82f6" strokeWidth="1.4" />
            <line x1="0" y1="11.5" x2="20" y2="11.5" stroke="#ffffff" strokeWidth="1.3" />
            <rect width="8" height="7" fill="#002147" />
            <circle cx="4" cy="3.5" r="1.4" fill="#dfb556" />
          </svg>
          <span>VILLE DE LOS SANTOS · LOS SANTOS POLICE DEPARTMENT & DEPARTMENT OF JUSTICE</span>
        </div>
        <div className="lspd-ribbon-center">
          TERMINAL OPÉRATIONNEL MDT · DETECTIVE BUREAU & COUR DE JUSTICE
        </div>
        <div className="lspd-ribbon-right">
          <span className="live-green-dot"></span>
          <span>RÉSEAU INTRA-LSPD · CANAL SÉCURISÉ CODE 4</span>
        </div>
      </header>

      {/* SIDEBAR OFFICIELLE LSPD AVEC SCEAU & SECTIONS */}
      <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="lspd-seal-header">
          <svg viewBox="0 0 100 100" width="52" height="52" style={{ flexShrink: 0 }}>
            <circle cx="50" cy="50" r="47" fill="#081529" stroke="#c59b27" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="28" cy="19" r="1.8" fill="#dfb556" />
            <circle cx="39" cy="14" r="1.8" fill="#dfb556" />
            <circle cx="50" cy="12" r="2.3" fill="#dfb556" />
            <circle cx="61" cy="14" r="1.8" fill="#dfb556" />
            <circle cx="72" cy="19" r="1.8" fill="#dfb556" />
            <path d="M29 29 L71 29 L71 53 Q71 75 50 84 Q29 75 29 53 Z" fill="#102544" stroke="#dfb556" strokeWidth="2" />
            <polygon points="50,36 54,46 65,46 56,52 59,63 50,56 41,63 44,52 35,46 46,46" fill="#dfb556" />
          </svg>
          <div className="lspd-seal-titles">
            <h2>LSPD — MDT</h2>
            <p>PROTECT & SERVE · SAN ANDREAS</p>
          </div>
        </div>

        <ul className="nav-menu">
          {NAV_SECTIONS.map((sec, sIdx) => (
            <React.Fragment key={sIdx}>
              <li className="lspd-nav-section-tag">{sec.section}</li>
              {sec.items.map(item => (
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
                  {item.badgeKey === "templates" && (
                    <span className="brand-badge" style={{ color: "var(--gold-seal)", borderColor: "rgba(223,181,86,0.4)" }}>
                      {LSPD_TEMPLATES.length} TPL
                    </span>
                  )}
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div
            className="lspd-agent-credential"
            onClick={() => setShowProfileEdit(s => !s)}
            title="Cliquer pour modifier le matricule, le grade ou le thème"
          >
            <div className="lspd-badge-monogram">
              #{agentMatricule.slice(0, 3)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {agentDisplayName}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--gold-seal)" }}>
                MATRICULE #{agentMatricule}
              </div>
              <div style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 5, color: "#22c55e", fontWeight: 700 }}>
                <span className="live-green-dot" style={{ width: 6, height: 6 }}></span>
                <span>{meta.roleLabel || "OFFICIER LSPD"}</span>
              </div>
            </div>
            <i className="fas fa-sliders" style={{ color: "var(--gold-seal)", fontSize: 13 }}></i>
          </div>

          {showProfileEdit && (
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="text"
                className="input"
                style={{ padding: "6px 10px", fontSize: 13 }}
                placeholder="Ex: 16 | Vance Winchester"
                value={meta.agent}
                onChange={e => setMeta(p => ({ ...p, agent: e.target.value }))}
              />
              <select
                className="select"
                style={{ padding: "6px 10px", fontSize: 13 }}
                value={meta.roleLabel || "OFFICIER LSPD"}
                onChange={e => setMeta(p => ({ ...p, roleLabel: e.target.value }))}
              >
                <option value="OFFICIER LSPD">Officier LSPD</option>
                <option value="SERGENT LSPD">Sergent LSPD</option>
                <option value="DÉTECTIVE DB">Détective Bureau (DB)</option>
                <option value="COMMAND STAFF">Command Staff (CS)</option>
                <option value="PROCUREUR DOJ">Procureur DOJ</option>
                <option value="JUGE FÉDÉRAL">Juge Fédéral / État</option>
              </select>
              <select
                className="select"
                style={{ padding: "6px 10px", fontSize: 13 }}
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="lspd-blue">Charte LSPD (Bleu & Or)</option>
                <option value="doj-gold">Charte DOJ (Or Fédéral)</option>
                <option value="bcso-emerald">Charte Sheriff (Émeraude)</option>
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
          <h1 style={{ fontSize: 17 }}>{PAGE_TITLES[activeTab] || "TERMINAL LSPD"}</h1>
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setActiveTab("investigations")}
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
            >
              <i className="fas fa-user-secret"></i>
              <span className="hide-mobile">Dossiers d'Enquête & Templates</span>
            </button>
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
              <span>#{agentMatricule} · {agentDisplayName}</span>
              <span className="role-badge patron" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <i className="fas fa-shield-halved"></i>
                {(meta.roleLabel || "OFFICIER LSPD").toUpperCase()}
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
              activeReportTemplateId={activeReportTemplateId}
              setActiveReportTemplateId={setActiveReportTemplateId}
            />
          )}

          {activeTab === "investigations" && (
            <InvestigationsView
              meta={meta}
              onSendSuspectToCalculator={handleSendSuspectToCalculator}
              onLoadTemplatePresetToCalculator={handleLoadTemplatePresetToCalculator}
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
            border: "1px solid var(--gold-seal)",
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
