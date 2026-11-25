import React, { useState, useMemo } from "react";
import {
  FileText,
  Scale,
  ShieldCheck,
  Gavel,
  Users,
  BookOpen,
  Search
} from "lucide-react";
import { PROCEDURES_DATA } from "../data/sheetData";
import { LEGAL_CODES_DATA } from "../data/legalCodesData";

const TABS = [
  { id: "arrestation", label: "Procédures d'Arrestation", icon: ShieldCheck, group: "proc" },
  { id: "delitMajeur", label: "Procédure Délit Majeur", icon: Scale, group: "proc" },
  { id: "proces", label: "Déroulement d'un Procès", icon: Gavel, group: "proc" },
  { id: "regles", label: "Règles Générales", icon: FileText, group: "proc" },
  { id: "roles", label: "Rôles DOJ & Tribunal", icon: Users, group: "proc" },
  { id: "codePenal", label: "Code Pénal Complet", icon: BookOpen, group: "code" },
  { id: "procedureCriminelle", label: "Code Procédure Criminelle", icon: BookOpen, group: "code" },
  { id: "codeRoute", label: "Code de la Route", icon: BookOpen, group: "code" },
  { id: "codeIrs", label: "Code de l'IRS", icon: BookOpen, group: "code" },
  { id: "constitution", label: "Constitution San Andreas", icon: BookOpen, group: "code" }
];

export default function ProceduresAndCodesView() {
  const [activeDoc, setActiveDoc] = useState("arrestation");
  const [searchQuery, setSearchQuery] = useState("");

  const currentTabObj = TABS.find(t => t.id === activeDoc) || TABS[0];
  const isLegalCode = currentTabObj.group === "code";

  const filteredProcedureBlocks = useMemo(() => {
    if (isLegalCode) return [];
    const blocks = PROCEDURES_DATA[activeDoc] || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter(b => b.text.toLowerCase().includes(q));
  }, [activeDoc, isLegalCode, searchQuery]);

  const filteredCodeBlocks = useMemo(() => {
    if (!isLegalCode) return [];
    const doc = LEGAL_CODES_DATA[activeDoc];
    if (!doc) return [];
    const q = searchQuery.trim().toLowerCase();
    const list = doc.blocks || [];
    if (!q) return list.slice(0, 600); // snappy rendering while showing full sections
    return list.filter(b => b.text.toLowerCase().includes(q));
  }, [activeDoc, isLegalCode, searchQuery]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.25rem", alignItems: "start" }}>
      {/* SIDEBAR MENU OF ALL SHEETS / CODES */}
      <aside className="card" style={{ position: "sticky", top: "78px" }}>
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={17} style={{ color: "var(--accent-primary)" }} />
            <span>Procédures & Codes de Loi</span>
          </div>
        </div>
        <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", padding: "0.25rem 0.5rem", textTransform: "uppercase" }}>
            Fiches Procédurales (5 Onglets)
          </div>
          {TABS.filter(t => t.group === "proc").map(tab => {
            const Icon = tab.icon;
            const active = activeDoc === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDoc(tab.id)}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: active ? "var(--accent-primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  borderColor: active ? "var(--accent-primary)" : "transparent"
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", padding: "0.65rem 0.5rem 0.25rem", textTransform: "uppercase" }}>
            Textes de Lois Intégraux (5 Codes)
          </div>
          {TABS.filter(t => t.group === "code").map(tab => {
            const Icon = tab.icon;
            const active = activeDoc === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDoc(tab.id)}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: active ? "var(--accent-primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  borderColor: active ? "var(--accent-primary)" : "transparent"
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CONTENT READER */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <FileText size={18} style={{ color: "var(--accent-primary)" }} />
              <span>{currentTabObj.label}</span>
            </div>
            {isLegalCode && LEGAL_CODES_DATA[activeDoc] && (
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {LEGAL_CODES_DATA[activeDoc].subtitle}
              </div>
            )}
          </div>

          <div style={{ position: "relative", minWidth: "280px" }}>
            <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "2.2rem" }}
              placeholder={`Rechercher dans ${currentTabObj.label}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxHeight: "78vh", overflowY: "auto" }}>
          {!isLegalCode ? (
            filteredProcedureBlocks.map((b, i) => {
              const isHeading =
                b.row === 1 ||
                /^[0-9]+\.\s+/.test(b.text) ||
                b.text === b.text.toUpperCase() ||
                b.text.length < 45;
              return (
                <div
                  key={i}
                  style={{
                    padding: isHeading ? "0.7rem 0.9rem" : "0.65rem 1rem",
                    borderRadius: "9px",
                    background: isHeading ? "var(--accent-glow)" : "var(--bg-input)",
                    border: `1px solid ${isHeading ? "var(--border-strong)" : "var(--border-color)"}`,
                    fontWeight: isHeading ? 700 : 400,
                    color: isHeading ? "var(--accent-secondary)" : "var(--text-primary)",
                    fontSize: isHeading ? "0.9rem" : "0.84rem"
                  }}
                >
                  {b.text}
                </div>
              );
            })
          ) : (
            <>
              {!searchQuery && LEGAL_CODES_DATA[activeDoc]?.blocks?.length > 600 && (
                <div className="alert-banner alert-info">
                  <span>
                    Affichage des 600 premiers paragraphes ({LEGAL_CODES_DATA[activeDoc].blocks.length} au total dans cet onglet). Utilisez la barre de recherche ci-dessus pour filtrer instantanément n'importe quel article ou mot-clé dans l'intégralité du texte.
                  </span>
                </div>
              )}
              {filteredCodeBlocks.map(b => {
                if (b.type === "part") {
                  return (
                    <div
                      key={b.id}
                      style={{
                        marginTop: "0.8rem",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        background: "var(--accent-glow)",
                        border: "1px solid var(--border-strong)",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: "var(--accent-secondary)"
                      }}
                    >
                      {b.text}
                    </div>
                  );
                }
                if (b.type === "section") {
                  return (
                    <div
                      key={b.id}
                      style={{
                        marginTop: "0.4rem",
                        padding: "0.55rem 0.9rem",
                        borderRadius: "8px",
                        background: "var(--bg-elevated)",
                        borderLeft: "3px solid var(--badge-gold)",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--badge-gold)"
                      }}
                    >
                      {b.text}
                    </div>
                  );
                }
                if (b.type === "article") {
                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: "0.6rem 0.9rem",
                        borderRadius: "8px",
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-strong)",
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: "var(--text-primary)"
                      }}
                    >
                      {b.text}
                    </div>
                  );
                }
                return (
                  <div
                    key={b.id}
                    style={{
                      padding: "0.45rem 0.9rem",
                      fontSize: "0.83rem",
                      color: b.type === "meta" ? "#34d399" : "var(--text-secondary)",
                      fontWeight: b.type === "meta" ? 600 : 400
                    }}
                  >
                    {b.text}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
