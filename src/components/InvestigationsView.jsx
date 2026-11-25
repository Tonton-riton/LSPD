import React, { useState, useMemo } from "react";

export const LSPD_TEMPLATES = [
  {
    id: "tpl_enquete_criminelle",
    title: "Dossier d'Enquête Criminelle (Detective Bureau)",
    category: "Enquête DB",
    icon: "user-secret",
    badgeClass: "cat-crime",
    description: "Modèle complet d'ouverture et de suivi d'enquête criminelle (homicide, crime organisé, trafic, grand banditisme).",
    defaultPriority: "high",
    defaultDivision: "Detective Bureau (Crimes & Homicides)",
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — DETECTIVE BUREAU
     DOSSIER D'ENQUÊTE CRIMINELLE N° : ${caseNumber || "LSPD-DB-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. IDENTIFICATION DU DOSSIER]
• Intitulé de l'affaire        : ${title || "Opération / Enquête en cours"}
• Date d'ouverture             : ${date} à ${heure}
• Division en charge           : Detective Bureau — Los Santos Police Department
• Détective directeur          : ${agent || "16 | Vance Winchester"}
• Agents co-assignés           : À compléter
• Niveau d'habilitation        : CONFIDENTIEL — LSPD / DOJ

[2. CIBLES & PERSONNES D'INTÉRÊT]
• Suspect principal identifié  : ${targetName || "Inconnu / Contre X"}
• Affiliation / Organisation   : ${targetGroup || "Aucune affiliation confirmée"}
• Secteur géographique         : ${location || "Los Santos"}
• Dangerosité estimée          : Élevée (Susceptible d'être armé)

[3. ORIGINE DE LA SAISINE & EXPOSÉ DES FAITS]
En date du ${date}, le Detective Bureau du LSPD a ouvert une enquête officielle concernant les faits suivants :
- Nature des infractions suspectées : [Préciser : Trafic d'armes / Homicide / Braquage / Blanchiment...]
- Contexte initial : Lors d'une opération de patrouille / suite à un signalement / suite à une arrestation sur le secteur de ${location || "Los Santos"}, les éléments suivants ont été portés à la connaissance des enquêteurs :
  1. [Élément factuel n°1]
  2. [Élément factuel n°2]

[4. ÉLÉMENTS DE PREUVE & SCELLÉS RÉUNIS]
• Scellé #01 (Matériel / Armes) : [Ex: Douilles 9mm relevées sur place / Arme saisie]
• Scellé #02 (Numérique / Photo): [Ex: Photographies de surveillance / Relevés téléphoniques]
• Scellé #03 (Témoignages)      : [Ex: Déposition du témoin / Procès-verbal d'audition]

[5. CHRONOLOGIE DES INVESTIGATIONS]
• [${date} - ${heure}] : Ouverture officielle du dossier d'enquête et consignation des premiers scellés.
• [À compléter]       : Surveillance / Audition / Demande de mandat.

[6. RÉQUISITIONS & DEMANDES AU DEPARTMENT OF JUSTICE (DOJ)]
• Mesure sollicitée            : [ ] Mandat de perquisition  [ ] Mandat d'arrêt  [ ] Mise sur écoute  [ ] Renvoi en procès
• Synthèse de la cause probable: Les preuves matérielles et observations recueillies établissent une suspicion légitime et concordante justifiant la poursuite des investigations.

Signé : ${agent || "16 | Vance Winchester"} — Detective Bureau, LSPD.`
  },
  {
    id: "tpl_interrogatoire",
    title: "Procès-Verbal d'Interrogatoire / Audition (Art. 131)",
    category: "Interrogatoire",
    icon: "comments",
    badgeClass: "cat-delit-majeur",
    description: "Template officiel de retranscription d'interrogatoire de suspect ou d'audition de témoin (Questions / Réponses & Droits Miranda).",
    defaultPriority: "medium",
    defaultDivision: "Detective Bureau / Patrouille",
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — PROCÈS-VERBAL D'INTERROGATOIRE
     RÉFÉRENCE PROCÉDURE : ${caseNumber || "LSPD-PV-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. CADRE DE L'AUDITION (ART. 131 CODE DE PROCÉDURE CRIMINELLE)]
• Date & Heure de début        : ${date} à ${heure}
• Heure de fin d'audition      : __:__
• Lieu de l'audition           : Salle d'interrogatoire — Poste LSPD (${location || "Mission Row"})
• Agent(s) interrogateur(s)    : ${agent || "16 | Vance Winchester"}
• Magistrat présent (si applicable) : Procureur / Aucun

[2. IDENTITÉ DE LA PERSONNE ENTENDUE]
• Nom & Prénom                 : ${targetName || "Nom du suspect / témoin"}
• Statut durant l'audition     : [X] Suspect en rétention judiciaire  [ ] Témoin  [ ] Victime
• Notification Droits Miranda  : Notifiés et compris avant le début des questions
• Assistance d'un Avocat       : [ ] Non (Renonce à son droit)  [ ] Oui (M° ________________)
  (Note : Entretien confidentiel préalable de 10 min max accordé si avocat présent)

[3. RETRANSCRIPTION DE L'INTERROGATOIRE (QUESTIONS / RÉPONSES)]
• Question LSPD : Pouvez-vous décliner votre identité complète et nous expliquer votre présence sur le secteur de ${location || "Los Santos"} ?
  ↳ Réponse de ${targetName || "l'individu"} : « [Retranscrire la déclaration] »

• Question LSPD : [Question n°2 sur les faits reprochés / les objets saisis]
  ↳ Réponse de ${targetName || "l'individu"} : « [Retranscrire la déclaration] »

• Question LSPD : [Question n°3 sur d'éventuels complices ou commanditaires]
  ↳ Réponse de ${targetName || "l'individu"} : « [Retranscrire la déclaration] »

• Observations de l'Avocat (si présent) :
  ↳ « [Aucune observation / Observation de la défense] »

[4. CONCLUSION & ATTITUDE DURANT L'ENTRETIEN]
• Comportement observé         : [Calme / Coopératif / Évasif / Hostile / Garde le silence]
• Plaidoyer (si Délit Majeur)  : [ ] Plaide Coupable (Comparution immédiate)  [ ] Plaide Non Coupable

Fait à Los Santos, le ${date}.
Signé : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },
  {
    id: "tpl_mandat_perquisition",
    title: "Demande de Mandat de Perquisition (Art. 151-160)",
    category: "Mandat DOJ",
    icon: "file-signature",
    badgeClass: "cat-crime",
    description: "Requête officielle adressée au Procureur et au Juge pour autoriser la perquisition d'un domicile, entrepôt ou véhicule.",
    defaultPriority: "critical",
    defaultDivision: "Detective Bureau / Command Staff",
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE AUX FINS DE MANDAT DE PERQUISITION — LSPD / DOJ
     RÉFÉRENCE DOSSIER : ${caseNumber || "LSPD-MP-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

À L'ATTENTION DE :
• Bureau du Procureur de San Andreas & Cour de Justice (Juge Fédéral / Juge d'État)

[1. AGENT REQUÉRANT]
• Nom, Grade & Matricule       : ${agent || "16 | Vance Winchester"}
• Service                      : Los Santos Police Department
• Date & Heure de la requête   : ${date} à ${heure}

[2. PERSONNE & LIEUX VISÉS PAR LA PERQUISITION (ART. 154)]
• Propriétaire / Occupant visé : ${targetName || "Nom du suspect"} ${targetGroup ? `(Affiliation : ${targetGroup})` : ""}
• Désignation précise des lieux: ${location || "Adresse exacte du domicile / entrepôt / plaque du véhicule"}
• Nature du bien               : [X] Domicile privé  [ ] Locaux commerciaux / Entreprise  [ ] Véhicule(s)

[3. EXPOSÉ DE LA CAUSE PROBABLE (PROBABLE CAUSE)]
Conformément à la Constitution de San Andreas et au Code de Procédure Criminelle, les éléments factuels suivants établissent l'existence d'indices graves et concordants :
1. Faits reprochés : ${title || "Trafic d'armes / Stupéfiants / Recel / Association de malfaiteurs"}.
2. Éléments matériels recueillis :
   - [Détail de la filature, saisie préalable, témoignage sous serment ou flagrant délit]
   - [Lien direct entre l'infraction et le lieu visé par la perquisition]

[4. OBJETS & PREUVES RECHERCHÉS]
La perquisition a pour objet exclusif la recherche et la saisie de :
- Armes à feu illégales (Catégories A, B, C non déclarées), munitions et équipements tactiques ;
- Substances stupéfiantes, matériel de conditionnement ou de production ;
- Sommes d'argent issues d'activités illicites, documents comptables ou supports numériques.

[5. MODALITÉS D'EXÉCUTION SOLLICITÉES]
• Créneau d'exécution demandé  : Du ${date} au __/__/2026
• Dispositif prévu             : Effectifs LSPD / Unité Tactique SWAT

En foi de quoi, sollicitons la délivrance d'un Mandat de Perquisition officiel.
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },
  {
    id: "tpl_bolo_mandat_arret",
    title: "Avis de Recherche (BOLO) & Mandat d'Arrêt",
    category: "BOLO / Warrant",
    icon: "bullseye",
    badgeClass: "cat-delit-majeur",
    description: "Diffusion d'un avis de recherche actif (Be On The Lookout) à toutes les unités LSPD pour un fugitif ou véhicule recherché.",
    defaultPriority: "high",
    defaultDivision: "Toutes Unités LSPD",
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — AVIS DE RECHERCHE (BOLO)
     N° D'ALERTE : ${caseNumber || "BOLO-2026-001"} • PRIORITÉ : HAUTE
╚══════════════════════════════════════════════════════════════════╝

[1. INDIVIDU RECHERCHÉ]
• Nom & Prénom                 : ${targetName || "Individu recherché"}
• Surnom / Alias               : Inconnu
• Groupe / Gang connu          : ${targetGroup || "Aucun / Indépendant"}
• Dernière position connue     : ${location || "Los Santos"} (le ${date} à ${heure})

[2. SIGNALEMENT & VÉHICULE(S)]
• Description vestimentaire    : [Tenue, masque, signes distinctifs...]
• Véhicule(s) utilisé(s)       : [Modèle, Couleur, Plaque d'immatriculation]

[3. MOTIFS DE RECHERCHE & CHEFS D'ACCUSATION]
• Affaire concernée            : ${title || "Délit de fuite / Fusillade / Braquage"}
• Infractions reprochées       :
  - [Chef d'accusation n°1]
  - [Chef d'accusation n°2]

[4. ÉVALUATION DES RISQUES & CONSIGNES AUX UNITÉS]
• Niveau de menace             : [X] ARMÉ ET DANGEREUX — Approche avec précaution (Code 3 / Renforts requis)
• Consignes d'intervention     : Procéder à l'interpellation immédiate, menottage, fouille de sécurité et transfert au poste LSPD. Contacter l'agent référent dès l'arrestation.

Agent émetteur : ${agent || "16 | Vance Winchester"} — LSPD.`
  },
  {
    id: "tpl_depot_plainte",
    title: "Procès-Verbal de Dépôt de Plainte Citoyenne",
    category: "Plainte",
    icon: "file-lines",
    badgeClass: "cat-delit-mineur",
    description: "Enregistrement officiel de la plainte d'un citoyen ou d'une victime à l'accueil du commissariat LSPD.",
    defaultPriority: "medium",
    defaultDivision: "Patrouille / Accueil LSPD",
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — DÉPÔT DE PLAINTE OFFICIEL
     N° DE PLAINTE : ${caseNumber || "LSPD-PL-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. RÉCEPTION DE LA PLAINTE]
• Date & Heure du dépôt        : ${date} à ${heure}
• Agent récepteur              : ${agent || "16 | Vance Winchester"}
• Qualification provisoire     : ${title || "Vol / Agression / Menaces / Dégradation"}

[2. IDENTITÉ DU PLAIGNANT (VICTIME)]
• Nom & Prénom du plaignant    : ________________________
• Numéro de téléphone          : 555-______
• Profession / Entreprise      : ________________________

[3. PERSONNE(S) MISE(S) EN CAUSE]
• Plainte déposée contre       : ${targetName || "Contre X (Auteur non identifié)"}
• Signalement / Éléments fournis: [Description physique, véhicule, plaque, témoins...]
• Lieu et heure des faits      : ${location || "Los Santos"}

[4. DÉCLARATION DÉTAILLÉE DE LA VICTIME]
« [Retranscrire le récit exact des faits rapportés par la victime : circonstances, déroulement, menaces ou violences subies...] »

[5. PRÉJUDICE & PREUVES REMISES]
• Préjudice matériel / financier: [Montant ou biens volés/dégradés]
• Préjudice corporel (Certificat médical EMS) : [Aucun / Certificat médical joint]
• Preuves remises au LSPD      : [Vidéo, captures SMS, témoignages...]

Le plaignant certifie sur l'honneur l'exactitude de ses déclarations (rappel de l'Art. 304 Fausse alerte & Art. 312 Parjure).
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },
  {
    id: "tpl_saisie_scelles",
    title: "Fiche de Saisie, Mise sous Scellés & Balistique (Art. 146)",
    category: "Scellés",
    icon: "boxes-stacked",
    badgeClass: "cat-contravention",
    description: "Inventaire officiel des armes, stupéfiants, équipements gouvernementaux ou véhicules placés sous scellés.",
    defaultPriority: "medium",
    defaultDivision: "Armurerie & Scellés LSPD",
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — REGISTRE DES SCELLÉS (ART. 146)
     BORDEREAU DE SAISIE N° : ${caseNumber || "LSPD-SC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. TRAÇABILITÉ DE LA SAISIE]
• Date & Heure de mise sous scellé : ${date} à ${heure}
• Agent saisissant                 : ${agent || "16 | Vance Winchester"}
• Lieu de la saisie                : ${location || "Poste de Police LSPD / Lieu d'intervention"}
• Dossier / Prévenu rattaché       : ${targetName || "Non renseigné"} (${title || "Arrestation"})

[2. INVENTAIRE DÉTAILLÉ DES PIÈCES À CONVICTION]
1. ARMES & MUNITIONS :
   • Désignation & Catégorie : [Ex: Pistolet Glock 19 (Cat. B1) / AK-47 (Cat. A1)]
   • Numéro de série / Provenance : [Ex: Série illisible / Marché noir / Équipement Police]
   • Munitions saisies : [Ex: 45x munitions 9mm]

2. STUPÉFIANTS & PRODUITS ILLICITES :
   • Nature du produit : [Ex: Cannabis / Cocaïne / Méthamphétamine]
   • Quantité exacte (pochons) : [Ex: 24 pochons]

3. AUTRES BIENS / ÉQUIPEMENTS / SOMMES D'ARGENT :
   • Détail : [Ex: Argent sale / Gilet tactique / Véhicule mis en fourrière]

[3. CHAÎNE DE GARDE & DESTINATION]
• Destination du scellé : [X] Coffre des preuves LSPD  [ ] Destruction réglementaire  [ ] Pièce à conviction DOJ

Certifié conforme par : ${agent || "16 | Vance Winchester"} — LSPD.`
  },
  {
    id: "tpl_rapport_perquisition",
    title: "Rapport d'Exécution de Mandat & Perquisition (Art. 163)",
    category: "Exécution Mandat",
    icon: "door-open",
    badgeClass: "cat-crime",
    description: "Compte-rendu obligatoire après l'exécution d'un mandat de perquisition ou d'arrêt à transmettre au Procureur et au Juge.",
    defaultPriority: "high",
    defaultDivision: "SWAT / Detective Bureau",
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT D'EXÉCUTION DE MANDAT
     CONFORME À L'ARTICLE 163 DU CODE DE PROCÉDURE CRIMINELLE
╚══════════════════════════════════════════════════════════════════╝

[1. RÉFÉRENCES DU MANDAT EXÉCUTÉ]
• Référence du rapport         : ${caseNumber || "LSPD-REM-2026-001"}
• Nature du mandat             : [X] Mandat de Perquisition  [ ] Mandat d'Arrêt
• Magistrat signataire         : Juge ________________ / Procureur ________________
• Cible & Lieux visités        : ${targetName || "Cible"} — ${location || "Lieu perquisitionné"}

[2. DÉROULEMENT DE L'OPÉRATION]
• Date & Heure d'intervention  : Le ${date} à ${heure}
• Responsable d'opération      : ${agent || "16 | Vance Winchester"}
• Effectifs engagés            : [Liste des agents LSPD / SWAT présents]
• Conditions d'entrée          : [Ouverture volontaire / Effraction tactique nécessaire]
• Personnes présentes sur place: ${targetName || "Aucune personne présente / Individus interpellés"}

[3. BILAN DES SAISIES EFFECTUÉES SUR PLACE]
• Scellés constitués lors de la perquisition :
  - [Scellé #1 : Description précise et quantité]
  - [Scellé #2 : Description précise et quantité]
• Incidents éventuels          : [Aucun incident / Coups de feu / Dégradations]

Transmission officielle au Bureau du Procureur et au Juge pour contrôle de régularité.
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },
  {
    id: "tpl_surveillance_gang",
    title: "Rapport de Filature & Renseignement Gang (GND)",
    category: "Renseignement GND",
    icon: "binoculars",
    badgeClass: "cat-delit-majeur",
    description: "Fiche de renseignement sur une organisation criminelle ou un gang (membres, véhicules, territoire, activités illégales).",
    defaultPriority: "medium",
    defaultDivision: "Gang & Narcotics Division (GND)",
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD — GANG & NARCOTICS DIVISION (GND) — FICHE RENSEIGNEMENT
     RAPPORT DE SURVEILLANCE N° : ${caseNumber || "LSPD-GND-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. ORGANISATION / GROUPE SURVEILLÉ]
• Nom du Groupe / Gang         : ${targetGroup || title || "Organisation sous surveillance"}
• Secteur / Quartier d'influence: ${location || "Los Santos"}
• Couleurs / Signes distinctifs: [Tenue, tatouages, signes de ralliement]
• Date & Heure d'observation   : ${date} à ${heure}
• Agent(s) observateur(s)      : ${agent || "16 | Vance Winchester"}

[2. MEMBRES IDENTIFIÉS & HIÉRARCHIE SUPPOSÉE]
• Cible principale observée    : ${targetName || "Membre identifié"}
• Autres individus repérés     : [Noms RP, alias, rôles observés]
• Véhicules récurrents         : [Modèle, couleur, plaque d'immatriculation]

[3. ACTIVITÉS ILLICITES OBSERVÉES]
• Faits constatés lors de la filature :
  - [Ex: Transactions de stupéfiants (Art. 802), port d'armes lourdes, rassemblement armé...]
• Photographies / Preuves jointes : [Oui / Références photos]

Signé : ${agent || "16 | Vance Winchester"} — Gang & Narcotics Division, LSPD.`
  }
];

const INITIAL_SAMPLE_CASES = [
  {
    id: "case_sample_1",
    caseNumber: "LSPD-DB-2026-014",
    title: "Braquage Supérette Strawberry & Refus d'obtempérer",
    templateId: "tpl_enquete_criminelle",
    division: "Detective Bureau / Patrouille",
    status: "in_progress",
    priority: "high",
    leadAgent: "16 | Vance Winchester",
    targetName: "Mike Armstrong",
    targetGroup: "Indépendant",
    location: "Strawberry Ave — Supérette n°4",
    createdAt: "25/11/2026 02:21",
    suspects: [
      { name: "Mike Armstrong", status: "En garde à vue", role: "Auteur principal" }
    ],
    evidence: [
      { code: "SC-01", label: "Vidéosurveillance de la supérette Strawberry" },
      { code: "SC-02", label: "Rapport d'interpellation véhicule en fuite (Art. 301)" }
    ],
    reportText: ""
  },
  {
    id: "case_sample_2",
    caseNumber: "LSPD-GND-2026-008",
    title: "Surveillance Trafic d'Armes Catégorie A & Stupéfiants",
    templateId: "tpl_surveillance_gang",
    division: "Gang & Narcotics Division (GND)",
    status: "warrant_needed",
    priority: "critical",
    leadAgent: "16 | Vance Winchester",
    targetName: "Réseau Port de Los Santos",
    targetGroup: "Organisation Criminelle",
    location: "Docks de Los Santos — Entrepôt Sud",
    createdAt: "24/11/2026 21:45",
    suspects: [
      { name: "Suspect non identifié #1", status: "Sous surveillance", role: "Revendeur / Instigateur (Art. 802)" }
    ],
    evidence: [
      { code: "SC-01", label: "Clichés photographiques d'échanges de caisses d'armes Cat. A" },
      { code: "SC-02", label: "Relevé de plaques d'immatriculation aux abords des Docks" }
    ],
    reportText: ""
  }
];

// Populate initial sample cases reportText using their template
INITIAL_SAMPLE_CASES.forEach(c => {
  const tpl = LSPD_TEMPLATES.find(t => t.id === c.templateId) || LSPD_TEMPLATES[0];
  const [d, h] = c.createdAt.split(" ");
  c.reportText = tpl.generateContent({
    caseNumber: c.caseNumber,
    title: c.title,
    agent: c.leadAgent,
    targetName: c.targetName,
    targetGroup: c.targetGroup,
    location: c.location,
    date: d || "25/11/2026",
    heure: h || "02:21"
  });
});

const STATUS_BADGES = {
  in_progress:    { label: "Enquête en cours", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  surveillance:   { label: "Sous surveillance", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  warrant_needed: { label: "Mandat DOJ requis", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  prosecutor:     { label: "Transmis au Procureur", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)" },
  closed:         { label: "Clôturé / Résolu", color: "#00e676", bg: "rgba(0, 230, 118, 0.14)" }
};

const PRIORITY_BADGES = {
  critical: { label: "Code 3 • Critique", color: "#ef4444", bg: "rgba(239, 68, 68, 0.16)" },
  high:     { label: "Code 2 • Haute", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" },
  medium:   { label: "Code 1 • Normale", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.14)" }
};

const STORAGE_CASES_KEY = "sa_lspd_investigations_v1";

export default function InvestigationsView({ meta, onSendSuspectToCalculator }) {
  const [cases, setCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CASES_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_CASES;
    } catch {
      return INITIAL_SAMPLE_CASES;
    }
  });

  const [activeCaseId, setActiveCaseId] = useState(() => cases[0]?.id || null);
  const [subView, setSubView] = useState("dossiers"); // "dossiers" | "templates"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);

  // New Case Modal / Form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    templateId: LSPD_TEMPLATES[0].id,
    caseNumber: `LSPD-DB-2026-${String(Math.floor(100 + Math.random() * 899))}`,
    title: "",
    division: "Detective Bureau (Crimes & Homicides)",
    status: "in_progress",
    priority: "high",
    targetName: "",
    targetGroup: "",
    location: "Los Santos"
  });

  // New Suspect / Evidence inline input
  const [newSuspectName, setNewSuspectName] = useState("");
  const [newSuspectStatus, setNewSuspectStatus] = useState("Recherché");
  const [newEvidenceLabel, setNewEvidenceLabel] = useState("");

  const saveCases = (next) => {
    setCases(next);
    try {
      localStorage.setItem(STORAGE_CASES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const activeCase = useMemo(() => {
    return cases.find(c => c.id === activeCaseId) || cases[0] || null;
  }, [cases, activeCaseId]);

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cases.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.targetName || "").toLowerCase().includes(q) ||
        (c.targetGroup || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q)
      );
    });
  }, [cases, searchQuery, statusFilter]);

  const handleCreateCase = (e) => {
    e.preventDefault();
    const tpl = LSPD_TEMPLATES.find(t => t.id === newForm.templateId) || LSPD_TEMPLATES[0];
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const titleVal = newForm.title.trim() || tpl.title;

    const generatedText = tpl.generateContent({
      caseNumber: newForm.caseNumber,
      title: titleVal,
      agent: meta?.agent || "16 | Vance Winchester",
      targetName: newForm.targetName,
      targetGroup: newForm.targetGroup,
      location: newForm.location,
      date: dateStr,
      heure: heureStr
    });

    const created = {
      id: `case_${Date.now()}`,
      caseNumber: newForm.caseNumber || `LSPD-DB-2026-${Math.floor(100 + Math.random() * 899)}`,
      title: titleVal,
      templateId: tpl.id,
      division: newForm.division,
      status: newForm.status,
      priority: newForm.priority,
      leadAgent: meta?.agent || "16 | Vance Winchester",
      targetName: newForm.targetName.trim() || "Contre X",
      targetGroup: newForm.targetGroup.trim() || "Indépendant",
      location: newForm.location.trim() || "Los Santos",
      createdAt: `${dateStr} ${heureStr}`,
      suspects: newForm.targetName.trim()
        ? [{ name: newForm.targetName.trim(), status: "Cible principale", role: "Suspect" }]
        : [],
      evidence: [],
      reportText: generatedText
    };

    const next = [created, ...cases];
    saveCases(next);
    setActiveCaseId(created.id);
    setShowNewModal(false);
    setSubView("dossiers");
    setNewForm({
      templateId: LSPD_TEMPLATES[0].id,
      caseNumber: `LSPD-DB-2026-${String(Math.floor(100 + Math.random() * 899))}`,
      title: "",
      division: "Detective Bureau (Crimes & Homicides)",
      status: "in_progress",
      priority: "high",
      targetName: "",
      targetGroup: "",
      location: "Los Santos"
    });
  };

  // Create directly from a Template Card in 1 click
  const handleUseTemplate = (tpl) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR");
    const heureStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const num = `LSPD-${tpl.category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;

    const generatedText = tpl.generateContent({
      caseNumber: num,
      title: tpl.title,
      agent: meta?.agent || "16 | Vance Winchester",
      targetName: meta?.prevenu || "Suspect / Cible",
      targetGroup: "",
      location: "Los Santos",
      date: dateStr,
      heure: heureStr
    });

    const created = {
      id: `case_${Date.now()}`,
      caseNumber: num,
      title: `${tpl.title} — ${meta?.prevenu || "Nouveau Dossier"}`,
      templateId: tpl.id,
      division: tpl.defaultDivision,
      status: "in_progress",
      priority: tpl.defaultPriority,
      leadAgent: meta?.agent || "16 | Vance Winchester",
      targetName: meta?.prevenu || "À compléter",
      targetGroup: "À compléter",
      location: "Los Santos",
      createdAt: `${dateStr} ${heureStr}`,
      suspects: meta?.prevenu
        ? [{ name: meta.prevenu, status: "Mis en cause", role: "Principal" }]
        : [],
      evidence: [],
      reportText: generatedText
    };

    const next = [created, ...cases];
    saveCases(next);
    setActiveCaseId(created.id);
    setSubView("dossiers");
  };

  const handleUpdateActiveCase = (field, value) => {
    if (!activeCase) return;
    const next = cases.map(c => (c.id === activeCase.id ? { ...c, [field]: value } : c));
    saveCases(next);
  };

  const handleApplyTemplateToActiveCase = (tplId) => {
    if (!activeCase) return;
    const tpl = LSPD_TEMPLATES.find(t => t.id === tplId);
    if (!tpl) return;
    const [d, h] = (activeCase.createdAt || "").split(" ");
    const regenerated = tpl.generateContent({
      caseNumber: activeCase.caseNumber,
      title: activeCase.title,
      agent: activeCase.leadAgent || meta?.agent,
      targetName: activeCase.targetName,
      targetGroup: activeCase.targetGroup,
      location: activeCase.location,
      date: d || new Date().toLocaleDateString("fr-FR"),
      heure: h || "02:21"
    });
    handleUpdateActiveCase("reportText", regenerated);
  };

  const handleAddSuspect = () => {
    if (!activeCase || !newSuspectName.trim()) return;
    const list = Array.isArray(activeCase.suspects) ? activeCase.suspects : [];
    handleUpdateActiveCase("suspects", [
      ...list,
      { name: newSuspectName.trim(), status: newSuspectStatus, role: "Suspect" }
    ]);
    setNewSuspectName("");
  };

  const handleRemoveSuspect = (idx) => {
    if (!activeCase) return;
    const list = (activeCase.suspects || []).filter((_, i) => i !== idx);
    handleUpdateActiveCase("suspects", list);
  };

  const handleAddEvidence = () => {
    if (!activeCase || !newEvidenceLabel.trim()) return;
    const list = Array.isArray(activeCase.evidence) ? activeCase.evidence : [];
    const code = `SC-${String(list.length + 1).padStart(2, "0")}`;
    handleUpdateActiveCase("evidence", [...list, { code, label: newEvidenceLabel.trim() }]);
    setNewEvidenceLabel("");
  };

  const handleRemoveEvidence = (idx) => {
    if (!activeCase) return;
    const list = (activeCase.evidence || []).filter((_, i) => i !== idx);
    handleUpdateActiveCase("evidence", list);
  };

  const handleDeleteCase = (id) => {
    const next = cases.filter(c => c.id !== id);
    saveCases(next);
    if (activeCaseId === id) {
      setActiveCaseId(next[0]?.id || null);
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TOP BAR: SWITCH BETWEEN DOSSIERS D'ENQUÊTE & BIBLIOTHÈQUE DE TEMPLATES LSPD */}
      <div className="card">
        <div
          className="card-header"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${subView === "dossiers" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("dossiers")}
            >
              <i className="fas fa-folder-open"></i> Dossiers d'Enquête LSPD ({cases.length})
            </button>
            <button
              type="button"
              className={`btn ${subView === "templates" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setSubView("templates")}
            >
              <i className="fas fa-file-signature"></i> Bibliothèque de Templates LSPD & DOJ ({LSPD_TEMPLATES.length})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowNewModal(true)}
            >
              <i className="fas fa-plus-circle"></i> Nouveau Dossier d'Enquête
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: BIBLIOTHÈQUE DES 8 TEMPLATES OFFICIELS LSPD / DOJ */}
      {subView === "templates" && (
        <div className="catalogue-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {LSPD_TEMPLATES.map(tpl => {
            const sampleText = tpl.generateContent({
              caseNumber: "LSPD-2026-001",
              title: tpl.title,
              agent: meta?.agent || "16 | Vance Winchester",
              targetName: meta?.prevenu || "Mike Armstrong",
              targetGroup: "",
              location: "Los Santos",
              date: meta?.date || "25/11/2026",
              heure: meta?.heure || "02:21"
            });
            return (
              <div key={tpl.id} className="weapon-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="weapon-card-top">
                  <div className="weapon-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={`fas fa-${tpl.icon}`} style={{ color: "var(--accent)" }}></i>
                    <span>{tpl.title}</span>
                  </div>
                  <span className={`cat-badge ${tpl.badgeClass}`}>{tpl.category}</span>
                </div>

                <p className="weapon-desc" style={{ marginBottom: 4 }}>
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
                    maxHeight: 150,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {sampleText}
                </pre>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => handleUseTemplate(tpl)}
                  >
                    <i className="fas fa-pen-to-square"></i> Ouvrir & Remplir ce Template
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleCopyText(tpl.id, sampleText)}
                    title="Copier directement le modèle vierge"
                  >
                    <i className={`fas fa-${copiedId === tpl.id ? "check" : "copy"}`}></i>
                    {copiedId === tpl.id ? "Copié" : "Copier"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: GESTIONNAIRE DES DOSSIERS D'ENQUÊTE + ÉDITEUR DE RAPPORT AVEC TEMPLATES */}
      {subView === "dossiers" && (
        <div style={{ display: "grid", gridTemplateColumns: "370px minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          {/* LEFT LIST OF INVESTIGATION DOSSIERS */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-folder-tree"></i> Registre des Dossiers ({filteredCases.length})
              </h2>
            </div>

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                className="input"
                placeholder="Rechercher N° dossier, suspect, gang, lieu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />

              <select
                className="select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tous les statuts ({cases.length})</option>
                {Object.entries(STATUS_BADGES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
                {filteredCases.map(c => {
                  const isSelected = activeCase?.id === c.id;
                  const st = STATUS_BADGES[c.status] || STATUS_BADGES.in_progress;
                  const pr = PRIORITY_BADGES[c.priority] || PRIORITY_BADGES.medium;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCaseId(c.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: isSelected ? "rgba(59, 130, 246, 0.16)" : "var(--bg-secondary)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                          {c.caseNumber}
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
                        {c.title}
                      </div>

                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                        <span>
                          <i className="fas fa-user-tag" style={{ marginRight: 5, color: "var(--accent)" }}></i>
                          {c.targetName}
                        </span>
                        <span style={{ color: pr.color, fontWeight: 700 }}>{pr.label}</span>
                      </div>

                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>{c.division}</span>
                        <span>{c.createdAt}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredCases.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                    Aucun dossier d'enquête trouvé.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT ACTIVE CASE WORKSPACE & EDITABLE TEMPLATE REPORT */}
          {activeCase ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* DOSSIER METADATA & STATUS CONTROLS */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2>
                    <i className="fas fa-shield-halved"></i> Dossier {activeCase.caseNumber} — {activeCase.title}
                  </h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => onSendSuspectToCalculator(activeCase.targetName)}
                      title="Envoyer ce suspect dans le Calculateur de Peine"
                    >
                      <i className="fas fa-calculator"></i> Calculer la peine de {activeCase.targetName}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteCase(activeCase.id)}
                    >
                      <i className="fas fa-trash"></i> Supprimer
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>N° de Dossier LSPD</label>
                      <input
                        type="text"
                        value={activeCase.caseNumber}
                        onChange={e => handleUpdateActiveCase("caseNumber", e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Intitulé de l'Affaire / Opération</label>
                      <input
                        type="text"
                        value={activeCase.title}
                        onChange={e => handleUpdateActiveCase("title", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Statut du Dossier</label>
                      <select
                        value={activeCase.status}
                        onChange={e => handleUpdateActiveCase("status", e.target.value)}
                      >
                        {Object.entries(STATUS_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Suspect / Cible Principale</label>
                      <input
                        type="text"
                        value={activeCase.targetName}
                        onChange={e => handleUpdateActiveCase("targetName", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Groupe / Gang / Organisation</label>
                      <input
                        type="text"
                        value={activeCase.targetGroup}
                        onChange={e => handleUpdateActiveCase("targetGroup", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Lieu / Secteur</label>
                      <input
                        type="text"
                        value={activeCase.location}
                        onChange={e => handleUpdateActiveCase("location", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Priorité</label>
                      <select
                        value={activeCase.priority}
                        onChange={e => handleUpdateActiveCase("priority", e.target.value)}
                      >
                        {Object.entries(PRIORITY_BADGES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SUSPECTS & PREUVES / SCELLÉS */}
                  <div className="form-row" style={{ marginTop: 4 }}>
                    {/* Suspects box */}
                    <div className="add-article-section" style={{ flex: 1, marginBottom: 0 }}>
                      <div className="add-article-title">
                        <i className="fas fa-users-viewfinder"></i> Personnes d'intérêt & Suspects ({(activeCase.suspects || []).length})
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          placeholder="Nom RP du suspect..."
                          value={newSuspectName}
                          onChange={e => setNewSuspectName(e.target.value)}
                        />
                        <select
                          className="select"
                          style={{ width: 135, padding: "6px 8px", fontSize: 13 }}
                          value={newSuspectStatus}
                          onChange={e => setNewSuspectStatus(e.target.value)}
                        >
                          <option value="Recherché">Recherché</option>
                          <option value="Sous surveillance">Surveillance</option>
                          <option value="En garde à vue">Garde à vue</option>
                          <option value="Condamné">Condamné</option>
                        </select>
                        <button type="button" className="btn btn-sm btn-primary" onClick={handleAddSuspect}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(activeCase.suspects || []).map((s, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                              fontSize: 13
                            }}
                          >
                            <div>
                              <strong>{s.name}</strong>
                              <span className="brand-badge" style={{ marginLeft: 8 }}>{s.status}</span>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                style={{ padding: "2px 7px", fontSize: 11 }}
                                onClick={() => onSendSuspectToCalculator(s.name)}
                                title="Calculer sa peine"
                              >
                                <i className="fas fa-gavel"></i> Peine
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                style={{ padding: "2px 7px", fontSize: 11 }}
                                onClick={() => handleRemoveSuspect(idx)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evidence / Scellés box */}
                    <div className="add-article-section" style={{ flex: 1, marginBottom: 0 }}>
                      <div className="add-article-title">
                        <i className="fas fa-boxes-stacked"></i> Preuves & Scellés rattachés ({(activeCase.evidence || []).length})
                      </div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          placeholder="Ajouter une preuve, arme saisie, photo, témoignage..."
                          value={newEvidenceLabel}
                          onChange={e => setNewEvidenceLabel(e.target.value)}
                        />
                        <button type="button" className="btn btn-sm btn-primary" onClick={handleAddEvidence}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(activeCase.evidence || []).map((ev, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: 6,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                              fontSize: 13
                            }}
                          >
                            <div>
                              <span className="mono" style={{ color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>
                                [{ev.code}]
                              </span>
                              <span>{ev.label}</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              style={{ padding: "2px 7px", fontSize: 11 }}
                              onClick={() => handleRemoveEvidence(idx)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EDITABLE TEMPLATE REPORT FOR THIS DOSSIER */}
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <h2>
                    <i className="fas fa-file-contract"></i> Rapport & Template du Dossier (100% Modifiable & Copiable)
                  </h2>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <select
                      className="select"
                      style={{ width: 260, padding: "5px 10px", fontSize: 13 }}
                      value={activeCase.templateId || ""}
                      onChange={e => {
                        handleUpdateActiveCase("templateId", e.target.value);
                        handleApplyTemplateToActiveCase(e.target.value);
                      }}
                    >
                      {LSPD_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>
                          Charger Template : {t.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleApplyTemplateToActiveCase(activeCase.templateId || LSPD_TEMPLATES[0].id)}
                      title="Actualiser le template avec les champs ci-dessus"
                    >
                      <i className="fas fa-arrows-rotate"></i> Actualiser Template
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCopyText("active_case_report", activeCase.reportText)}
                    >
                      <i className={`fas fa-${copiedId === "active_case_report" ? "check" : "copy"}`}></i>
                      {copiedId === "active_case_report" ? "Rapport copié !" : "Copier le Rapport"}
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
                    value={activeCase.reportText}
                    onChange={e => handleUpdateActiveCase("reportText", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* MODAL DE CRÉATION D'UN NOUVEAU DOSSIER D'ENQUÊTE AVEC CHOIX DU TEMPLATE */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div className="card" style={{ maxWidth: 640, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <i className="fas fa-folder-plus"></i> Ouvrir un Nouveau Dossier d'Enquête LSPD
              </h2>
              <button className="btn btn-sm btn-outline" onClick={() => setShowNewModal(false)}>
                Fermer
              </button>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateCase}>
                <div className="form-group">
                  <label>Template Officiel LSPD / DOJ à utiliser</label>
                  <select
                    value={newForm.templateId}
                    onChange={e => {
                      const tpl = LSPD_TEMPLATES.find(t => t.id === e.target.value);
                      setNewForm(p => ({
                        ...p,
                        templateId: e.target.value,
                        division: tpl ? tpl.defaultDivision : p.division,
                        priority: tpl ? tpl.defaultPriority : p.priority
                      }));
                    }}
                  >
                    {LSPD_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.category}] {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° de Dossier</label>
                    <input
                      type="text"
                      value={newForm.caseNumber}
                      onChange={e => setNewForm(p => ({ ...p, caseNumber: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.8 }}>
                    <label>Intitulé de l'Enquête / Opération</label>
                    <input
                      type="text"
                      placeholder="Ex: Braquage Fleeca Hawick / Trafic Docks..."
                      value={newForm.title}
                      onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Suspect / Cible (RP)</label>
                    <input
                      type="text"
                      placeholder="Ex: Mike Armstrong ou Contre X"
                      value={newForm.targetName}
                      onChange={e => setNewForm(p => ({ ...p, targetName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Organisation / Gang</label>
                    <input
                      type="text"
                      placeholder="Ex: Indépendant / Gang..."
                      value={newForm.targetGroup}
                      onChange={e => setNewForm(p => ({ ...p, targetGroup: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Lieu / Secteur</label>
                    <input
                      type="text"
                      placeholder="Ex: Los Santos / Strawberry Ave"
                      value={newForm.location}
                      onChange={e => setNewForm(p => ({ ...p, location: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Division LSPD</label>
                    <input
                      type="text"
                      value={newForm.division}
                      onChange={e => setNewForm(p => ({ ...p, division: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowNewModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-check"></i> Créer & Générer le Dossier
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
