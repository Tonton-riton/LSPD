import React, { useState, useMemo } from "react";
import {
  Search,
  PlusCircle,
  ShieldAlert,
  ListFilter,
  BookOpen
} from "lucide-react";
import { formatCurrency, formatMinutesToHours } from "../utils/formulaEngine";
import { getCategoryBadgeClass } from "./CalculatorView";

export default function PenalTableView({
  infractions,
  aggravantes,
  onAddInfractionWithAggravante
}) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [showAggravantesInline, setShowAggravantesInline] = useState(true);

  const aggsByInf = useMemo(() => {
    const map = new Map();
    aggravantes.forEach(a => {
      if (!map.has(a.idInfraction)) map.set(a.idInfraction, []);
      map.get(a.idInfraction).push(a);
    });
    return map;
  }, [aggravantes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return infractions.filter(inf => {
      if (catFilter !== "ALL" && inf.categorie.toLowerCase() !== catFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const aggs = aggsByInf.get(inf.id) || [];
      const aggMatch = aggs.some(a =>
        a.circonstance.toLowerCase().includes(q) ||
        (a.special && a.special.toLowerCase().includes(q))
      );
      return (
        inf.article.toLowerCase().includes(q) ||
        inf.chefAccusation.toLowerCase().includes(q) ||
        inf.categorie.toLowerCase().includes(q) ||
        (inf.specialBase && inf.specialBase.toLowerCase().includes(q)) ||
        aggMatch
      );
    });
  }, [infractions, aggsByInf, search, catFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={18} style={{ color: "var(--accent-primary)" }} />
            <span>LISTE COMPLÈTE DES INFRACTIONS & CIRCONSTANCES AGGRAVANTES (243 ENTRÉES)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showAggravantesInline}
                onChange={e => setShowAggravantesInline(e.target.checked)}
              />
              <span>Afficher les 159 circonstances aggravantes sous chaque article</span>
            </label>
          </div>
        </div>

        <div className="card-body" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "2.3rem" }}
              placeholder="Rechercher par article (ex: Art. 403), chef d'accusation, circonstance aggravante, sanction spéciale..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: `Toutes (${infractions.length})` },
              { id: "Contravention", label: "Contraventions" },
              { id: "Délit mineur", label: "Délits mineurs" },
              { id: "Délit majeur", label: "Délits majeurs" },
              { id: "Crime", label: "Crimes" }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`btn btn-sm ${catFilter === c.id ? "btn-primary" : ""}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mdt-table-wrap">
          <table className="mdt-table">
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Article</th>
                <th style={{ width: "160px" }}>Catégorie</th>
                <th>Infraction / Circonstance Aggravante</th>
                <th style={{ width: "130px", textAlign: "right" }}>Amende</th>
                <th style={{ width: "130px", textAlign: "right" }}>Peine Prison</th>
                <th>Mentions Spéciales</th>
                <th style={{ width: "155px", textAlign: "center" }}>Action Rapide</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inf => {
                const aggs = aggsByInf.get(inf.id) || [];
                return (
                  <React.Fragment key={inf.id}>
                    <tr>
                      <td>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>
                          {inf.article}
                        </span>
                      </td>
                      <td>
                        <span className={getCategoryBadgeClass(inf.categorie)}>
                          {inf.categorie}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                          {inf.chefAccusation}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontWeight: 800, color: "#34d399" }}>
                          {formatCurrency(inf.amendeBase)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="mono" style={{ fontWeight: 700, color: "var(--accent-secondary)" }}>
                          {formatMinutesToHours(inf.peineBaseMinutes)}
                        </span>
                        <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: "0.3rem" }}>
                          ({inf.peineBaseMinutes}m)
                        </span>
                      </td>
                      <td>
                        {inf.specialBase ? (
                          <span style={{ color: "#fbbf24", fontSize: "0.78rem", fontWeight: 600 }}>
                            {inf.specialBase}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => onAddInfractionWithAggravante(inf.id, null)}
                        >
                          <PlusCircle size={14} />
                          <span>Ajouter</span>
                        </button>
                      </td>
                    </tr>

                    {showAggravantesInline &&
                      aggs.map(agg => (
                        <tr key={agg.uid} style={{ background: "rgba(0, 0, 0, 0.16)" }}>
                          <td style={{ paddingLeft: "1.4rem" }}>
                            <span className="mono" style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                              ↳ {agg.article}
                            </span>
                          </td>
                          <td>
                            <span
                              className="cat-badge"
                              style={{
                                background: "rgba(244, 63, 94, 0.1)",
                                color: "#fda4af",
                                border: "1px solid rgba(244, 63, 94, 0.28)",
                                fontSize: "0.66rem"
                              }}
                            >
                              Cir. Aggravante
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              + {agg.circonstance}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="mono" style={{ fontSize: "0.8rem", color: "#34d399" }}>
                              +{formatCurrency(agg.amendeSupplementaire)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className="mono" style={{ fontSize: "0.8rem", color: "var(--accent-secondary)" }}>
                              +{formatMinutesToHours(agg.peineSupplementaireMinutes)} ({agg.peineSupplementaireMinutes}m)
                            </span>
                          </td>
                          <td>
                            {agg.special ? (
                              <span style={{ color: "#fb7185", fontSize: "0.76rem", fontWeight: 700 }}>
                                {agg.special}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => onAddInfractionWithAggravante(inf.id, agg.uid)}
                              title="Ajouter l'infraction avec cette circonstance aggravante"
                            >
                              <PlusCircle size={13} />
                              <span>Avec aggrav.</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
