import React, { useState, useEffect } from "react";
import {
  generatePrintablePaperCanvas,
  triggerBrowserPrint
} from "../utils/generatePrintableReport";

export default function PrintReportModal({
  isOpen,
  onClose,
  title,
  docNumber,
  date,
  agent,
  prevenu,
  reportText
}) {
  const [dataUrl, setDataUrl] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);
  const [directUrl, setDirectUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = generatePrintablePaperCanvas({
      title,
      docNumber,
      date,
      agent,
      prevenu,
      reportText
    });
    const url = canvas.toDataURL("image/png");
    setCanvasRef(canvas);
    setDataUrl(url);
    setDirectUrl("");
    setStatusMsg(null);

    // Tenter de générer automatiquement le lien direct .png pour imprimante FiveM si hébergé sur serveur Node/Render
    if (window.location.protocol.startsWith("http")) {
      setUploading(true);
      fetch("/api/print-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: url,
          docNumber: docNumber || "LSPD"
        })
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && data.path) {
            setDirectUrl(`${window.location.origin}${data.path}`);
          }
        })
        .catch(() => {
          // Mode local Vite sans API ou offline : l'utilisateur utilise Copier l'image / Télécharger PNG
        })
        .finally(() => setUploading(false));
    }
  }, [isOpen, title, docNumber, date, agent, prevenu, reportText]);

  if (!isOpen) return null;

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
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
    const safeName = (docNumber || prevenu || "Rapport_LSPD").replace(/[^a-zA-Z0-9_-]/g, "_");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Feuille_LSPD_${safeName}.png`;
    a.click();
    showStatus("Feuille papier LSPD téléchargée en .PNG !");
  };

  const handleBrowserPrint = () => {
    if (!dataUrl) return;
    triggerBrowserPrint(dataUrl, `Rapport LSPD — ${docNumber || ""}`);
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
            <i className="fas fa-print" style={{ color: "var(--gold-seal)" }}></i> Imprimer le Rapport en Jeu (Feuille Papier Officielle LSPD)
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

        {/* DIRECT FIVEM IN-GAME PRINTER URL BOX */}
        <div
          style={{
            padding: "12px 20px",
            background: "#091529",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-seal)" }}>
              <i className="fas fa-link" style={{ marginRight: 6 }}></i>
              LIEN DIRECT POUR IMPRIMANTE IN-GAME (FIVEM — URL .PNG) :
            </span>
            {uploading && (
              <span style={{ fontSize: 12, color: "var(--blue)" }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>
                Génération du lien d'impression en jeu...
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
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {uploading
                ? "Préparation de l'URL..."
                : "Astuce FiveM : Sur votre site en ligne Render, un lien direct .PNG s'affiche automatiquement ici pour votre imprimante RP. En mode local/fichier, cliquez sur « Copier Image » puis collez-la sur Discord (Ctrl+V) et copiez le lien de l'image dans votre imprimante en jeu !"}
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
