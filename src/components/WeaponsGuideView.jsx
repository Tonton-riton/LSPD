import React, { useState, useMemo } from "react";
import {
  Crosshair,
  Search,
  Shield,
  PlusCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { LSPD_WEAPONS_DATA, TYPES_ARMES_DATA } from "../data/sheetData";

export default function WeaponsGuideView({ onAddWeaponOffenses }) {
  const [viewMode, setViewMode] = useState("lspd"); // "lspd" | "general"
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");

  const lspdGroups = useMemo(() => {
    return ["ALL", ...Array.from(new Set(LSPD_WEAPONS_DATA.map(w => w.groupe)))];
  }, []);

  const lspdCategories = useMemo(() => {
    return ["ALL", ...Array.from(new Set(LSPD_WEAPONS_DATA.map(w => w.categorie)))];
  }, []);

  const filteredLspd = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LSPD_WEAPONS_DATA.filter(w => {
      if (groupFilter !== "ALL" && w.groupe !== groupFilter) return false;
      if (catFilter !== "ALL" && w.categorie !== catFilter) return false;
      if (!q) return true;
      return (
        w.nom.toLowerCase().includes(q) ||
        w.categorie.toLowerCase().includes(q) ||
        w.achat.toLowerCase().includes(q) ||
        w.remarque.toLowerCase().includes(q) ||
        w.munitions.toLowerCase().includes(q)
      );
    });
  }, [search, groupFilter, catFilter]);

  const filteredGeneral = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TYPES_ARMES_DATA.filter(w => {
      if (!q) return true;
      return (
        w.nom.toLowerCase().includes(q) ||
        w.categorie.toLowerCase().includes(q) ||
        w.sousCategorie.toLowerCase().includes(q) ||
        w.legalite.toLowerCase().includes(q) ||
        w.ppaDeclaration.toLowerCase().includes(q)
      );
    });
  }, [search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="card">
        <div className="card-header">
          <div className="card-title">
            <Crosshair size={18} style={{ color: "var(--accent-primary)" }} />
            <span>RÉGLEMENTATION & REGISTRE DES ARMES À FEU (LSPD & DOJ)</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className={`btn btn-sm ${viewMode === "lspd" ? "btn-primary" : ""}`}
              onClick={() => setViewMode("lspd")}
            >
              <Shield size={14} />
              <span>Registre Tactique LSPD (95 Armes, Munitions & Équipements)</span>
            </button>
            <button
              className={`btn btn-sm ${viewMode === "general" ? "btn-primary" : ""}`}
              onClick={() => setViewMode("general")}
            >
              <Crosshair size={14} />
              <span>Classification Générale (Catégories D, C, B1, B2, A1, A2, A3)</span>
            </button>
          </div>
        </div>

        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 280px" }}>
              <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: "2.2rem" }}
                placeholder="Rechercher une arme (ex: Glock 19, AK-47, Taser, Silencieux, Calibre 12)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {viewMode === "lspd" && (
              <>
                <select
                  className="select"
                  style={{ width: "210px" }}
                  value={groupFilter}
                  onChange={e => setGroupFilter(e.target.value)}
                >
                  {lspdGroups.map(g => (
                    <option key={g} value={g}>
                      {g === "ALL" ? "Tous les types d'armes" : g}
                    </option>
                  ))}
                </select>

                <select
                  className="select"
                  style={{ width: "160px" }}
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                >
                  {lspdCategories.map(c => (
                    <option key={c} value={c}>
                      {c === "ALL" ? "Toutes catégories" : c}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {viewMode === "lspd" ? (
          <div className="mdt-table-wrap">
            <table className="mdt-table">
              <thead>
                <tr>
                  <th>Type / Groupe</th>
                  <th>Nom de l'Arme / Équipement</th>
                  <th>Catégorie</th>
                  <th>Munitions</th>
                  <th style={{ textAlign: "center" }}>PPA</th>
                  <th style={{ textAlign: "center" }}>PPAL</th>
                  <th style={{ textAlign: "center" }}>Légalité</th>
                  <th>Provenance / Achat</th>
                  <th>Remarque & Sanction (Formule Col. J)</th>
                  <th style={{ textAlign: "center" }}>Inculper au Calculateur</th>
                </tr>
              </thead>
              <tbody>
                {filteredLspd.map(w => {
                  const isGov = w.achat === "POLICE" || w.remarque.includes("GOUVERNEMENTAUX");
                  return (
                    <tr key={w.id}>
                      <td>
                        <span className="brand-badge">{w.groupe}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{w.nom}</td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontWeight: 700,
                            color: w.categorie.includes("A")
                              ? "#fb7185"
                              : w.categorie.includes("B")
                              ? "#fbbf24"
                              : "#38bdf8"
                          }}
                        >
                          {w.categorie}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: "0.78rem" }}>{w.munitions}</td>
                      <td style={{ textAlign: "center" }}>
                        {w.ppa ? <CheckCircle2 size={15} color="#34d399" /> : <XCircle size={15} color="#64748b" />}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {w.ppal ? <CheckCircle2 size={15} color="#34d399" /> : <XCircle size={15} color="#64748b" />}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={w.legal ? "cat-badge cat-contravention" : "cat-badge cat-crime"}>
                          {w.legal ? "Légal" : "Illégal"}
                        </span>
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color:
                              w.achat === "POLICE"
                                ? "#38bdf8"
                                : w.achat === "MARCHE NOIR"
                                ? "#fb7185"
                                : "#34d399"
                          }}
                        >
                          {w.achat}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem", fontWeight: 600, color: isGov ? "#fbbf24" : "var(--text-secondary)" }}>
                        {w.remarque}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => onAddWeaponOffenses(w)}
                          title="Ajouter automatiquement l'infraction correspondante au calculateur"
                        >
                          <PlusCircle size={14} />
                          <span>Inculper</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mdt-table-wrap">
            <table className="mdt-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Sous-Catégorie</th>
                  <th>Arme</th>
                  <th>Légalité</th>
                  <th>PPA / Déclaration</th>
                  <th>Achat</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneral.map(w => (
                  <tr key={w.id}>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>{w.categorie}</td>
                    <td className="mono" style={{ fontSize: "0.78rem" }}>{w.sousCategorie}</td>
                    <td style={{ fontWeight: 700 }}>{w.nom}</td>
                    <td>
                      <span className={w.legalite.toLowerCase().includes("légal") && !w.legalite.toLowerCase().includes("illégal") ? "cat-badge cat-contravention" : "cat-badge cat-crime"}>
                        {w.legalite}
                      </span>
                    </td>
                    <td>{w.ppaDeclaration}</td>
                    <td>{w.achat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
