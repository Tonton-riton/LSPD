import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  generatePrintablePaperCanvas,
  triggerBrowserPrint,
  syncSigningAgentInText,
  loadExhibitImages
} from "../utils/generatePrintableReport";
import { ensureLspdLogoLoaded } from "../assets/lspdLogo";

export default function PrintReportModal({
  isOpen,
  onClose,
  modalTitle = "Imprimer le Rapport en Jeu (Feuille Papier Officielle LSPD)",
  downloadPrefix = "Feuille_LSPD",
  title,
  docNumber,
  date,
  agent,
  initialCommandVisa = "",
  prevenu,
  reportText,
  exhibits = [],
  stampTopText = "LSPD • SAN ANDREAS",
  stampMainText = "CERTIFIÉ CONFORME",
  statusLabel = "OFFICIEL LSPD",
  renderCustomCanvas,
  autoCopyOnOpen = false,
  onSaveChanges
}) {
  const [signingAgent, setSigningAgent] = useState(agent || "16 | Vance Winchester");
  const [commandVisa, setCommandVisa] = useState(initialCommandVisa || "");
  const [editableDocNumber, setEditableDocNumber] = useState(docNumber || "LSPD-2026-001");
  const [exhibitPrintMode, setExhibitPrintMode] = useState("all"); // "all" | "text_only" | "exhibits_only"
  const [dataUrl, setDataUrl] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);
  const [directUrl, setDirectUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const wasOpenRef = useRef(false);
  const didAutoCopyRef = useRef(false);

  const hasExhibits = Array.isArray(exhibits) && exhibits.length > 0;

  // Synchronise les champs UNIQUEMENT à l'ouverture de la modale (sans écraser pendant la saisie)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSigningAgent(agent || "16 | Vance Winchester");
      setEditableDocNumber(docNumber || "LSPD-2026-001");
      setCommandVisa(initialCommandVisa || "");
      setExhibitPrintMode("all");
      setSavedIndicator(false);
      didAutoCopyRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, agent, docNumber, initialCommandVisa]);

  const showStatus = useCallback((msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  const uploadToPrinterEndpoint = useCallback(async (urlData, docRef) => {
    if (!window.location.protocol.startsWith("http")) return;
    setUploading(true);
    try {
      const resp = await fetch("/api/print-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: urlData,
          docNumber: docRef || "LSPD"
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.path) {
          setDirectUrl(`${window.location.origin}${data.path}`);
        }
      }
    } catch {
      // mode offline
    } finally {
      setUploading(false);
    }
  }, []);

  // Re-rend la feuille papier A4 en temps réel (attend le chargement du logo LSPD & des preuves photos)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let uploadTimer = null;

    (async () => {
      await ensureLspdLogoLoaded();
      const loadedExhibits =
        hasExhibits && exhibitPrintMode !== "text_only"
          ? await loadExhibitImages(exhibits)
          : [];

      if (cancelled) return;

      let canvas;
      if (typeof renderCustomCanvas === "function") {
        canvas = renderCustomCanvas({
          signingAgent,
          commandVisa,
          docNumber: editableDocNumber
        });
      } else {
        const adjustedText = syncSigningAgentInText(reportText, signingAgent);
        canvas = generatePrintablePaperCanvas({
          title,
          docNumber: editableDocNumber,
          date,
          agent: signingAgent,
          commandVisa,
          prevenu,
          reportText: adjustedText,
          exhibits: loadedExhibits,
          exhibitsOnly: exhibitPrintMode === "exhibits_only",
          stampTopText,
          stampMainText,
          statusLabel
        });
      }

      const url = canvas.toDataURL("image/png");
      if (cancelled) return;
      setCanvasRef(canvas);
      setDataUrl(url);

      // Copie automatique optionnelle à l'ouverture (ex: Fiche Amendes)
      if (autoCopyOnOpen && !didAutoCopyRef.current) {
        didAutoCopyRef.current = true;
        canvas.toBlob(async blob => {
          try {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
              showStatus("Feuille A4 copiée dans le presse-papiers ! Collez sur Discord (Ctrl+V) ou utilisez le lien d'imprimante FiveM.");
            }
          } catch {
            // ignore
          }
        }, "image/png");
      }

      uploadTimer = setTimeout(() => {
        if (!cancelled) {
          uploadToPrinterEndpoint(url, editableDocNumber);
        }
      }, 380);
    })();

    return () => {
      cancelled = true;
      if (uploadTimer) clearTimeout(uploadTimer);
    };
  }, [
    isOpen,
    title,
    editableDocNumber,
    date,
    signingAgent,
    commandVisa,
    prevenu,
    reportText,
    exhibits,
    hasExhibits,
    exhibitPrintMode,
    stampTopText,
    stampMainText,
    statusLabel,
    renderCustomCanvas,
    autoCopyOnOpen,
    showStatus,
    uploadToPrinterEndpoint
  ]);

  if (!isOpen) return null;

  const notifyParentSave = (nextAgent, nextVisa, nextDocNum) => {
    if (!onSaveChanges) return;
    onSaveChanges({
      agent: nextAgent,
      commandVisa: nextVisa,
      docNumber: nextDocNum,
      reportText: reportText ? syncSigningAgentInText(reportText, nextAgent) : undefined
    });
    setSavedIndicator(true);
  };

  const handleSigningAgentChange = (val) => {
    setSigningAgent(val);
    notifyParentSave(val, commandVisa, editableDocNumber);
  };

  const handleCommandVisaChange = (val) => {
    setCommandVisa(val);
    notifyParentSave(signingAgent, val, editableDocNumber);
  };

  const handleDocNumberChange = (val) => {
    setEditableDocNumber(val);
    notifyParentSave(signingAgent, commandVisa, val);
  };

  const handleCopyUrl = () => {
    if (!directUrl) return;
    navigator.clipboard.writeText(directUrl);
    showStatus("Lien direct .PNG copié ! Collez-le (Ctrl+V) dans l'imprimante en jeu FiveM.");
  };

  const handleCopyImage = async () => {
    if (!canvasRef) return;
    try {
      const blob = await new Promise(resolve => canvasRef.toBlob(resolve, "image/png"));
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
        showStatus("Feuille A4 copiée dans le presse-papiers ! Collez sur Discord (Ctrl+V) pour récupérer son lien d'imprimante RP.");
      } else {
        showStatus("Faites clic-droit sur la feuille ci-dessous > Copier l'image, ou cliquez sur Télécharger .PNG.");
      }
    } catch {
      showStatus("Faites clic-droit sur la feuille ci-dessous > Copier l'image, ou cliquez sur Télécharger .PNG.");
    }
  };

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const safeName = (editableDocNumber || prevenu || "Document_LSPD").replace(/[^a-zA-Z0-9_-]/g, "_");
    const suffix = exhibitPrintMode === "exhibits_only" ? "_Preuves" : "";
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${downloadPrefix}_${safeName}${suffix}.png`;
    a.click();
    showStatus("Feuille papier LSPD téléchargée en .PNG !");
  };

  const handleBrowserPrint = () => {
    if (!dataUrl) return;
    triggerBrowserPrint(dataUrl, `${downloadPrefix} — ${editableDocNumber || ""}`);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 15, 0.86)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 960, width: "100%", maxHeight: "94vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="card-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}
        >
          <h2>
            <i className="fas fa-print" style={{ color: "var(--gold-seal)" }}></i> {modalTitle}
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleCopyImage}>
              <i className="fas fa-copy"></i> Copier Image (Ctrl+V Discord)
            </button>
            <button type="button" className="btn btn-sm btn-success" onClick={handleDownloadPng}>
              <i className="fas fa-download"></i> Télécharger .PNG
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={handleBrowserPrint}>
              <i className="fas fa-print"></i> Imprimer / PDF
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>

        {/* BARRE DE PERSONNALISATION DE LA SIGNATURE & DU VISA AVANT IMPRESSION */}
        <div
          style={{
            padding: "12px 20px",
            background: "#0c192e",
            borderBottom: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "1.3fr 1.1fr 0.9fr",
            gap: 12
          }}
        >
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--gold-seal)",
                textTransform: "uppercase",
                marginBottom: 4
              }}
            >
              <span>
                <i className="fas fa-signature" style={{ marginRight: 5 }}></i>
                Agent qui signe le document (Modifiable)
              </span>
              {onSaveChanges && savedIndicator && (
                <span style={{ color: "var(--green)", fontSize: 10.5 }}>
                  <i className="fas fa-check"></i> Enregistré dans le dossier
                </span>
              )}
            </label>
            <input
              type="text"
              className="input"
              style={{ padding: "7px 10px", fontSize: 13.5 }}
              placeholder="Ex: 18 | Lieutenant Carter"
              value={signingAgent}
              onChange={e => handleSigningAgentChange(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>
              <i className="fas fa-stamp" style={{ marginRight: 5 }}></i>
              Visa Commandement / Juge / Procureur
            </label>
            <input
              type="text"
              className="input"
              style={{ padding: "7px 10px", fontSize: 13.5 }}
              placeholder="Ex: Juge Harrison / Procureur..."
              value={commandVisa}
              onChange={e => handleCommandVisaChange(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>
              N° Référence Document
            </label>
            <input
              type="text"
              className="input mono"
              style={{ padding: "7px 10px", fontSize: 13 }}
              value={editableDocNumber}
              onChange={e => handleDocNumberChange(e.target.value)}
            />
          </div>
        </div>

        {/* SÉLECTEUR D'IMPRESSION DES PREUVES (SI DES PIÈCES JOINTES SONT PRÉSENTES) */}
        {hasExhibits && !renderCustomCanvas && (
          <div
            style={{
              padding: "8px 20px",
              background: "#0a172c",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)" }}>
              <i className="fas fa-images" style={{ marginRight: 6 }}></i>
              PREUVES JOINTES ({exhibits.length}) — MODE D'IMPRESSION :
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${exhibitPrintMode === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setExhibitPrintMode("all")}
              >
                <i className="fas fa-file-image"></i> Requête + Preuves ensemble
              </button>
              <button
                type="button"
                className={`btn btn-sm ${exhibitPrintMode === "text_only" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setExhibitPrintMode("text_only")}
              >
                <i className="fas fa-file-lines"></i> Page 1 : Requête seule
              </button>
              <button
                type="button"
                className={`btn btn-sm ${exhibitPrintMode === "exhibits_only" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setExhibitPrintMode("exhibits_only")}
              >
                <i className="fas fa-camera"></i> Page 2 : Annexe Preuves seule
              </button>
            </div>
          </div>
        )}

        {/* DIRECT FIVEM IN-GAME PRINTER URL BOX */}
        <div
          style={{
            padding: "10px 20px",
            background: "#091529",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 6
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold-seal)" }}>
              <i className="fas fa-link" style={{ marginRight: 6 }}></i>
              LIEN DIRECT POUR IMPRIMANTE IN-GAME (FIVEM — URL .PNG) :
            </span>
            {uploading && (
              <span style={{ fontSize: 12, color: "var(--blue)" }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>
                Mise à jour du lien .PNG...
              </span>
            )}
          </div>

          {directUrl ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                readOnly
                className="input mono"
                style={{ fontSize: 12.5, padding: "7px 12px", color: "var(--green)" }}
                value={directUrl}
                onFocus={e => e.target.select()}
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={handleCopyUrl}>
                <i className="fas fa-copy"></i> Copier le Lien Imprimante RP
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {uploading
                ? "Préparation de l'URL..."
                : "Astuce FiveM : Sur votre site Render en ligne, un lien direct .PNG s'affiche ici automatiquement. En local, utilisez « Copier Image » puis collez sur Discord pour obtenir le lien d'imprimante RP."}
            </div>
          )}
        </div>

        {statusMsg && (
          <div
            style={{
              padding: "10px 20px",
              background: "var(--green-bg)",
              color: "var(--green)",
              fontWeight: 700,
              fontSize: 13.5,
              borderBottom: "1px solid var(--border)"
            }}
          >
            <i className="fas fa-circle-check" style={{ marginRight: 8 }}></i>
            {statusMsg}
          </div>
        )}

        {/* A4 PAPER PREVIEW */}
        <div
          className="card-body"
          style={{
            overflowY: "auto",
            background: "#0b1120",
            display: "flex",
            justifyContent: "center",
            padding: 20
          }}
        >
          {dataUrl && (
            <img
              src={dataUrl}
              alt="Feuille imprimable officielle LSPD"
              style={{
                maxWidth: "740px",
                width: "100%",
                height: "auto",
                borderRadius: 4,
                boxShadow: "0 14px 45px rgba(0,0,0,0.75)"
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
