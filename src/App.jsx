import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DEFAULT_FORMULA_CONFIG,
  INITIAL_INFRACTIONS,
  INITIAL_AGGRAVANTES
} from "./data/sheetData";
import { calculateDossierSummary } from "./utils/formulaEngine";
import { syncSigningAgentInText } from "./utils/generatePrintableReport";
import {
  isHttpServerMode,
  getAuthToken,
  apiHealth,
  apiMe,
  apiLogout,
  apiListReports,
  apiSaveReport,
  apiReviewReport,
  apiDeleteReport,
  apiListDojRequests,
  apiSaveDojRequest,
  apiReviewDojRequest,
  apiDeleteDojRequest
} from "./utils/apiClient";
import AuthScreen from "./components/AuthScreen";
import CalculatorView from "./components/CalculatorView";
import ReportsView from "./components/ReportsView";
import PenalTableView from "./components/PenalTableView";
import WeaponsGuideView from "./components/WeaponsGuideView";
import ProceduresAndCodesView from "./components/ProceduresAndCodesView";
import SettingsAndFormulasView from "./components/SettingsAndFormulasView";
import DashboardAndHistoryView from "./components/DashboardAndHistoryView";
import InvestigationsView, { LSPD_TEMPLATES } from "./components/InvestigationsView";
import DojRequestsView from "./components/DojRequestsView";
import DojReviewPortalView from "./components/DojReviewPortalView";
import UserManagementView from "./components/UserManagementView";
import { DOJ_TEMPLATES } from "./data/dojTemplates";
import { LSPD_LOGO_DATA_URL } from "./assets/lspdLogo";

const STORAGE_KEYS = {
  THEME: "sa_mdt_theme_v4",
  CONFIG: "sa_mdt_formula_config_v1",
  INFRACTIONS: "sa_mdt_infractions_v1",
  AGGRAVANTES: "sa_mdt_aggravantes_v1",
  ROWS: "sa_mdt_rows_v1",
  META: "sa_mdt_meta_v1",
  HISTORY: "sa_mdt_history_v1",
  OFFLINE_REPORTS: "sa_mdt_reports_offline_v1"
};

