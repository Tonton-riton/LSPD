import React, { useState, useMemo } from "react";
import {
  Sliders,
  Code2,
  Database,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Copy,
  Check,
  Search,
  Edit3,
  Save
} from "lucide-react";
import {
  DEFAULT_FORMULA_CONFIG,
  ORIGINAL_SHEET_FORMULAS
} from "../data/sheetData";
import { formatCurrency } from "../utils/formulaEngine";
import { getCategoryBadgeClass } from "./CalculatorView";

export default function SettingsAndFormulasView({
  config,
  setConfig,
  infractions,
  setInfractions,
  aggravantes,
  setAggravantes,
  onResetAllData
}) {
  const [subTab, setSubTab] = useState("coefficients"); // "coefficients" | "database" | "formulas"
  const [searchDb, setSearchDb] = useState("");
  const [catFilterDb, setCatFilterDb] = useState("ALL");
  const [editingInfId, setEditingInfId] = useState(null);
  const [copiedFormulaIdx, setCopiedFormulaIdx] = useState(null);

  // New infraction form state
  const [newInf, setNewInf] = useState({
    article: "Art. 900",
    chefAccusation: "",
    categorie: "Délit mineur",
    amendeBase: 500,
    peineBaseMinutes: 5,
    specialBase: ""
  });

  // New aggravante form state
  const [newAgg, setNewAgg] = useState({
    idInfraction: infractions[0]?.id || "ART206",
    circonstance: "",
    amendeSupplementaire: 500,
    peineSupplementaireMinutes: 5,
    special: ""
  });

  const handleUpdatePalier = (palierId, field, value) => {
    setConfig(prev => ({
      ...prev,
      paliers: prev.paliers.map(p =>
        p.id === palierId ? { ...p, [field]: value } : p
      )
    }));
  };

  const handleUpdateRetention = (cat, hours) => {
    setConfig(prev => ({
      ...prev,
      retentionHours: {
        ...prev.retentionHours,
        [cat]: Number(hours) || 0
      }
    }));
  };

  const handleAddInfraction = (e) => {
    e.preventDefault();
    if (!newInf.chefAccusation.trim()) return;
    const id = `CUSTOM_${Date.now()}`;
    setInfractions(prev => [
      {
        id,
        article: newInf.article.trim() || "Art. —",
        chefAccusation: newInf.chefAccusation.trim(),
        categorie: newInf.categorie,
        amendeBase: Number(newInf.amendeBase) || 0,
        peineBaseMinutes: Number(newInf.peineBaseMinutes) || 0,
        specialBase: newInf.specialBase.trim()
      },
      ...prev
    ]);
    setNewInf({
      article: "Art. 900",
      chefAccusation: "",
      categorie: "Délit mineur",
      amendeBase: 500,
      peineBaseMinutes: 5,
      specialBase: ""
    });
  };

  const handleUpdateInfraction = (id, field, value) => {
    setInfractions(prev =>
      prev.map(inf => (inf.id === id ? { ...inf, [field]: value } : inf))
    );
  };

  const handleDeleteInfraction = (id) => {
    setInfractions(prev => prev.filter(inf => inf.id !== id));
    setAggravantes(prev => prev.filter(agg => agg.idInfraction !== id));
  };

  const handleAddAggravante = (e) => {
    e.preventDefault();
    if (!newAgg.circonstance.trim() || !newAgg.idInfraction) return;
    const parentInf = infractions.find(i => i.id === newAgg.idInfraction);
    const artCode = parentInf ? `${parentInf.article.replace("Art. ", "")} Cir.Agg` : "Cir.Agg";
    setAggravantes(prev => [
      ...prev,
      {
        uid: `AGG_CUSTOM_${Date.now()}`,
        idInfraction: newAgg.idInfraction,
        article: artCode,
        circonstance: newAgg.circonstance.trim(),
        amendeSupplementaire: Number(newAgg.amendeSupplementaire) || 0,
        peineSupplementaireMinutes: Number(newAgg.peineSupplementaireMinutes) || 0,
        special: newAgg.special.trim()
      }
    ]);
    setNewAgg(prev => ({
      ...prev,
      circonstance: "",
      amendeSupplementaire: 500,
      peineSupplementaireMinutes: 5,
      special: ""
    }));
  };

  const handleUpdateAggravante = (uid, field, value) => {
    setAggravantes(prev =>
      prev.map(a => (a.uid === uid ? { ...a, [field]: value } : a))
    );
  };

  const handleDeleteAggravante = (uid) => {
    setAggravantes(prev => prev.filter(a => a.uid !== uid));
  };

  // Export JSON
  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      config,
      infractions,
      aggravantes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config-peines-san-andreas.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.config) setConfig(data.config);
        if (Array.isArray(data.infractions)) setInfractions(data.infractions);
        if (Array.isArray(data.aggravantes)) setAggravantes(data.aggravantes);
      } catch (err) {
        alert("Fichier JSON invalide : " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const filteredInfractions = useMemo(() => {
    const q = searchDb.trim().toLowerCase();
    return infractions.filter(inf => {
      if (catFilterDb !== "ALL" && inf.categorie.toLowerCase() !== catFilterDb.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        inf.chefAccusation.toLowerCase().includes(q) ||
        inf.article.toLowerCase().includes(q) ||
        inf.id.toLowerCase().includes(q)
      );
    });
  }, [infractions, searchDb, catFilterDb]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* TOP BAR */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className={`btn ${subTab === "coefficients" ? "btn-primary" : ""}`}
              onClick={() => setSubTab("coefficients")}
            >
              <Sliders size={15} />
              <span>1. Paramètres & Coefficients Réglables</span>
            </button>
            <button
              className={`btn ${subTab === "database" ? "btn-primary" : ""}`}
              onClick={() => setSubTab("database")}
            >
              <Database size={15} />
              <span>2. Éditeur des Peines & Aggravantes ({infractions.length} / {aggravantes.length})</span>
            </button>
            <button
              className={`btn ${subTab === "formulas" ? "btn-primary" : ""}`}
              onClick={() => setSubTab("formulas")}
            >
              <Code2 size={15} />
              <span>3. Formules Originales du Google Sheet</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-sm" onClick={handleExportJson}>
              <Download size={14} />
              <span>Exporter JSON</span>
            </button>
            <label className="btn btn-sm" style={{ cursor: "pointer" }}>
              <Upload size={14} />
              <span>Importer JSON</span>
              <input type="file" accept=".json" style={{ display: "none" }} onChange={handleImportJson} />
            </label>
            <button className="btn btn-sm btn-danger" onClick={onResetAllData}>
              <RotateCcw size={14} />
              <span>Réinitialiser aux valeurs du Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: COEFFICIENTS, PALIERS, RETENTION, UP, MIRANDA */}
      {subTab === "coefficients" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "1.25rem" }}>
          {/* Multiplicateurs de ligne */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <Sliders size={17} style={{ color: "var(--accent-primary)" }} />
                <span>Multiplicateurs de Ligne (Tentative, Complicité, Avocat)</span>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: "0.35rem" }}>
                  <span><strong>Tentative</strong> (Formule Sheet : <code>IF(G12="Oui", 0.5, 1)</code>)</span>
                  <span className="mono" style={{ fontWeight: 700, color: "#fbbf24" }}>
                    ×{config.tentativeMultiplier} ({Math.round(config.tentativeMultiplier * 100)}%)
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    style={{ flex: 1 }}
                    value={config.tentativeMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, tentativeMultiplier: parseFloat(e.target.value) }))}
                  />
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    className="input mono"
                    style={{ width: "85px" }}
                    value={config.tentativeMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, tentativeMultiplier: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: "0.35rem" }}>
                  <span><strong>Complicité</strong> (Formule Sheet : <code>0.75</code> | Onglet RÈGLES : <code>0.50</code>)</span>
                  <span className="mono" style={{ fontWeight: 700, color: "#c084fc" }}>
                    ×{config.compliciteMultiplier} ({Math.round(config.compliciteMultiplier * 100)}%)
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    style={{ flex: 1 }}
                    value={config.compliciteMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, compliciteMultiplier: parseFloat(e.target.value) }))}
                  />
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    className="input mono"
                    style={{ width: "85px" }}
                    value={config.compliciteMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, compliciteMultiplier: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: "0.35rem" }}>
                  <span><strong>Recours Avocat</strong> (Formule Sheet : <code>IF(I12="Oui", 0.9, 1)</code>)</span>
                  <span className="mono" style={{ fontWeight: 700, color: "#38bdf8" }}>
                    ×{config.avocatMultiplier} ({Math.round(config.avocatMultiplier * 100)}%)
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    style={{ flex: 1 }}
                    value={config.avocatMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, avocatMultiplier: parseFloat(e.target.value) }))}
                  />
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    className="input mono"
                    style={{ width: "85px" }}
                    value={config.avocatMultiplier}
                    onChange={e => setConfig(prev => ({ ...prev, avocatMultiplier: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Plafond Amende Max ($) (0 = Aucun)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="input mono"
                    value={config.maxFineCap || 0}
                    onChange={e => setConfig(prev => ({ ...prev, maxFineCap: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Plafond Peine Max (min) (0 = Aucun)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    className="input mono"
                    value={config.maxPrisonMinutesCap || 0}
                    onChange={e => setConfig(prev => ({ ...prev, maxPrisonMinutesCap: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Paliers de décision (MIN 1, MIN 2, NOMINALE, AGGRAVÉ, MAXIMAL) */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <Sliders size={17} style={{ color: "var(--badge-gold)" }} />
                <span>Réglage des 5 Paliers de Décision (I26:K30)</span>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {config.paliers.map(p => (
                <div
                  key={p.id}
                  style={{
                    padding: "0.7rem",
                    borderRadius: "9px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-color)",
                    display: "grid",
                    gridTemplateColumns: "110px 1fr 1fr 1.3fr",
                    gap: "0.6rem",
                    alignItems: "center"
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    style={{ fontWeight: 700 }}
                    value={p.label}
                    onChange={e => handleUpdatePalier(p.id, "label", e.target.value)}
                  />
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "block" }}>Coef. Amende</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      className="input mono"
                      value={p.factorAmende}
                      onChange={e => handleUpdatePalier(p.id, "factorAmende", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "block" }}>Coef. Peine</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      className="input mono"
                      value={p.factorPeine}
                      onChange={e => handleUpdatePalier(p.id, "factorPeine", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "var(--text-secondary)", display: "block" }}>Autorité Décisionnaire</label>
                    <input
                      type="text"
                      className="input"
                      value={p.decision}
                      onChange={e => handleUpdatePalier(p.id, "decision", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Durées de rétention & Conversion UP */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <Sliders size={17} style={{ color: "var(--accent-primary)" }} />
                <span>Durées de Rétention (E26:E28) & Formule Conversion UP (O26)</span>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {["Contravention", "Délit mineur", "Délit majeur", "Crime"].map(cat => (
                  <div key={cat}>
                    <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Rétention {cat} (heures)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="input mono"
                      value={config.retentionHours?.[cat] ?? 0}
                      onChange={e => handleUpdateRetention(cat, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Formule Conversion UP : <code>=SUM(Secondes × Montant / Tranche$) / 60</code>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Secondes par tranche (Sheet : 180)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input mono"
                      value={config.upConversion?.secondsPerSlice ?? 180}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          upConversion: { ...prev.upConversion, secondsPerSlice: Number(e.target.value) || 180 }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Tranche en Dollars $ (Sheet : 5000)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input mono"
                      value={config.upConversion?.amountPerSlice ?? 5000}
                      onChange={e =>
                        setConfig(prev => ({
                          ...prev,
                          upConversion: { ...prev.upConversion, amountPerSlice: Number(e.target.value) || 5000 }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Modèle du texte des droits Miranda */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <Edit3 size={17} style={{ color: "var(--accent-primary)" }} />
                <span>Modèle des Droits Miranda (Formule Cellule N3)</span>
              </div>
              <button
                className="btn btn-sm"
                onClick={() =>
                  setConfig(prev => ({ ...prev, mirandaTemplate: DEFAULT_FORMULA_CONFIG.mirandaTemplate }))
                }
              >
                Rétablir le texte N3
              </button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Variables dynamiques disponibles : <code>{"{prevenu}"}</code>, <code>{"{date}"}</code>, <code>{"{heure}"}</code>, <code>{"{chefs}"}</code>
              </div>
              <textarea
                rows={9}
                className="textarea mono"
                style={{ fontSize: "0.8rem", lineHeight: 1.55 }}
                value={config.mirandaTemplate}
                onChange={e => setConfig(prev => ({ ...prev, mirandaTemplate: e.target.value }))}
              />
            </div>
          </section>
        </div>
      )}

      {/* SUBTAB 2: DATABASE EDITOR (INFRACTIONS + AGGRAVANTES) */}
      {subTab === "database" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Add new infraction or aggravating circumstance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "1.25rem" }}>
            <form className="card" onSubmit={handleAddInfraction}>
              <div className="card-header">
                <div className="card-title">
                  <Plus size={17} style={{ color: "var(--accent-primary)" }} />
                  <span>Ajouter une Nouvelle Infraction</span>
                </div>
                <button type="submit" className="btn btn-sm btn-primary">
                  <Plus size={14} />
                  <span>Créer l'infraction</span>
                </button>
              </div>
              <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Article</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Art. 410"
                    value={newInf.article}
                    onChange={e => setNewInf(p => ({ ...p, article: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Catégorie</label>
                  <select
                    className="select"
                    value={newInf.categorie}
                    onChange={e => setNewInf(p => ({ ...p, categorie: e.target.value }))}
                  >
                    <option value="Contravention">Contravention</option>
                    <option value="Délit mineur">Délit mineur</option>
                    <option value="Délit majeur">Délit majeur</option>
                    <option value="Crime">Crime</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Chef d'accusation</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Intitulé de l'infraction..."
                    value={newInf.chefAccusation}
                    onChange={e => setNewInf(p => ({ ...p, chefAccusation: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Amende de base ($)</label>
                  <input
                    type="number"
                    className="input mono"
                    value={newInf.amendeBase}
                    onChange={e => setNewInf(p => ({ ...p, amendeBase: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Peine de base (minutes)</label>
                  <input
                    type="number"
                    className="input mono"
                    value={newInf.peineBaseMinutes}
                    onChange={e => setNewInf(p => ({ ...p, peineBaseMinutes: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Mention spéciale (optionnel)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Saisie du véhicule, Prison fédérale..."
                    value={newInf.specialBase}
                    onChange={e => setNewInf(p => ({ ...p, specialBase: e.target.value }))}
                  />
                </div>
              </div>
            </form>

            <form className="card" onSubmit={handleAddAggravante}>
              <div className="card-header">
                <div className="card-title">
                  <Plus size={17} style={{ color: "var(--badge-gold)" }} />
                  <span>Ajouter une Circonstance Aggravante</span>
                </div>
                <button type="submit" className="btn btn-sm btn-primary">
                  <Plus size={14} />
                  <span>Ajouter l'aggravante</span>
                </button>
              </div>
              <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Infraction rattachée</label>
                  <select
                    className="select"
                    value={newAgg.idInfraction}
                    onChange={e => setNewAgg(p => ({ ...p, idInfraction: e.target.value }))}
                  >
                    {infractions.map(inf => (
                      <option key={inf.id} value={inf.id}>
                        [{inf.article}] {inf.chefAccusation}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Intitulé de la circonstance aggravante</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: En bande organisée..."
                    value={newAgg.circonstance}
                    onChange={e => setNewAgg(p => ({ ...p, circonstance: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Amende supplémentaire ($)</label>
                  <input
                    type="number"
                    className="input mono"
                    value={newAgg.amendeSupplementaire}
                    onChange={e => setNewAgg(p => ({ ...p, amendeSupplementaire: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Peine supplémentaire (min)</label>
                  <input
                    type="number"
                    className="input mono"
                    value={newAgg.peineSupplementaireMinutes}
                    onChange={e => setNewAgg(p => ({ ...p, peineSupplementaireMinutes: e.target.value }))}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Mention spéciale (optionnel)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Peine de mort possible, Réclusion à perpétuité..."
                    value={newAgg.special}
                    onChange={e => setNewAgg(p => ({ ...p, special: e.target.value }))}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Interactive editable table of all infractions & their aggravating circumstances */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <Database size={17} style={{ color: "var(--accent-primary)" }} />
                <span>Modification en Direct des Peines & Amendes ({filteredInfractions.length})</span>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "240px" }}>
                  <Search size={14} style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: "2.1rem" }}
                    placeholder="Filtrer par article ou nom..."
                    value={searchDb}
                    onChange={e => setSearchDb(e.target.value)}
                  />
                </div>
                <select
                  className="select"
                  style={{ width: "170px" }}
                  value={catFilterDb}
                  onChange={e => setCatFilterDb(e.target.value)}
                >
                  <option value="ALL">Toutes catégories</option>
                  <option value="Contravention">Contravention</option>
                  <option value="Délit mineur">Délit mineur</option>
                  <option value="Délit majeur">Délit majeur</option>
                  <option value="Crime">Crime</option>
                </select>
              </div>
            </div>

            <div className="mdt-table-wrap">
              <table className="mdt-table">
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>Article</th>
                    <th style={{ width: "145px" }}>Catégorie</th>
                    <th>Chef d'Accusation</th>
                    <th style={{ width: "130px" }}>Amende Base ($)</th>
                    <th style={{ width: "130px" }}>Peine Base (min)</th>
                    <th>Spécial</th>
                    <th style={{ width: "150px" }}>Aggravantes</th>
                    <th style={{ width: "55px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInfractions.map(inf => {
                    const infAggs = aggravantes.filter(a => a.idInfraction === inf.id);
                    const isExpanded = editingInfId === inf.id;
                    return (
                      <React.Fragment key={inf.id}>
                        <tr>
                          <td>
                            <input
                              type="text"
                              className="input mono"
                              style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
                              value={inf.article}
                              onChange={e => handleUpdateInfraction(inf.id, "article", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="select"
                              style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
                              value={inf.categorie}
                              onChange={e => handleUpdateInfraction(inf.id, "categorie", e.target.value)}
                            >
                              <option value="Contravention">Contravention</option>
                              <option value="Délit mineur">Délit mineur</option>
                              <option value="Délit majeur">Délit majeur</option>
                              <option value="Crime">Crime</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input"
                              style={{ padding: "0.35rem 0.6rem", fontSize: "0.81rem", fontWeight: 600 }}
                              value={inf.chefAccusation}
                              onChange={e => handleUpdateInfraction(inf.id, "chefAccusation", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input mono"
                              style={{ padding: "0.35rem 0.5rem", fontSize: "0.81rem", color: "#34d399", fontWeight: 700 }}
                              value={inf.amendeBase}
                              onChange={e => handleUpdateInfraction(inf.id, "amendeBase", Number(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input mono"
                              style={{ padding: "0.35rem 0.5rem", fontSize: "0.81rem", color: "var(--accent-secondary)", fontWeight: 700 }}
                              value={inf.peineBaseMinutes}
                              onChange={e => handleUpdateInfraction(inf.id, "peineBaseMinutes", Number(e.target.value) || 0)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input"
                              style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem" }}
                              placeholder="—"
                              value={inf.specialBase || ""}
                              onChange={e => handleUpdateInfraction(inf.id, "specialBase", e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm ${isExpanded ? "btn-primary" : ""}`}
                              onClick={() => setEditingInfId(isExpanded ? null : inf.id)}
                            >
                              <Edit3 size={13} />
                              <span>{infAggs.length} aggravante(s)</span>
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteInfraction(inf.id)}
                              title="Supprimer cette infraction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ background: "rgba(0, 0, 0, 0.25)", padding: "0.85rem 1.25rem" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--badge-gold)" }}>
                                  CIRCONSTANCES AGGRAVANTES DE [{inf.article}] {inf.chefAccusation} :
                                </div>
                                {infAggs.length === 0 ? (
                                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    Aucune circonstance aggravante pour cette infraction. Utilisez le formulaire ci-dessus pour en ajouter.
                                  </div>
                                ) : (
                                  infAggs.map(agg => (
                                    <div
                                      key={agg.uid}
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "2fr 130px 130px 1.5fr 45px",
                                        gap: "0.5rem",
                                        alignItems: "center"
                                      }}
                                    >
                                      <input
                                        type="text"
                                        className="input"
                                        style={{ padding: "0.3rem 0.55rem", fontSize: "0.79rem" }}
                                        value={agg.circonstance}
                                        onChange={e => handleUpdateAggravante(agg.uid, "circonstance", e.target.value)}
                                      />
                                      <input
                                        type="number"
                                        className="input mono"
                                        style={{ padding: "0.3rem 0.55rem", fontSize: "0.79rem", color: "#34d399" }}
                                        value={agg.amendeSupplementaire}
                                        onChange={e => handleUpdateAggravante(agg.uid, "amendeSupplementaire", Number(e.target.value) || 0)}
                                      />
                                      <input
                                        type="number"
                                        className="input mono"
                                        style={{ padding: "0.3rem 0.55rem", fontSize: "0.79rem", color: "var(--accent-secondary)" }}
                                        value={agg.peineSupplementaireMinutes}
                                        onChange={e => handleUpdateAggravante(agg.uid, "peineSupplementaireMinutes", Number(e.target.value) || 0)}
                                      />
                                      <input
                                        type="text"
                                        className="input"
                                        style={{ padding: "0.3rem 0.55rem", fontSize: "0.78rem" }}
                                        placeholder="Mention spéciale..."
                                        value={agg.special || ""}
                                        onChange={e => handleUpdateAggravante(agg.uid, "special", e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDeleteAggravante(agg.uid)}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SUBTAB 3: ORIGINAL GOOGLE SHEET FORMULAS ARCHIVE */}
      {subTab === "formulas" && (
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <Code2 size={18} style={{ color: "var(--accent-primary)" }} />
              <span>Toutes les Formules Originales Extraites du Google Sheet (Réutilisables)</span>
            </div>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1rem" }}>
            {ORIGINAL_SHEET_FORMULAS.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <span className="brand-badge">{item.cell}</span>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: "0.3rem" }}>{item.title}</h4>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(item.formula);
                      setCopiedFormulaIdx(idx);
                      setTimeout(() => setCopiedFormulaIdx(null), 1800);
                    }}
                  >
                    {copiedFormulaIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedFormulaIdx === idx ? "Copié" : "Copier formule"}</span>
                  </button>
                </div>

                <pre
                  className="mono"
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.75rem",
                    color: "#93c5fd"
                  }}
                >
                  {item.formula}
                </pre>

                <p style={{ fontSize: "0.79rem", color: "var(--text-secondary)" }}>
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
