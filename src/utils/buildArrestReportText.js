// Générateur officiel du texte de Rapport d'Arrestation LSPD (Art. 117-5 & 123 CPC)
// Partagé entre le Calculateur de Peines et l'onglet dédié Rapports d'Arrestation.

import { formatCurrency, formatMinutesToHours, formatRetentionHours } from "./formulaEngine";
import { LSPD_TEMPLATES } from "../data/lspdTemplates";

export function buildArrestReportText({
  templateId = "standard",
  reportNumber = "LSPD-RA-2026",
  date = "",
  heure = "",
  agent = "16 | Vance Winchester",
  prevenu = "Non renseigné",
  lieuInterpellation = "Los Santos",
  unitesPresentes = "",
  statutIdentite = "Carte d'identité vérifiée",
  attitudeSuspect = "Coopératif",
  statutMiranda = "Lus et compris au poste de police (Art. 123)",
  hasAvocat = false,
  nomAvocat = "",
  avocatMultiplier = 0.9,
  objetsSaisis = "Aucun objet illégal saisi",
  circonstancesFaits = "",
  notes = "",
  palierRetenu = "NOMINALE",
  amendeRetenue = 0,
  peineMinutes = 0,
  rowsSnapshot = [],
  judgeRequired = false,
  maxRetentionHours = 0,
  specialNotes = []
}) {
  const safeDate = date || new Date().toLocaleDateString("fr-FR");
  const safeHeure = heure || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const chargesLines =
    rowsSnapshot.length > 0
      ? rowsSnapshot.map((r, idx) => {
          const mods = [];
          if ((r.qte || 1) > 1) mods.push(`Qté ×${r.qte}`);
          if (r.tentative) mods.push("Tentative");
          if (r.complicite) mods.push("Complicité");
          if (r.avocat) mods.push("Avocat");
          const aggText = Array.isArray(r.aggravantesLabels) && r.aggravantesLabels.length > 0
            ? `\n   └─ Circonstances aggravantes : ${r.aggravantesLabels.join(" ; ")}`
            : "";
          const modText = mods.length > 0 ? `\n   └─ Modificateurs appliqués  : ${mods.join(" • ")}` : "";
          return `  ${idx + 1}. [${r.article || "CODE PÉNAL"}] ${r.chefAccusation} (${r.categorie || "Infraction"}) — Max: ${formatCurrency(r.totalFine || 0)} | ${formatMinutesToHours(r.totalPeineMinutes || 0)}${aggText}${modText}`;
        })
      : ["  (Aucun chef d'inculpation renseigné)"];

  const chargesAndSentenceBlock = [
    `[CHEFS D'INCULPATION RETENUS (${rowsSnapshot.length})]`,
    ...chargesLines,
    ``,
    `[DÉCISION, PALIER APPLIQUÉ & SUIVI JUDICIAIRE]`,
    `• Palier appliqué            : ${palierRetenu}`,
    `• Amende finale prononcée    : ${formatCurrency(amendeRetenue)}`,
    `• Peine de prison retenue    : ${formatMinutesToHours(peineMinutes)} (${peineMinutes} min)`,
    ...(maxRetentionHours > 0 ? [`• Rétention maximale légale  : ${formatRetentionHours(maxRetentionHours)}`] : []),
    `• Avis Juge / Procureur      : ${
      judgeRequired
        ? "OBLIGATOIRE (*Délit majeur / Crime — Transmission au DOJ / Procureur requise)"
        : "Non requis (Procédure standard LSPD)"
    }`,
    ``
  ].join("\n");

  if (templateId && templateId !== "standard") {
    const selectedTpl = LSPD_TEMPLATES.find(t => t.id === templateId);
    if (selectedTpl) {
      return selectedTpl.generateContent({
        caseNumber: reportNumber,
        title: selectedTpl.title,
        agent,
        targetName: prevenu,
        targetGroup: "",
        location: lieuInterpellation || "Los Santos",
        date: safeDate,
        heure: safeHeure,
        extraChargesBlock: chargesAndSentenceBlock
      });
    }
  }

  const infractionsShortList =
    rowsSnapshot.length > 0
      ? rowsSnapshot.map(r => r.chefAccusation).join(", ")
      : "les infractions constatées";

  const defaultNarrative =
    (circonstancesFaits || "").trim() ||
    `Le ${safeDate} aux alentours de ${safeHeure}, sur le secteur de ${lieuInterpellation || "Los Santos"}, les effectifs du Los Santos Police Department (${unitesPresentes || agent}) ont procédé au contrôle et à l'interpellation de l'individu identifié comme ${prevenu} suite à une suspicion raisonnable et la constatation des faits suivants : ${infractionsShortList}.\n` +
      `1. Menottage & Sécurisation : L'individu a été menotté sur les lieux pour garantir sa sécurité et celle des agents, puis informé de sa mise en état d'arrestation.\n` +
      `2. Fouille initiale & Transport : Une fouille de sécurité initiale a été effectuée sur place avant l'embarquement dans le véhicule de patrouille et le retour au poste de police.\n` +
      `3. Identification & Droits Miranda : Au poste de police, l'individu a été démenotté sous surveillance (${statutIdentite}). Ses droits constitutionnels Miranda ainsi que ses chefs d'inculpation lui ont été notifiés (${statutMiranda}).\n` +
      `4. Fouille complète & Mise en cellule : Après fouille complète et inventaire des effets saisis, l'individu a été placé en cellule.`;

  const avocatDetail = hasAvocat
    ? `OUI — Assisté d'un avocat${nomAvocat.trim() ? ` (${nomAvocat.trim()})` : " (Commis d'office / Privé)"} [Remise légale ×${avocatMultiplier}]`
    : `NON — L'individu n'a pas souhaité ou n'est pas assisté d'un avocat`;

  const lines = [
    `╔══════════════════════════════════════════════════════════════════╗`,
    `     LOS SANTOS POLICE DEPARTMENT — RAPPORT D'ARRESTATION (MDT)`,
    `     RÉFÉRENCE DOSSIER : ${reportNumber || "LSPD-RA-2026"}`,
    `╚══════════════════════════════════════════════════════════════════╝`,
    ``,
    `[1. INFORMATIONS GÉNÉRALES D'INTERVENTION]`,
    `• Date & Heure d'arrestation : ${safeDate} à ${safeHeure}`,
    `• Lieu de l'interpellation   : ${lieuInterpellation || "Los Santos"}`,
    `• Agent rédacteur (En charge): ${agent}`,
    `• Unités / Agents présents   : ${unitesPresentes || agent}`,
    ``,
    `[2. IDENTITÉ & COMPORTEMENT DU MIS EN CAUSE]`,
    `• Nom & Prénom du prévenu    : ${prevenu}`,
    `• Vérification d'identité    : ${statutIdentite}`,
    `• Réaction & Coopération     : ${attitudeSuspect}`,
    ``,
    `[3. DROITS CONSTITUTIONNELS MIRANDA & DÉFENSE (ART. 123)]`,
    `• Notification des droits    : Lus le ${safeDate} à ${safeHeure} — ${statutMiranda}`,
    `• Assistance d'un avocat     : ${avocatDetail}`,
    ``,
    `[4. CIRCONSTANCES DE L'ARRESTATION & CAUSE PROBABLE (ART. 117-5)]`,
    defaultNarrative,
    ``,
    `[5. FOUILLES (INITIALE & COMPLÈTE) ET OBJETS SAISIS / SCELLÉS]`,
    `• Inventaire des saisies     : ${objetsSaisis || "Aucun objet illégal saisi"}`,
    ...(specialNotes.length > 0
      ? [`• Mesures complémentaires    : ${specialNotes.map(s => `[${s.article}] ${s.note}`).join(" • ")}`]
      : [`• Mesures complémentaires    : Aucune mesure spéciale additionnelle`]),
    ``,
    chargesAndSentenceBlock,
    ...(notes && notes.trim() ? [`[OBSERVATIONS SUPPLÉMENTAIRES]`, `${notes.trim()}`, ``] : []),
    `Rapport rédigé et certifié exact par : ${agent} — Los Santos Police Department.`
  ];

  return lines.join("\n");
}