const PAGE_TITLES = {
  dashboard: "TERMINAL LSPD — TABLEAU DE BORD OPÉRATIONNEL",
  calculator: "CALCULATEUR DE PEINES & AMENDES (SHEET MDT)",
  reports: "RAPPORTS D'ARRESTATION & TRANSFERT AU DOJ",
  "doj-portal": "PORTAIL DOJ — VALIDATION DES MANDATS & RAPPORTS",
  "doj-requests": "DOJ — DEMANDES DE DESCENTE, MANDATS & PREUVES JOINTES",
  investigations: "DETECTIVE BUREAU — DOSSIERS D'ENQUÊTE & TEMPLATES LSPD",
  history: "REGISTRE & ARCHIVES DES ARRESTATIONS LSPD",
  "penal-table": "CODE PÉNAL — CATALOGUE DES INFRACTIONS & AGGRAVANTES (243)",
  weapons: "ARMURERIE LSPD — CLASSIFICATION & LÉGALITÉ DES ARMES (95)",
  procedures: "PROCÉDURES D'INTERVENTION & CODES DE LOI SAN ANDREAS",
  users: "COMMANDEMENT LSPD — GESTION DES COMPTES & RÔLES DOJ",
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
  // --- Auth & Backend BDA state ---
  const [authChecked, setAuthChecked] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [dbMode, setDbMode] = useState("local-json");
  const [currentUser, setCurrentUser] = useState(null);

  // --- Shared BDA Collections ---
  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_REPORTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeReportId, setActiveReportId] = useState(null);
  const [dojRequests, setDojRequests] = useState([]);

  // --- UI & Navigation state ---
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

  const [meta, setMeta] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.META);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const now = new Date();
    return {
      agent: "16 | Vance Winchester",
      roleLabel: "OFFICIER LSPD",
      prevenu: "Mike Armstrong",
      date: now.toLocaleDateString("fr-FR"),
      heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      upCustomAmount: ""
    };
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const refreshSharedData = useCallback(async () => {
    if (!serverOnline || !getAuthToken()) return;
    try {
      const [repRes, dojRes] = await Promise.all([apiListReports(), apiListDojRequests()]);
      if (Array.isArray(repRes.reports)) setReports(repRes.reports);
      if (Array.isArray(dojRes.requests)) setDojRequests(dojRes.requests);
    } catch {
      // ignore transient network errors
    }
  }, [serverOnline]);

  // Initial check against backend API (/api/health + /api/auth/me)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isHttpServerMode()) {
        setServerOnline(false);
        setAuthChecked(true);
        return;
      }
      try {
        const h = await apiHealth();
        if (cancelled) return;
        setServerOnline(true);
        setDbMode(h.dbMode || "local-json");

        if (getAuthToken()) {
          try {
            const me = await apiMe();
            if (!cancelled && me?.user) {
              setCurrentUser(me.user);
              setDbMode(me.dbMode || h.dbMode || "local-json");
              setMeta(prev => ({
                ...prev,
                agent: me.user.matricule ? `${me.user.matricule} | ${me.user.fullName}` : me.user.fullName,
                roleLabel: me.user.rank || (me.user.role === "DOJ" ? "Magistrat DOJ" : "Officier LSPD")
              }));
              if (me.user.role === "DOJ") {
                setActiveTab("doj-portal");
              }
            }
          } catch {
            // Token invalid or expired -> show login screen
          }
        }
      } catch {
        // Offline / pure static mode
        setServerOnline(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load & periodically refresh shared reports + DOJ requests when logged in
  useEffect(() => {
    if (!serverOnline || !currentUser) return;
    refreshSharedData();
    const interval = setInterval(refreshSharedData, 25000);
    return () => clearInterval(interval);
  }, [serverOnline, currentUser, refreshSharedData]);

  // Persist local preferences
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

  // Role helpers
  const isHighCommand = Boolean(
    !serverOnline || (currentUser && ["HIGH_COMMAND", "ADMIN"].includes(currentUser.role))
  );
  const isDojOrCommand = Boolean(
    !serverOnline || (currentUser && ["DOJ", "HIGH_COMMAND", "ADMIN"].includes(currentUser.role))
  );

  // Pending DOJ review counter
  const pendingDojCount = useMemo(() => {
    const rPending = reports.filter(r => r.dojStatus === "submitted").length;
    const wPending = dojRequests.filter(r => r.status === "submitted" || r.status === "pending").length;
    return rPending + wPending;
  }, [reports, dojRequests]);

  const changesRequestedReportsCount = useMemo(
    () => reports.filter(r => r.dojStatus === "changes_requested").length,
    [reports]
  );

  const NAV_SECTIONS = useMemo(() => {
    const sections = [
      {
        section: "// OPÉRATIONS & PATROUILLE",
        items: [
          { page: "dashboard",  icon: "table-columns", label: "Tableau de Bord LSPD" },
          { page: "calculator", icon: "calculator",    label: "Calculateur de Peines", badgeKey: "activeRows" },
          { page: "reports",    icon: "file-shield",   label: "Rapports d'Arrestation", badgeKey: "reports" },
          { page: "history",    icon: "folder-closed", label: "Archives Arrestations", badgeKey: "history" }
        ]
      },
      {
        section: "// DETECTIVE BUREAU & DOJ",
        items: [
          ...(isDojOrCommand
            ? [{ page: "doj-portal", icon: "scale-balanced", label: "Portail Validation DOJ", badgeKey: "dojPending" }]
            : []),
          { page: "doj-requests",   icon: "gavel",       label: "Demandes DOJ & Descentes", badgeKey: "dojTemplates" },
          { page: "investigations", icon: "user-secret", label: "Dossiers d'Enquête & Templates", badgeKey: "templates" }
        ]
      },
      {
        section: "// BASE JURIDIQUE & ARMURERIE",
        items: [
          { page: "penal-table", icon: "book-bookmark",       label: "Code Pénal & Amendes (243)" },
          { page: "weapons",     icon: "gun",                 label: "Registre Armes LSPD (95)" },
          { page: "procedures",  icon: "book-journal-whills", label: "Procédures & Textes de Loi" }
        ]
      },
      {
        section: "// COMMANDEMENT & BARÈMES",
        items: [
          ...(isHighCommand && serverOnline
            ? [{ page: "users", icon: "users-gear", label: "Gestion Comptes & Rôles", badgeKey: "commandOnly" }]
            : []),
          { page: "settings", icon: "sliders", label: "Formules Sheet & Réglages" }
        ]
      }
    ];
    return sections;
  }, [isDojOrCommand, isHighCommand, serverOnline]);

  const summary = useMemo(() => {
    return calculateDossierSummary(rows, infractions, aggravantes, config, meta);
  }, [rows, infractions, aggravantes, config, meta]);

  // --- Shared Reports CRUD ---
  const handleSaveReport = async (reportPayload) => {
    if (serverOnline && currentUser) {
      const res = await apiSaveReport(reportPayload);
      const saved = res.report;
      setReports(prev => {
        const exists = prev.some(r => r.id === saved.id);
        return exists ? prev.map(r => (r.id === saved.id ? saved : r)) : [saved, ...prev];
      });
      if (reportPayload.dojStatus === "submitted") {
        showToast(`Rapport ${saved.reportNumber} transféré au DOJ pour validation !`);
      } else {
        showToast(`Rapport ${saved.reportNumber} enregistré dans la BDA.`);
      }
      return saved;
    }

    // Offline fallback
    const saved = {
      ...reportPayload,
      id: reportPayload.id || `rep_${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setReports(prev => {
      const exists = prev.some(r => r.id === saved.id);
      const next = exists ? prev.map(r => (r.id === saved.id ? saved : r)) : [saved, ...prev];
      localStorage.setItem(STORAGE_KEYS.OFFLINE_REPORTS, JSON.stringify(next));
      return next;
    });
    showToast(`Rapport ${saved.reportNumber} enregistré en local.`);
    return saved;
  };

  const handleDeleteReport = async (id) => {
    if (serverOnline && currentUser) {
      try {
        await apiDeleteReport(id);
      } catch (err) {
        showToast(err.message || "Suppression impossible.");
        return;
      }
    }
    setReports(prev => {
      const next = prev.filter(r => r.id !== id);
      if (!serverOnline) localStorage.setItem(STORAGE_KEYS.OFFLINE_REPORTS, JSON.stringify(next));
      return next;
    });
    showToast("Rapport supprimé.");
  };

  const handleReviewReport = async (id, { dojStatus, dojComment }) => {
    if (serverOnline && currentUser) {
      const res = await apiReviewReport(id, { dojStatus, dojComment });
      const updated = res.report;
      setReports(prev => prev.map(r => (r.id === id ? updated : r)));
      showToast(`Décision DOJ enregistrée sur le rapport ${updated.reportNumber}.`);
      return updated;
    }
    // Offline simulation
    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              dojStatus,
              dojComment,
              dojReviewerName: meta.agent,
              dojReviewedAt: new Date().toLocaleString("fr-FR"),
              commandVisa: dojStatus === "approved" ? meta.agent : r.commandVisa
            }
          : r
      )
    );
  };

  // --- Shared DOJ Requests CRUD ---
  const handleSaveDojRequest = async (reqPayload) => {
    if (serverOnline && currentUser) {
      const res = await apiSaveDojRequest(reqPayload);
      const saved = res.request;
      setDojRequests(prev => {
        const exists = prev.some(r => r.id === saved.id);
        return exists ? prev.map(r => (r.id === saved.id ? saved : r)) : [saved, ...prev];
      });
      if (reqPayload.status === "submitted") {
        showToast(`Demande ${saved.requestNumber} transférée au DOJ !`);
      }
      return saved;
    }
    return reqPayload;
  };

  const handleDeleteDojRequest = async (id) => {
    if (serverOnline && currentUser) {
      try {
        await apiDeleteDojRequest(id);
      } catch (err) {
        showToast(err.message || "Suppression impossible.");
        return;
      }
    }
    setDojRequests(prev => prev.filter(r => r.id !== id));
    showToast("Demande DOJ supprimée.");
  };

  const handleReviewDojRequest = async (id, { status, dojComment }) => {
    if (serverOnline && currentUser) {
      const res = await apiReviewDojRequest(id, { status, dojComment });
      const updated = res.request;
      setDojRequests(prev => prev.map(r => (r.id === id ? updated : r)));
      showToast(`Décision DOJ enregistrée sur ${updated.requestNumber}.`);
      return updated;
    }
  };

  // --- Calculator → Reports bridge ---
  const handleCreateReportFromCalculator = async (reportPayload) => {
    const saved = await handleSaveReport(reportPayload);
    if (saved?.id) {
      setActiveReportId(saved.id);
    }
    setActiveTab("reports");
    showToast(`Rapport ${reportPayload.reportNumber} créé — prêt à modifier, imprimer ou transférer au DOJ !`);
  };

  // --- Existing Calculator / History / Penal helpers ---
  const handleResetToSheetSample = () => {
    setRows(getInitialSheetSampleRows(aggravantes));
    setMeta(prev => ({
      ...prev,
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
  };

  const handleUpdateHistoryItem = (idx, patch) => {
    setHistory(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const merged = { ...item, ...patch };
        if (patch.agent !== undefined && !patch.reportText && merged.reportText) {
          merged.reportText = syncSigningAgentInText(merged.reportText, patch.agent);
        }
        return merged;
      })
    );
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
            copy[existingIdx] = { ...copy[existingIdx], aggravanteIds: [...currAggs, aggUid] };
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
    const cat = String(weapon.categorie || "").toUpperCase();
    let targetInfId = "ART705";
    if (cat.includes("CAT A")) targetInfId = "ART701_3_3";
    else if (cat.includes("CAT B")) targetInfId = "ART701_3_2";
    else if (cat.includes("CAT C")) targetInfId = "ART701_3_1";

    handleAddInfractionWithAggravante(targetInfId, null);

    if (weapon.achat === "POLICE" || weapon.remarque.includes("GOUVERNEMENTAUX")) {
      const aggArme = aggravantes.find(
        a => a.idInfraction === "ART402" && a.circonstance.toLowerCase().includes("arme")
      );
      handleAddInfractionWithAggravante("ART402", aggArme ? aggArme.uid : null);
    }

    showToast(`Arme "${weapon.nom}" ajoutée au calculateur`);
    setActiveTab("calculator");
  };

  const handleSendSuspectToCalculator = (suspectName) => {
    if (suspectName) {
      setMeta(p => ({ ...p, prevenu: suspectName }));
    }
    setActiveTab("calculator");
    showToast(`Suspect "${suspectName}" chargé dans le Calculateur de Peines`);
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

      if (nextRows.length > 0) setRows(nextRows);
    }
    setActiveReportTemplateId(tpl.id);
    setActiveTab("calculator");
    showToast(`Template "${tpl.category}" + amendes chargés dans le Calculateur !`);
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setReports([]);
    setDojRequests([]);
  };

  // Loading gate while verifying token
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050a14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          color: "#94a3b8"
        }}
      >
        <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 68, height: 68, objectFit: "contain" }} />
        <div className="mono" style={{ fontSize: 13, color: "var(--gold-seal)" }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
          CONNEXION AU TERMINAL MDT LSPD // DOJ...
        </div>
      </div>
    );
  }

  // Require login when connected to backend server
  if (serverOnline && !currentUser) {
    return (
      <AuthScreen
        dbMode={dbMode}
        onAuthenticated={(user, mode) => {
          setCurrentUser(user);
          if (mode) setDbMode(mode);
          setMeta(prev => ({
            ...prev,
            agent: user.matricule ? `${user.matricule} | ${user.fullName}` : user.fullName,
            roleLabel: user.rank || (user.role === "DOJ" ? "Magistrat DOJ" : "Officier LSPD")
          }));
          if (user.role === "DOJ") {
            setActiveTab("doj-portal");
          } else {
            setActiveTab("calculator");
          }
          showToast(`Bienvenue ${user.rank || ""} ${user.fullName} !`);
        }}
      />
    );
  }

  const agentParts = (meta.agent || "16 | Vance Winchester").split("|");
  const agentMatricule = currentUser?.matricule || (agentParts.length > 1 ? agentParts[0].trim() : "16");
  const agentDisplayName = currentUser?.fullName || agentParts[agentParts.length - 1].trim() || "Vance Winchester";
  const roleShortTag =
    currentUser?.role === "DOJ"
      ? "DOJ"
      : currentUser?.role === "HIGH_COMMAND" || currentUser?.role === "ADMIN"
      ? "HAUT GRADÉ"
      : "OFFICIER";

  return (
    <div className="app">
      {/* BANDEAU SUPÉRIEUR OFFICIEL LSPD / SAN ANDREAS */}
      <header id="lspd-top-ribbon">
        <div className="lspd-ribbon-left">
          <img
            src={LSPD_LOGO_DATA_URL}
            alt="Logo LSPD"
            style={{ width: 18, height: 18, objectFit: "contain", borderRadius: "50%" }}
          />
          <span>VILLE DE LOS SANTOS · LOS SANTOS POLICE DEPARTMENT & DEPARTMENT OF JUSTICE</span>
        </div>
        <div className="lspd-ribbon-center">
          TERMINAL OPÉRATIONNEL MDT · CALCULATEUR, RAPPORTS & VALIDATION DOJ
        </div>
        <div className="lspd-ribbon-right">
          <span className="live-green-dot"></span>
          <span>
            {serverOnline
              ? `BDA ${dbMode === "postgresql" ? "POSTGRESQL" : "SERVEUR"} · CODE 4`
              : "MODE LOCAL HORS-LIGNE"}
          </span>
        </div>
      </header>

      {/* SIDEBAR OFFICIELLE LSPD AVEC SCEAU & SECTIONS */}
      <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="lspd-seal-header">
          <img
            src={LSPD_LOGO_DATA_URL}
            alt="Sceau Officiel LSPD"
            style={{
              width: 54,
              height: 54,
              objectFit: "contain",
              flexShrink: 0,
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))"
            }}
          />
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
                    if (["reports", "doj-portal", "doj-requests"].includes(item.page)) {
                      refreshSharedData();
                    }
                  }}
                >
                  <i className={`fas fa-${item.icon}`}></i>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badgeKey === "activeRows" && summary.activeRows.length > 0 && (
                    <span className="brand-badge">{summary.activeRows.length}</span>
                  )}
                  {item.badgeKey === "reports" && (
                    <span
                      className="brand-badge"
                      style={
                        changesRequestedReportsCount > 0
                          ? { background: "rgba(245, 158, 11, 0.25)", color: "#fbbf24", borderColor: "#f59e0b" }
                          : undefined
                      }
                    >
                      {changesRequestedReportsCount > 0 ? `${changesRequestedReportsCount} ⚠️` : reports.length}
                    </span>
                  )}
                  {item.badgeKey === "history" && history.length > 0 && (
                    <span className="brand-badge">{history.length}</span>
                  )}
                  {item.badgeKey === "dojPending" && (
                    <span
                      className="brand-badge"
                      style={
                        pendingDojCount > 0
                          ? { background: "#dfb556", color: "#050a14", borderColor: "#dfb556", fontWeight: 800 }
                          : { color: "var(--gold-seal)", borderColor: "rgba(223,181,86,0.4)" }
                      }
                    >
                      {pendingDojCount > 0 ? `${pendingDojCount} DOJ` : "OK"}
                    </span>
                  )}
                  {item.badgeKey === "dojTemplates" && (
                    <span className="brand-badge" style={{ color: "var(--gold-seal)", borderColor: "rgba(223,181,86,0.45)" }}>
                      {DOJ_TEMPLATES.length} DOJ
                    </span>
                  )}
                  {item.badgeKey === "templates" && (
                    <span className="brand-badge" style={{ color: "var(--gold-seal)", borderColor: "rgba(223,181,86,0.4)" }}>
                      {LSPD_TEMPLATES.length} TPL
                    </span>
                  )}
                  {item.badgeKey === "commandOnly" && (
                    <span className="brand-badge" style={{ color: "#00e676", borderColor: "rgba(0,230,118,0.45)" }}>
                      CMD
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
            title="Cliquer pour modifier l'affichage ou le thème"
          >
            <div className="lspd-badge-monogram">
              #{String(agentMatricule || "00").slice(0, 3)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {agentDisplayName}
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--gold-seal)" }}>
                {roleShortTag} · #{agentMatricule}
              </div>
              <div style={{ fontSize: 10.5, display: "flex", alignItems: "center", gap: 5, color: "#22c55e", fontWeight: 700 }}>
                <span className="live-green-dot" style={{ width: 6, height: 6 }}></span>
                <span>{currentUser?.rank || meta.roleLabel || "OFFICIER LSPD"}</span>
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
                value={theme}
                onChange={e => setTheme(e.target.value)}
              >
                <option value="lspd-blue">LSPD MDT — Bleu Officiel</option>
                <option value="doj-gold">DOJ — Bleu & Or</option>
                <option value="tactical-cyan">Tactique — Bleu Nuit & Cyan</option>
              </select>
            </div>
          )}

          {serverOnline && currentUser ? (
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-right-from-bracket"></i> Déconnexion ({currentUser.username})
            </button>
          ) : (
            <button className="btn-logout" onClick={handleResetToSheetSample}>
              <i className="fas fa-rotate-left"></i> Réinitialiser Dossier
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT & TOPBAR LSPD */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 style={{ fontSize: 17 }}>{PAGE_TITLES[activeTab] || "TERMINAL LSPD"}</h1>
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isDojOrCommand && (
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setActiveTab("doj-portal");
                  refreshSharedData();
                }}
                style={{
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  borderColor: "var(--gold-seal)",
                  color: "var(--gold-seal)"
                }}
              >
                <i className="fas fa-scale-balanced"></i>
                <span className="hide-mobile">Portail DOJ</span>
                {pendingDojCount > 0 && (
                  <span style={{ background: "#dfb556", color: "#050a14", borderRadius: 99, padding: "1px 6px", fontWeight: 800, fontSize: 11 }}>
                    {pendingDojCount}
                  </span>
                )}
              </button>
            )}
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setActiveTab("reports")}
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              <i className="fas fa-file-shield" style={{ color: "var(--accent)" }}></i>
              <span className="hide-mobile">Rapports</span>
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
              <span className="role-badge patron" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img
                  src={LSPD_LOGO_DATA_URL}
                  alt="LSPD"
                  style={{ width: 16, height: 16, objectFit: "contain", borderRadius: "50%" }}
                />
                {roleShortTag}
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
              onUpdateHistoryItem={handleUpdateHistoryItem}
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
              onCreateReportFromCalculator={handleCreateReportFromCalculator}
              activeReportTemplateId={activeReportTemplateId}
              setActiveReportTemplateId={setActiveReportTemplateId}
            />
          )}

          {activeTab === "reports" && (
            <ReportsView
              reports={reports}
              activeReportId={activeReportId}
              setActiveReportId={setActiveReportId}
              onSaveReport={handleSaveReport}
              onDeleteReport={handleDeleteReport}
              onRefreshReports={serverOnline ? refreshSharedData : undefined}
              onOpenCalculator={() => setActiveTab("calculator")}
              meta={meta}
              summary={summary}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "doj-portal" && isDojOrCommand && (
            <DojReviewPortalView
              reports={reports}
              dojRequests={dojRequests}
              onReviewReport={handleReviewReport}
              onReviewDojRequest={handleReviewDojRequest}
              onRefreshAll={serverOnline ? refreshSharedData : undefined}
              currentUser={currentUser}
            />
          )}

          {activeTab === "doj-requests" && (
            <DojRequestsView
              meta={meta}
              onSendSuspectToCalculator={handleSendSuspectToCalculator}
              serverRequests={serverOnline ? dojRequests : null}
              onSaveDojRequest={serverOnline ? handleSaveDojRequest : undefined}
              onDeleteDojRequest={serverOnline ? handleDeleteDojRequest : undefined}
              onRefreshDojRequests={serverOnline ? refreshSharedData : undefined}
              currentUser={currentUser}
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

          {activeTab === "users" && isHighCommand && serverOnline && (
            <UserManagementView currentUser={currentUser} dbMode={dbMode} />
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
