import React, { useState, useMemo, useRef, useEffect } from "react";
import { DOJ_TEMPLATES, DOJ_TEMPLATE_GROUPS } from "../data/dojTemplates";
import PrintReportModal from "./PrintReportModal";
import { syncSigningAgentInText } from "../utils/generatePrintableReport";
import { LSPD_LOGO_DATA_URL } from "../assets/lspdLogo";

const STORAGE_DOJ_KEY = "sa_lspd_doj_requests_v1";

const DOJ_STATUS_BADGES = {
  draft:             { label: "Brouillon LSPD",          color: "#94a3b8", bg: "rgba(148, 163, 184, 0.16)" },
  submitted:         { label: "Transmis au DOJ",         color: "#38bdf8", bg: "rgba(56, 189, 248, 0.16)" },
  pending:           { label: "En attente Juge",         color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  approved:          { label: "Mandat Approuvé DOJ",     color: "#00e676", bg: "rgba(0, 230, 118, 0.16)" },
  changes_requested: { label: "Complément requis (DOJ)", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.22)" },
  executed:          { label: "Mandat Exécuté",          color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)" },
  rejected:          { label: "Mandat Refusé (DOJ)",     color: "#ef4444", bg: "rgba(239, 68, 68, 0.16)" }
};

const URGENCY_BADGES = {
  critical: { label: "Code 3 • Urgent / Raid", color: "#ef4444" },
  high:     { label: "Code 2 • Prioritaire",   color: "#f59e0b" },
  medium:   { label: "Code 1 • Standard",      color: "#38bdf8" }
};

function getNextExhibitCode(exhibits = []) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const idx = exhibits.length;
  if (idx < letters.length) return `PIÈCE ${letters[idx]}`;
  return `PIÈCE ${idx + 1}`;
}

/**
 * Compresse proprement une image importée ou collée (max 1400px, JPEG 0.84)
 * afin de garder une qualité nette pour l'impression FiveM sans saturer localStorage.
 */
function compressImageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const maxDim = 1400;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(c.toDataURL("image/jpeg", 0.84));
        } catch {
          resolve(reader.result);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function buildInitialSampleRequests() {
  const tpl = DOJ_TEMPLATES[0];
  const sampleExhibits = [
    {
      id: "ex_demo_1",
      code: "PIÈCE A",
      title: "Rapport d'observation & repérage des entrées armées au QG",
      source: "Detective Bureau / Air-One",
      date: "28/11/2026",
      description: "Relevé des plaques de 3 véhicules impliqués dans deux braquages Fleeca stationnés devant l'entrepôt.",
      imageData: "",
      imageUrl: ""
    }
  ];
  const sample = {
    id: "doj_sample_1",
    requestNumber: "DOJ-RAID-2026-001",
    title: "Demande de Descente — Entrepôt Sud Cypress Flats (Trafic d'Armes)",
    templateId: tpl.id,
    status: "draft",
    urgency: "critical",
    leadAgent: "16 | Vance Winchester",
    commandVisa: "",
    division: "Detective Bureau / SWAT / Command Staff LSPD",
    authority: tpl.defaultAuthority,
    validity: tpl.defaultValidity,
    targetName: "Dirigeants & membres armés identifiés",
    targetGroup: "Organisation Criminelle (Cypress Flats)",
    targetLocation: "Cypress Flats — Entrepôt n°4 & parking attenant",
    charges: "Art. 601 Association de malfaiteurs, Art. 701 Armes Cat. A/B, Art. 403 Braquage en bande organisée",
    createdAt: "28/11/2026 10:30",
    exhibits: sampleExhibits,
    reportText: ""
  };
  sample.reportText = tpl.generateContent({
    requestNumber: sample.requestNumber,
    agent: sample.leadAgent,
    division: sample.division,
    authority: sample.authority,
    targetName: sample.targetName,
    targetGroup: sample.targetGroup,
    targetLocation: sample.targetLocation,
    charges: sample.charges,
    validity: sample.validity,
    date: "28/11/2026",
    heure: "10:30",
    exhibits: sample.exhibits
  });
  return [sample];
}

export default function DojRequestsView({
  meta,
  onSendSuspectToCalculator,
  serverRequests = null,
  onSaveDojRequest,
  onDeleteDojRequest,
  onRefreshDojRequests,
  currentUser
}) {
  const isServerSynced = Array.isArray(serverRequests) && typeof onSaveDojRequest === "function";
  const canSetDojStatusDirectly = Boolean(currentUser && ["DOJ", "HIGH_COMMAND", "ADMIN"].includes(currentUser.role));

  const [requests, setRequests] = useState(() => {
    if (isServerSynced) return serverRequests;
    try {
      const saved = localStorage.getItem(STORAGE_DOJ_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return buildInitialSampleRequests();
    } catch {
      return buildInitialSampleRequests();
    }
  });

  const syncTimerRef = useRef(null);
  const dirtyIdRef = useRef(null);
  const dirtyUntilRef = useRef(0);
  const [savingToServer, setSavingToServer] = useState(false);

  useEffect(() => {
    if (!isServerSynced) return;
    setRequests(prev => {
      const hasActiveLocalEdit = dirtyIdRef.current && Date.now() < dirtyUntilRef.current;
      if (!hasActiveLocalEdit) return serverRequests;
      const localMap = new Map(prev.map(r => [r.id, r]));
      return serverRequests.map(sr => {
        if (sr.id !== dirtyIdRef.current) return sr;
        const local = localMap.get(sr.id);
        if (!local) return sr;
        return {
          ...local,
          status: sr.dojReviewerName ? sr.status : local.status,
          dojReviewerName: sr.dojReviewerName,
          dojReviewerRank: sr.dojReviewerRank,
          dojComment: sr.dojComment,
          dojReviewedAt: sr.dojReviewedAt,
          commandVisa: sr.dojReviewerName && sr.status === "approved" ? sr.commandVisa : local.commandVisa
        };
      });
    });
  }, [isServerSynced, serverRequests]);

  const [activeReqId, setActiveReqId] = useState(() => requests[0]?.id || null);
  const [subView, setSubView] = useState("dossiers"); // "templates" | "dossiers"
  const [templateGroupFilter, setTemplateGroupFilter] = useState("ALL");
  const [templateSearch, setTemplateSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [storageWarning, setStorageWarning] = useState(null);
  const [zoomedExhibit, setZoomedExhibit] = useState(null);

  // Add Exhibit form state
  const [exhibitTitle, setExhibitTitle] = useState("");
  const [exhibitSource, setExhibitSource] = useState("Bodycam / Surveillance LSPD");
  const [exhibitDesc, setExhibitDesc] = useState("");
  const [exhibitUrl, setExhibitUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // New Request Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    templateId: DOJ_TEMPLATES[0].id,
    requestNumber: `DOJ-RAID-2026-${String(Math.floor(100 + Math.random() * 899))}`,
    title: "",
    leadAgent: meta?.agent || "16 | Vance Winchester",
    division: "Detective Bureau / SWAT / Command Staff LSPD",
    authority: DOJ_TEMPLATES[0].defaultAuthority,
    validity: DOJ_TEMPLATES[0].defaultValidity,
    targetName: "",
    targetGroup: "",
    targetLocation: "",
    charges: "",
    urgency: "critical"
  });

  const saveRequests = (next, changedItem = null, immediateServerSave = false) => {
    setRequests(next);
    if (isServerSynced && changedItem) {
      dirtyIdRef.current = changedItem.id;
      dirtyUntilRef.current = Date.now() + 2500;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (immediateServerSave) {
        setSavingToServer(true);
        Promise.resolve(onSaveDojRequest(changedItem)).finally(() => {
          setSavingToServer(false);
          dirtyUntilRef.current = 0;
        });
      } else {
        syncTimerRef.current = setTimeout(() => {
          Promise.resolve(onSaveDojRequest(changedItem)).finally(() => {
            dirtyUntilRef.current = 0;
          });
        }, 650);
      }
      return;
    }
    try {
      localStorage.setItem(STORAGE_DOJ_KEY, JSON.stringify(next));
      setStorageWarning(null);
    } catch {
      setStorageWarning(
        "Attention : espace localStorage presque plein (trop d'images haute résolution). Vos preuves restent imprimables dans cette session, mais pensez à supprimer d'anciennes demandes si besoin."
      );
    }
  };

  const activeReq = useMemo(() => {
    return requests.find(r => r.id === activeReqId) || requests[0] || null;
  }, [requests, activeReqId]);

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return DOJ_TEMPLATES.filter(t => {
      if (templateGroupFilter !== "ALL" && t.group !== templateGroupFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.legalBasis.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [templateGroupFilter, templateSearch]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter(r => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.requestNumber || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.targetName || "").toLowerCase().includes(q) ||
        (r.targetGroup || "").toLowerCase().includes(q) ||
        (r.targetLocation || "").toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery, statusFilter]);

  const handlePatchRequestById = (reqId, patch) => {
    if (!reqId) return;
    let updatedTarget = null;
    setRequests(prev => {
      const next = prev.map(r => {
        if (r.id !== reqId) return r;
        updatedTarget = { ...r, ...patch };
        return updatedTarget;
      });
      if (!isServerSynced) {
        try {
          localStorage.setItem(STORAGE_DOJ_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
    if (isServerSynced && updatedTarget) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => onSaveDojRequest(updatedTarget), 450);
    }
  };

  const handleUpdateActiveReq = (field, value, immediate = false) => {
    if (!activeReq) return;
    let updatedItem = null;
    const next = requests.map(r => {
      if (r.id !== activeReq.id) return r;
      if (field === "leadAgent" && r.reportText) {
        updatedItem = {
          ...r,
          leadAgent: value,
          reportText: syncSigningAgentInText(r.reportText, value)
        };
        return updatedItem;
      }
      updatedItem = { ...r, [field]: value };
      return updatedItem;
    });
    saveRequests(next, updatedItem, immediate);
  };

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const tpl = DOJ_TEMPLATES.find(t => t.id === newForm.templateId) || DOJ_TEMPLATES[0];
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const titleVal = newForm.title.trim() || tpl.title;
    const chosenAgent = (newForm.leadAgent || "").trim() || meta?.agent || "16 | Vance Winchester";

    const reportText = tpl.generateContent({
      requestNumber: newForm.requestNumber,
      agent: chosenAgent,
      division: newForm.division,
      authority: newForm.authority,
      targetName: newForm.targetName,
      targetGroup: newForm.targetGroup,
      targetLocation: newForm.targetLocation,
      charges: newForm.charges,
      validity: newForm.validity,
      date: dateStr,
      heure: heureStr,
      exhibits: []
    });

    const created = {
      id: `doj_${Date.now()}`,
      requestNumber: newForm.requestNumber || `DOJ-2026-${Math.floor(100 + Math.random() * 899)}`,
      title: titleVal,
      templateId: tpl.id,
      status: "draft",
      urgency: newForm.urgency || tpl.defaultUrgency,
      leadAgent: chosenAgent,
      commandVisa: "",
      division: newForm.division,
      authority: newForm.authority,
      validity: newForm.validity,
      targetName: newForm.targetName.trim() || "À préciser",
      targetGroup: newForm.targetGroup.trim() || "À préciser",
      targetLocation: newForm.targetLocation.trim() || "Los Santos",
      charges: newForm.charges.trim() || "",
      createdAt: `${dateStr} ${heureStr}`,
      exhibits: [],
      reportText
    };

    const next = [created, ...requests];
    saveRequests(next, created, true);
    setActiveReqId(created.id);
    setShowNewModal(false);
    setSubView("dossiers");
    setNewForm(prev => ({
      ...prev,
      requestNumber: `DOJ-RAID-2026-${String(Math.floor(100 + Math.random() * 899))}`,
      title: "",
      targetName: "",
      targetGroup: "",
      targetLocation: "",
      charges: ""
    }));
  };

  const handleUseTemplate = (tpl) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const prefix = tpl.category.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase() || "DOJ";
    const num = `DOJ-${prefix}-${Math.floor(100 + Math.random() * 899)}`;
    const chosenAgent = meta?.agent || "16 | Vance Winchester";

    const generated = tpl.generateContent({
      requestNumber: num,
      agent: chosenAgent,
      division: "Detective Bureau / Command Staff LSPD",
      authority: tpl.defaultAuthority,
      targetName: meta?.prevenu || "Cible / Suspect",
      targetGroup: "",
      targetLocation: "Los Santos",
      charges: "",
      validity: tpl.defaultValidity,
      date: dateStr,
      heure: heureStr,
      exhibits: []
    });

    const created = {
      id: `doj_${Date.now()}`,
      requestNumber: num,
      title: `${tpl.category} — ${meta?.prevenu || "Nouvelle Demande DOJ"}`,
      templateId: tpl.id,
      status: "draft",
      urgency: tpl.defaultUrgency,
      leadAgent: chosenAgent,
      commandVisa: "",
      division: "Detective Bureau / Command Staff LSPD",
      authority: tpl.defaultAuthority,
      validity: tpl.defaultValidity,
      targetName: meta?.prevenu || "À préciser",
      targetGroup: "",
      targetLocation: "Los Santos",
      charges: "",
      createdAt: `${dateStr} ${heureStr}`,
      exhibits: [],
      reportText: generated
    };

    const next = [created, ...requests];
    saveRequests(next, created, true);
    setActiveReqId(created.id);
    setSubView("dossiers");
  };

  const handleApplyTemplateToActive = (tplId) => {
    if (!activeReq) return;
    const tpl = DOJ_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const [d, h] = (activeReq.createdAt || "").split(" ");
    const regenerated = tpl.generateContent({
      requestNumber: activeReq.requestNumber,
      agent: activeReq.leadAgent || meta?.agent,
      division: activeReq.division,
      authority: activeReq.authority || tpl.defaultAuthority,
      targetName: activeReq.targetName,
      targetGroup: activeReq.targetGroup,
      targetLocation: activeReq.targetLocation,
      charges: activeReq.charges,
      validity: activeReq.validity || tpl.defaultValidity,
      date: d || new Date().toLocaleDateString("fr-FR"),
      heure: h || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      exhibits: activeReq.exhibits || []
    });
    handleUpdateActiveReq("reportText", regenerated);
  };

  const handleDeleteRequest = (id) => {
    const next = requests.filter(r => r.id !== id);
    if (isServerSynced && onDeleteDojRequest) {
      onDeleteDojRequest(id);
    }
    saveRequests(next);
    if (activeReqId === id) {
      setActiveReqId(next[0]?.id || null);
    }
  };

  // --- GESTION DES PREUVES / PIÈCES JOINTES PHOTO & TEXTE ---
  const appendExhibitsToActive = (newItems) => {
    if (!activeReq || !newItems.length) return;
    const currentList = Array.isArray(activeReq.exhibits) ? activeReq.exhibits : [];
    const merged = [...currentList, ...newItems];
    handleUpdateActiveReq("exhibits", merged);
  };

  const handleImportImageFiles = async (fileList) => {
    if (!activeReq || !fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const existing = Array.isArray(activeReq.exhibits) ? activeReq.exhibits : [];
    const today = new Date().toLocaleDateString("fr-FR");
    const created = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const dataUrl = await compressImageFileToDataUrl(f);
        const cleanName = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        created.push({
          id: `ex_${Date.now()}_${i}`,
          code: getNextExhibitCode([...existing, ...created]),
          title: exhibitTitle.trim() || cleanName || "Capture / Preuve photographique",
          source: exhibitSource.trim() || "Bodycam / Surveillance LSPD",
          date: today,
          description: exhibitDesc.trim(),
          imageData: dataUrl,
          imageUrl: ""
        });
      } catch {
        // skip unreadable file
      }
    }

    if (created.length > 0) {
      appendExhibitsToActive(created);
      setExhibitTitle("");
      setExhibitDesc("");
    }
  };

  const handlePasteProof = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleImportImageFiles(imageFiles);
    }
  };

  const handleAddManualOrUrlExhibit = () => {
    if (!activeReq) return;
    const hasTitle = exhibitTitle.trim().length > 0;
    const hasUrl = exhibitUrl.trim().length > 0;
    const hasDesc = exhibitDesc.trim().length > 0;
    if (!hasTitle && !hasUrl && !hasDesc) return;

    const existing = Array.isArray(activeReq.exhibits) ? activeReq.exhibits : [];
    const today = new Date().toLocaleDateString("fr-FR");

    appendExhibitsToActive([
      {
        id: `ex_${Date.now()}`,
        code: getNextExhibitCode(existing),
        title: exhibitTitle.trim() || (hasUrl ? "Preuve visuelle (Lien image)" : "Pièce à conviction"),
        source: exhibitSource.trim() || "Enquête LSPD",
        date: today,
        description: exhibitDesc.trim(),
        imageData: "",
        imageUrl: exhibitUrl.trim()
      }
    ]);
    setExhibitTitle("");
    setExhibitDesc("");
    setExhibitUrl("");
  };

  const handleUpdateExhibit = (exId, field, value) => {
    if (!activeReq) return;
    const nextList = (activeReq.exhibits || []).map(ex =>
      ex.id === exId ? { ...ex, [field]: value } : ex
    );
    handleUpdateActiveReq("exhibits", nextList);
  };

  const handleReplaceExhibitImage = async (exId, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      handleUpdateExhibit(exId, "imageData", dataUrl);
    } catch {
      // ignore
    }
  };

  const handleRemoveExhibit = (exId) => {
    if (!activeReq) return;
    const nextList = (activeReq.exhibits || []).filter(ex => ex.id !== exId);
    handleUpdateActiveReq("exhibits", nextList);
  };

  const handleSyncExhibitsIntoReportText = () => {
    if (!activeReq) return;
    const list = activeReq.exhibits || [];
    const summaryLines =
      list.length === 0
        ? "• Aucune pièce photographique ou scellé joint."
        : list
            .map(ex => {
              const m = [ex.source, ex.date].filter(Boolean).join(" — ");
              const tag = ex.imageData || ex.imageUrl ? " [PHOTO ANNEXÉE]" : "";
              return `• [${ex.code || "PIÈCE"}] ${ex.title || "Preuve"}${m ? ` (${m})` : ""}${tag}${ex.description ? ` : ${ex.description}` : ""}`;
            })
            .join("\n");

    const sectionRegex = /(\[\d+\.\s*(?:PIÈCES|INVENTAIRE DES PIÈCES|PREUVES PHOTOGRAPHIQUES)[^\]]*\]\n)([\s\S]*?)(\n\n\[\d+\.|\n\nRequête soumise)/i;
    const txt = activeReq.reportText || "";
    if (sectionRegex.test(txt)) {
      const updated = txt.replace(sectionRegex, `$1${summaryLines}$3`);
      handleUpdateActiveReq("reportText", updated);
    } else {
      handleUpdateActiveReq(
        "reportText",
        `${txt}\n\n[PIÈCES À CONVICTION & PREUVES ANNEXÉES]\n${summaryLines}`
      );
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
            <img
              src={LSPD_LOGO_DATA_URL}
              alt="LSPD"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
            <button
              type="button"
              className={`btn ${subView === "dossiers" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("dossiers")}
            >
              <i className="fas fa-gavel"></i> Mes Demandes DOJ ({requests.length})
            </button>
            <button
              type="button"
              className={`btn ${subView === "templates" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("templates")}
            >
              <i className="fas fa-file-contract"></i> Templates Descentes & Mandats DOJ ({DOJ_TEMPLATES.length})
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onRefreshDojRequests && (
              <button type="button" className="btn btn-sm btn-outline" onClick={onRefreshDojRequests}>
                <i className="fas fa-arrows-rotate"></i> Actualiser
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowNewModal(true)}
            >
              <i className="fas fa-plus-circle"></i> Nouvelle Demande DOJ
            </button>
          </div>
        </div>
      </div>

      {storageWarning && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(245, 158, 11, 0.14)",
            border: "1px solid rgba(245, 158, 11, 0.45)",
            color: "#fbbf24",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <i className="fas fa-triangle-exclamation" style={{ marginRight: 8 }}></i>
          {storageWarning}
        </div>
      )}

      {/* VIEW 1: BIBLIOTHÈQUE DES 10 TEMPLATES OFFICIELS DOJ */}
      {subView === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                className="input"
                style={{ flex: "1 1 260px" }}
                placeholder="Rechercher un template DOJ (ex: Descente, Raid, Perquisition, Mandat d'arrêt, Écoutes, Bancaire, Art. 158)..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DOJ_TEMPLATE_GROUPS.map(g => (
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
                requestNumber: "DOJ-2026-001",
                agent: meta?.agent || "16 | Vance Winchester",
                division: "Detective Bureau / LSPD",
                authority: tpl.defaultAuthority,
                targetName: meta?.prevenu || "Cible / Suspect",
                targetGroup: "",
                targetLocation: "Los Santos",
                charges: "",
                validity: tpl.defaultValidity,
                date: meta?.date || new Date().toLocaleDateString("fr-FR"),
                heure: meta?.heure || "10:30",
                exhibits: []
              });

              return (
                <div key={tpl.id} className="weapon-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="weapon-card-top">
                    <div className="weapon-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={`fas fa-${tpl.icon}`} style={{ color: "var(--gold-seal)" }}></i>
                      <span>{tpl.title}</span>
                    </div>
                    <span className={`cat-badge ${tpl.badgeClass}`}>{tpl.category}</span>
                  </div>

                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gold-seal)" }} className="mono">
                    <i className="fas fa-scale-balanced" style={{ marginRight: 5 }}></i>
                    Base légale : {tpl.legalBasis}
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
                      maxHeight: 145,
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
                      <i className="fas fa-folder-plus"></i> Ouvrir & Joindre Preuves
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                      onClick={() =>
                        setPrintPayload({
                          title: tpl.title,
                          docNumber: `DOJ-${tpl.category.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase()}-2026`,
                          date: meta?.date,
                          agent: meta?.agent,
                          prevenu: meta?.prevenu,
                          reportText: sampleText,
                          exhibits: []
                        })
                      }
                    >
                      <i className="fas fa-print"></i> Imprimer
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleCopyText(tpl.id, sampleText)}
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

      {/* VIEW 2: GESTIONNAIRE DES DEMANDES DOJ + PREUVES PHOTOS + IMPRESSION */}
      {subView === "dossiers" && (
        <div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          {/* LEFT LIST OF DOJ REQUESTS */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-scale-balanced" style={{ color: "var(--gold-seal)" }}></i> Registre DOJ ({filteredRequests.length})
              </h2>
            </div>

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                className="input"
                placeholder="Rechercher N° requête, descente, gang, lieu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />

              <select
                className="select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tous les statuts DOJ ({requests.length})</option>
                {Object.entries(DOJ_STATUS_BADGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "68vh", overflowY: "auto" }}>
                {filteredRequests.map(r => {
                  const isSelected = activeReq?.id === r.id;
                  const st = DOJ_STATUS_BADGES[r.status] || DOJ_STATUS_BADGES.draft;
                  const urg = URGENCY_BADGES[r.urgency] || URGENCY_BADGES.high;
                  const exCount = (r.exhibits || []).length;
                  const photoCount = (r.exhibits || []).filter(e => e.imageData || e.imageUrl).length;

                  return (
                    <div
                      key={r.id}
                      onClick={() => setActiveReqId(r.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--bg-secondary)",
                        border: `1px solid ${isSelected ? "var(--gold-seal)" : "var(--border)"}`,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold-seal)" }}>
                          {r.requestNumber}
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
                        {r.title}
                      </div>

                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <i className="fas fa-crosshairs" style={{ marginRight: 5, color: "var(--accent)" }}></i>
                          {r.targetGroup || r.targetName}
                        </span>
                        <span style={{ color: urg.color, fontWeight: 700, whiteSpace: "nowrap" }}>{urg.label}</span>
                      </div>

                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span>
                          <i className="fas fa-signature" style={{ marginRight: 4, color: "var(--gold-seal)" }}></i>
                          {r.leadAgent || "LSPD"}
                        </span>
                        <span style={{ color: exCount > 0 ? "var(--blue)" : "var(--text-muted)", fontWeight: 700 }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 4 }}></i>
                          {exCount} preuve{exCount > 1 ? "s" : ""}{photoCount > 0 ? ` (${photoCount} 📷)` : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredRequests.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                    Aucune demande DOJ trouvée.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT WORKSPACE: METADATA + PHOTO EVIDENCE + EDITABLE DOJ REQUEST */}
          {activeReq ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* BANDEAU DÉCISION / RETOUR DU DOJ */}
              {activeReq.status && activeReq.status !== "draft" && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 10,
                    background: (DOJ_STATUS_BADGES[activeReq.status] || DOJ_STATUS_BADGES.submitted).bg,
                    border: `1.5px solid ${(DOJ_STATUS_BADGES[activeReq.status] || DOJ_STATUS_BADGES.submitted).color}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: (DOJ_STATUS_BADGES[activeReq.status] || DOJ_STATUS_BADGES.submitted).color
                      }}
                    >
                      <i className="fas fa-gavel" style={{ marginRight: 8 }}></i>
                      STATUT DOJ : {(DOJ_STATUS_BADGES[activeReq.status] || DOJ_STATUS_BADGES.submitted).label.toUpperCase()}
                    </span>
                    {activeReq.dojReviewerName && (
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)" }}>
                        Décision de : <strong>{activeReq.dojReviewerName}</strong>{" "}
                        {activeReq.dojReviewedAt ? `• ${activeReq.dojReviewedAt}` : ""}
                      </span>
                    )}
                  </div>
                  {activeReq.dojComment && (
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
                      <strong style={{ color: (DOJ_STATUS_BADGES[activeReq.status] || DOJ_STATUS_BADGES.submitted).color }}>
                        Explication / Retour DOJ :
                      </strong>{" "}
                      {activeReq.dojComment}
                    </div>
                  )}
                </div>
              )}

              {/* 1. METADATA & SIGNATURES */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={LSPD_LOGO_DATA_URL} alt="LSPD" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    <span>Requête {activeReq.requestNumber} — {activeReq.title}</span>
                  </h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isServerSynced && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={savingToServer}
                        onClick={() => saveRequests(requests, activeReq, true)}
                      >
                        <i className={`fas fa-${savingToServer ? "spinner fa-spin" : "floppy-disk"}`}></i> Enregistrer
                      </button>
                    )}

                    {activeReq.status !== "approved" && activeReq.status !== "executed" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={savingToServer}
                        onClick={() => handleUpdateActiveReq("status", "submitted", true)}
                        style={{ borderColor: "var(--gold-seal)" }}
                      >
                        <i className="fas fa-paper-plane"></i>{" "}
                        {activeReq.status === "changes_requested" || activeReq.status === "rejected"
                          ? "Re-transférer au DOJ"
                          : activeReq.status === "submitted"
                          ? "Actualiser au DOJ"
                          : "Transférer au DOJ"}
                      </button>
                    )}

                    {onSendSuspectToCalculator && activeReq.targetName && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => onSendSuspectToCalculator(activeReq.targetName)}
                      >
                        <i className="fas fa-calculator"></i> Peines de la cible
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                      onClick={() =>
                        setPrintPayload({
                          reqId: activeReq.id,
                          title: activeReq.title,
                          docNumber: activeReq.requestNumber,
                          date: (activeReq.createdAt || "").split(" ")[0] || meta?.date,
                          agent: activeReq.leadAgent || meta?.agent,
                          commandVisa: activeReq.commandVisa || "",
                          prevenu: activeReq.targetGroup
                            ? `${activeReq.targetName} (${activeReq.targetGroup})`
                            : activeReq.targetName,
                          reportText: activeReq.reportText,
                          exhibits: activeReq.exhibits || [],
                          approved: activeReq.status === "approved",
                          statusLabel: (DOJ_STATUS_BADGES[activeReq.status]?.label || "DOSSIER DOJ").toUpperCase()
                        })
                      }
                    >
                      <i className="fas fa-print"></i> Imprimer en jeu ({(activeReq.exhibits || []).length} preuve{(activeReq.exhibits || []).length > 1 ? "s" : ""})
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteRequest(activeReq.id)}
                    >
                      <i className="fas fa-trash"></i> Supprimer
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>N° Requête DOJ</label>
                      <input
                        type="text"
                        value={activeReq.requestNumber}
                        onChange={e => handleUpdateActiveReq("requestNumber", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Intitulé de la Demande DOJ (Descente, Perquisition, Mandat...)</label>
                      <input
                        type="text"
                        value={activeReq.title}
                        onChange={e => handleUpdateActiveReq("title", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut DOJ {!canSetDojStatusDirectly && isServerSynced ? "(Validé par le DOJ)" : ""}</label>
                      <select
                        value={activeReq.status}
                        disabled={isServerSynced && !canSetDojStatusDirectly}
                        onChange={e => handleUpdateActiveReq("status", e.target.value, true)}
                      >
                        {Object.entries(DOJ_STATUS_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* BANDEAU SIGNATURE & VISA MAGISTRAT */}
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
                        Officier demandeur / Signataire
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 16 | Vance Winchester"
                        value={activeReq.leadAgent ?? ""}
                        onChange={e => handleUpdateActiveReq("leadAgent", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>
                        <i className="fas fa-gavel" style={{ marginRight: 5 }}></i>
                        Visa Juge / Procureur / Commandement
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Juge Harrison / Procureur..."
                        value={activeReq.commandVisa || ""}
                        onChange={e => handleUpdateActiveReq("commandVisa", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Autorité DOJ saisie</label>
                      <input
                        type="text"
                        value={activeReq.authority || ""}
                        onChange={e => handleUpdateActiveReq("authority", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Validité demandée</label>
                      <input
                        type="text"
                        value={activeReq.validity || ""}
                        onChange={e => handleUpdateActiveReq("validity", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cible(s) / Suspect(s) visé(s)</label>
                      <input
                        type="text"
                        value={activeReq.targetName || ""}
                        onChange={e => handleUpdateActiveReq("targetName", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Gang / Organisation / Entreprise</label>
                      <input
                        type="text"
                        value={activeReq.targetGroup || ""}
                        onChange={e => handleUpdateActiveReq("targetGroup", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Lieu / QG / Bien / Véhicules visés</label>
                      <input
                        type="text"
                        value={activeReq.targetLocation || ""}
                        onChange={e => handleUpdateActiveReq("targetLocation", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Priorité / Urgence</label>
                      <select
                        value={activeReq.urgency || "high"}
                        onChange={e => handleUpdateActiveReq("urgency", e.target.value)}
                      >
                        {Object.entries(URGENCY_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                      <label>Chefs d'inculpation & Articles du Code Pénal visés</label>
                      <input
                        type="text"
                        placeholder="Ex: Art. 601 Association de malfaiteurs, Art. 701 Armes Cat. A/B, Art. 403 Braquage..."
                        value={activeReq.charges || ""}
                        onChange={e => handleUpdateActiveReq("charges", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Division / Unités</label>
                      <input
                        type="text"
                        value={activeReq.division || ""}
                        onChange={e => handleUpdateActiveReq("division", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Date & Heure</label>
                      <input
                        type="text"
                        value={activeReq.createdAt || ""}
                        onChange={e => handleUpdateActiveReq("createdAt", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PIÈCES À CONVICTION & PREUVES PHOTOGRAPHIQUES JOINTES (IMPRIMABLES EN JEU !) */}
              <div className="card" onPaste={handlePasteProof}>
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2>
                    <i className="fas fa-images" style={{ color: "var(--gold-seal)" }}></i> Pièces à Conviction & Preuves Jointes ({(activeReq.exhibits || []).length}) — Imprimables sur la feuille DOJ
                  </h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleSyncExhibitsIntoReportText}
                      title="Mettre à jour la liste des pièces dans le texte de la requête sans perdre vos modifications"
                    >
                      <i className="fas fa-list-check"></i> Synchroniser dans le texte
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="fas fa-upload"></i> Importer Photo(s) / Captures
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={e => {
                        handleImportImageFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* ZONE DRAG & DROP / CTRL+V + AJOUT MANUEL / URL */}
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleImportImageFiles(e.dataTransfer.files);
                    }}
                    style={{
                      border: `2px dashed ${isDragging ? "var(--gold-seal)" : "rgba(59, 130, 246, 0.45)"}`,
                      background: isDragging ? "rgba(223, 181, 86, 0.08)" : "rgba(10, 22, 42, 0.65)",
                      borderRadius: 10,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>
                        <i className="fas fa-cloud-arrow-up" style={{ color: "var(--gold-seal)", marginRight: 6 }}></i>
                        Glissez-déposez des photos ici, faites <span className="mono" style={{ color: "var(--gold-seal)" }}>Ctrl+V</span> d'une capture d'écran, ou ajoutez une pièce ci-dessous :
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        Les photos jointes seront imprimées automatiquement sur la feuille papier A4 officielle !
                      </span>
                    </div>

                    <div className="form-row" style={{ marginBottom: 0 }}>
                      <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                        <label>Titre / Légende de la preuve</label>
                        <input
                          type="text"
                          placeholder="Ex: Photo QG — Suspects armés devant l'entrepôt"
                          value={exhibitTitle}
                          onChange={e => setExhibitTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Source (Bodycam, Air-One, CCTV...)</label>
                        <input
                          type="text"
                          placeholder="Ex: Bodycam #16 / Air-One"
                          value={exhibitSource}
                          onChange={e => setExhibitSource(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1.3, marginBottom: 0 }}>
                        <label>Lien URL Image (Optionnel si upload/Ctrl+V)</label>
                        <input
                          type="text"
                          placeholder="https://... (.png / .jpg)"
                          value={exhibitUrl}
                          onChange={e => setExhibitUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1, padding: "7px 10px", fontSize: 13 }}
                        placeholder="Description / détail complémentaire de la pièce (ex: Plaque ABC-123, arme Cat. A visible à la ceinture...)"
                        value={exhibitDesc}
                        onChange={e => setExhibitDesc(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleAddManualOrUrlExhibit}
                      >
                        <i className="fas fa-plus"></i> Ajouter la Pièce
                      </button>
                    </div>
                  </div>

                  {/* LISTE / GALERIE DES PREUVES JOINTES */}
                  {(activeReq.exhibits || []).length === 0 ? (
                    <div style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
                      Aucune preuve jointe à cette demande DOJ. Importez des photos ou faites <strong>Ctrl+V</strong> pour les joindre et les imprimer en jeu.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
                      {(activeReq.exhibits || []).map(ex => {
                        const imgSrc = ex.imageData || ex.imageUrl || "";
                        return (
                          <div
                            key={ex.id}
                            style={{
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              overflow: "hidden",
                              display: "flex",
                              flexDirection: "column"
                            }}
                          >
                            {/* Top exhibit bar */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 6,
                                padding: "6px 10px",
                                background: "#0b1930",
                                borderBottom: "1px solid var(--border)"
                              }}
                            >
                              <input
                                type="text"
                                className="mono"
                                style={{
                                  width: 96,
                                  background: "transparent",
                                  border: "1px solid rgba(223,181,86,0.35)",
                                  borderRadius: 4,
                                  color: "var(--gold-seal)",
                                  fontWeight: 800,
                                  fontSize: 11.5,
                                  padding: "2px 6px"
                                }}
                                value={ex.code}
                                onChange={e => handleUpdateExhibit(ex.id, "code", e.target.value)}
                              />
                              <div style={{ display: "flex", gap: 4 }}>
                                <label
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: "2px 7px", fontSize: 11, cursor: "pointer" }}
                                  title="Ajouter ou remplacer la photo de cette preuve"
                                >
                                  <i className="fas fa-camera"></i>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={e => {
                                      if (e.target.files?.[0]) {
                                        handleReplaceExhibitImage(ex.id, e.target.files[0]);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  style={{ padding: "2px 7px", fontSize: 11 }}
                                  onClick={() => handleRemoveExhibit(ex.id)}
                                  title="Supprimer cette pièce"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>

                            {/* Photo preview if attached */}
                            {imgSrc && (
                              <div
                                onClick={() => setZoomedExhibit(ex)}
                                style={{
                                  background: "#050b16",
                                  height: 165,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "zoom-in",
                                  overflow: "hidden",
                                  borderBottom: "1px solid var(--border)"
                                }}
                                title="Cliquer pour agrandir la preuve"
                              >
                                <img
                                  src={imgSrc}
                                  alt={ex.title}
                                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                />
                              </div>
                            )}

                            {/* Editable caption fields */}
                            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                              <input
                                type="text"
                                className="input"
                                style={{ padding: "5px 8px", fontSize: 13, fontWeight: 700 }}
                                placeholder="Titre de la preuve..."
                                value={ex.title || ""}
                                onChange={e => handleUpdateExhibit(ex.id, "title", e.target.value)}
                              />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 6 }}>
                                <input
                                  type="text"
                                  className="input"
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  placeholder="Source..."
                                  value={ex.source || ""}
                                  onChange={e => handleUpdateExhibit(ex.id, "source", e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="input"
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  placeholder="Date"
                                  value={ex.date || ""}
                                  onChange={e => handleUpdateExhibit(ex.id, "date", e.target.value)}
                                />
                              </div>
                              <textarea
                                rows={2}
                                className="textarea"
                                style={{ padding: "5px 8px", fontSize: 12.5, minHeight: 46 }}
                                placeholder="Description / contexte de la preuve..."
                                value={ex.description || ""}
                                onChange={e => handleUpdateExhibit(ex.id, "description", e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. TEXTE DE LA REQUÊTE DOJ (100% ÉDITABLE, COPIABLE & IMPRIMABLE) */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2>
                    <i className="fas fa-file-signature"></i> Texte Officiel de la Requête DOJ (100% Modifiable & Copiable)
                  </h2>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className="select"
                      style={{ width: 280, padding: "5px 10px", fontSize: 13 }}
                      value={activeReq.templateId || ""}
                      onChange={e => {
                        handleUpdateActiveReq("templateId", e.target.value);
                        handleApplyTemplateToActive(e.target.value);
                      }}
                    >
                      {DOJ_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.category}] {t.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleApplyTemplateToActive(activeReq.templateId || DOJ_TEMPLATES[0].id)}
                    >
                      <i className="fas fa-arrows-rotate"></i> Actualiser Template
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: "var(--gold-seal)", color: "var(--gold-seal)" }}
                      onClick={() =>
                        setPrintPayload({
                          reqId: activeReq.id,
                          title: activeReq.title,
                          docNumber: activeReq.requestNumber,
                          date: (activeReq.createdAt || "").split(" ")[0] || meta?.date,
                          agent: activeReq.leadAgent || meta?.agent,
                          commandVisa: activeReq.commandVisa || "",
                          prevenu: activeReq.targetGroup
                            ? `${activeReq.targetName} (${activeReq.targetGroup})`
                            : activeReq.targetName,
                          reportText: activeReq.reportText,
                          exhibits: activeReq.exhibits || [],
                          statusLabel: (DOJ_STATUS_BADGES[activeReq.status]?.label || "DOSSIER DOJ").toUpperCase()
                        })
                      }
                    >
                      <i className="fas fa-print"></i> Imprimer en jeu (avec Preuves)
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCopyText("active_doj_text", activeReq.reportText)}
                    >
                      <i className={`fas fa-${copiedId === "active_doj_text" ? "check" : "copy"}`}></i>
                      {copiedId === "active_doj_text" ? "Requête copiée !" : "Copier la Requête"}
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
                    value={activeReq.reportText}
                    onChange={e => handleUpdateActiveReq("reportText", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ZOOM PREUVE PHOTO */}
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
              <h2>
                <span className="mono" style={{ color: "var(--gold-seal)", marginRight: 8 }}>[{zoomedExhibit.code}]</span>
                {zoomedExhibit.title}
              </h2>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setZoomedExhibit(null)}>
                Fermer
              </button>
            </div>
            <div className="card-body" style={{ textAlign: "center", background: "#050b16" }}>
              <img
                src={zoomedExhibit.imageData || zoomedExhibit.imageUrl}
                alt={zoomedExhibit.title}
                style={{ maxWidth: "100%", maxHeight: "74vh", objectFit: "contain", borderRadius: 6 }}
              />
              {(zoomedExhibit.source || zoomedExhibit.description) && (
                <div style={{ marginTop: 10, color: "var(--text-secondary)", fontSize: 13.5 }}>
                  <strong>{zoomedExhibit.source}</strong> {zoomedExhibit.date ? `(${zoomedExhibit.date})` : ""} — {zoomedExhibit.description}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSION EN JEU AVEC PREUVES PHOTOGRAPHIQUES */}
      <PrintReportModal
        isOpen={Boolean(printPayload)}
        onClose={() => setPrintPayload(null)}
        modalTitle="Imprimer la Demande DOJ & Preuves en Jeu (Feuille Papier Officielle LSPD / DOJ)"
        downloadPrefix="Requete_DOJ_LSPD"
        title={printPayload?.title}
        docNumber={printPayload?.docNumber}
        date={printPayload?.date}
        agent={printPayload?.agent}
        initialCommandVisa={printPayload?.commandVisa || ""}
        prevenu={printPayload?.prevenu}
        reportText={printPayload?.reportText}
        exhibits={printPayload?.exhibits || []}
        stampTopText={printPayload?.approved ? "DOJ • SAN ANDREAS" : "LSPD • REQUÊTE DOJ"}
        stampMainText={printPayload?.approved ? "MANDAT APPROUVÉ" : "DOSSIER JUDICIAIRE"}
        statusLabel={printPayload?.statusLabel || "REQUÊTE DOJ"}
        onSaveChanges={
          printPayload?.reqId
            ? ({ agent: nextAgent, commandVisa: nextVisa, docNumber: nextDoc, reportText: nextText }) => {
                handlePatchRequestById(printPayload.reqId, {
                  leadAgent: nextAgent,
                  commandVisa: nextVisa,
                  requestNumber: nextDoc,
                  ...(nextText ? { reportText: nextText } : {})
                });
              }
            : undefined
        }
      />

      {/* MODAL NOUVELLE DEMANDE DOJ */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div className="card" style={{ maxWidth: 720, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-gavel" style={{ color: "var(--gold-seal)" }}></i> Nouvelle Demande DOJ (Descente, Perquisition, Mandat...)
              </h2>
              <button className="btn btn-sm btn-outline" onClick={() => setShowNewModal(false)}>
                Fermer
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateRequest}>
                <div className="form-group">
                  <label>Type de Demande DOJ / Template Officiel</label>
                  <select
                    value={newForm.templateId}
                    onChange={e => {
                      const tpl = DOJ_TEMPLATES.find(t => t.id === e.target.value);
                      setNewForm(p => ({
                        ...p,
                        templateId: e.target.value,
                        authority: tpl ? tpl.defaultAuthority : p.authority,
                        validity: tpl ? tpl.defaultValidity : p.validity,
                        urgency: tpl ? tpl.defaultUrgency : p.urgency
                      }));
                    }}
                  >
                    {DOJ_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.category}] {t.title} ({t.legalBasis})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° Requête DOJ</label>
                    <input
                      type="text"
                      value={newForm.requestNumber}
                      onChange={e => setNewForm(p => ({ ...p, requestNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Intitulé de la Demande</label>
                    <input
                      type="text"
                      placeholder="Ex: Descente QG Cypress Flats / Perquisition Entrepôt..."
                      value={newForm.title}
                      onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Officier demandeur / Signataire</label>
                    <input
                      type="text"
                      value={newForm.leadAgent}
                      onChange={e => setNewForm(p => ({ ...p, leadAgent: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cible(s) / Suspect(s)</label>
                    <input
                      type="text"
                      placeholder="Ex: Mike Armstrong / Membres du gang"
                      value={newForm.targetName}
                      onChange={e => setNewForm(p => ({ ...p, targetName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Gang / Organisation / Entreprise</label>
                    <input
                      type="text"
                      placeholder="Ex: Ballas / Entrepôt X"
                      value={newForm.targetGroup}
                      onChange={e => setNewForm(p => ({ ...p, targetGroup: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Adresse / Lieu / Véhicules visés</label>
                    <input
                      type="text"
                      placeholder="Ex: Cypress Flats — Entrepôt n°4"
                      value={newForm.targetLocation}
                      onChange={e => setNewForm(p => ({ ...p, targetLocation: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Autorité DOJ saisie</label>
                    <input
                      type="text"
                      value={newForm.authority}
                      onChange={e => setNewForm(p => ({ ...p, authority: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Infractions & Articles visés</label>
                  <input
                    type="text"
                    placeholder="Ex: Art. 601 Association de malfaiteurs, Art. 701 Armes Cat. A/B, Art. 403 Braquage"
                    value={newForm.charges}
                    onChange={e => setNewForm(p => ({ ...p, charges: e.target.value }))}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowNewModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-check"></i> Créer & Joindre les Preuves
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
