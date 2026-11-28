// Grades officiels LSPD & DOJ utilisés dans les comptes, inscriptions, badges et gestion des rôles

export const LSPD_RANKS = [
  "Rookie",
  "Officier",
  "Officier II",
  "Officier III",
  "Sergent",
  "Lieutenant",
  "Capitaine"
];

export const DOJ_RANKS = [
  "Procureur",
  "Procureur Général",
  "Juge",
  "Juge en Chef"
];

export const ALL_OFFICIAL_RANKS = [...LSPD_RANKS, ...DOJ_RANKS];

export function getRankStyle(rank) {
  const r = String(rank || "").toLowerCase();
  if (r.includes("capitaine") || r.includes("commandant") || r.includes("chef")) {
    return { color: "#dfb556", bg: "rgba(223, 181, 86, 0.18)", border: "rgba(223, 181, 86, 0.5)" };
  }
  if (r.includes("lieutenant")) {
    return { color: "#00e676", bg: "rgba(0, 230, 118, 0.16)", border: "rgba(0, 230, 118, 0.45)" };
  }
  if (r.includes("sergent")) {
    return { color: "#a855f7", bg: "rgba(168, 85, 247, 0.16)", border: "rgba(168, 85, 247, 0.45)" };
  }
  if (r.includes("juge") || r.includes("procureur")) {
    return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.18)", border: "rgba(251, 191, 36, 0.5)" };
  }
  if (r.includes("iii") || r.includes("3")) {
    return { color: "#60a5fa", bg: "rgba(96, 165, 250, 0.18)", border: "rgba(96, 165, 250, 0.45)" };
  }
  if (r.includes("ii") || r.includes("2")) {
    return { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.16)", border: "rgba(56, 189, 248, 0.42)" };
  }
  return { color: "#93c5fd", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)" };
}
