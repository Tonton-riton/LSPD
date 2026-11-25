// Bibliothèque complète des 16 Templates Officiels LSPD & DOJ (San Andreas)
// Inclut les templates de terrain : Braquages (Supérette/ATM, Fleeca, Bijouterie, Fourgon, Pacific Bank),
// Course-poursuite, Fusillade (10-71), Stupéfiants, Kidnapping / Prise d'otage, Contrôle Routier, Fin de service,
// ainsi que les templates Detective Bureau & DOJ (Enquête, Interrogatoire, Mandats, BOLO, Plainte, Scellés, GND).

export const LSPD_TEMPLATE_GROUPS = [
  { id: "ALL", label: "Tous les templates" },
  { id: "braquage", label: "Braquages (Art. 403)" },
  { id: "intervention", label: "Interventions Terrain" },
  { id: "enquete", label: "Detective Bureau & GND" },
  { id: "doj", label: "Mandats, Auditions & DOJ" }
];

export const LSPD_TEMPLATES = [
  // =========================================================================
  // 1. BRAQUAGES (ART. 403 & CIRCONSTANCES AGGRAVANTES DU SHEET)
  // =========================================================================
  {
    id: "tpl_braquage_superette",
    group: "braquage",
    title: "Rapport de Braquage — Supérette / Distributeur (ATM)",
    category: "Braquage Supérette",
    icon: "store",
    badgeClass: "cat-delit-majeur",
    description: "Template officiel LSPD pour braquage de supérette (24/7, LTD, Rob's Liquor) ou d'ATM : négociateur, otage, revendications, fuite et interpellation.",
    defaultPriority: "high",
    defaultDivision: "Patrouille / Intervention LSPD",
    presetOffenses: [
      { infractionId: "ART403", aggKeyword: "supérette" },
      { infractionId: "ART301", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT DE BRAQUAGE (SUPÉRETTE)
     CODE 10-90 • DOSSIER N° : ${caseNumber || "LSPD-BRQ-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. INFORMATIONS SUR L'ALERTE (10-90)]
• Date & Heure de l'alarme     : ${date} à ${heure}
• Établissement visé           : ${location || "Supérette 24/7 / LTD Gasoline / ATM — Los Santos"}
• Type de braquage (Art. 403)  : [X] Supérette (+200 $ / +5m)   [ ] Distributeur ATM (+100 $ / +2m)
• Commandement de scène        : ${agent || "16 | Vance Winchester"}
• Négociateur désigné          : ${agent || "À préciser"}
• Unités LSPD engagées         : [Ex: Lincoln-16, Adam-12, Adam-04]

[2. OTAGE(S) & NÉGOCIATIONS]
• Nombre d'otage(s) présent(s) : [Ex: 1 civil / Gérant du magasin / Aucun otage]
• Identité de l'otage          : [Nom & Prénom + État physique / Prise en charge EMS]
• Revendications des braqueurs : [Ex: Passage libre, pas de herses, pas de tir à vue]
• Issue des négociations       : [Otage libéré sain et sauf avant le départ du véhicule]

[3. SUSPECT(S), ARMEMENT & VÉHICULE DE FUITE]
• Suspect(s) interpellé(s)     : ${targetName || "Nom du / des suspect(s)"} ${targetGroup ? `(${targetGroup})` : ""}
• Nombre de braqueurs estimé   : [Ex: 2 individus masqués]
• Armement observé / saisi     : [Ex: Pistolet 9mm Cat. B1 / Arme blanche Cat. D]
• Véhicule de fuite            : [Modèle, Couleur, Plaque d'immatriculation]

[4. DÉROULEMENT DE LA POURSUITE & INTERPELLATION]
À ${heure}, suite au déclenchement de l'alarme 10-90 sur ${location || "la supérette"}, les unités LSPD ont établi un périmètre de sécurité et ouvert les négociations. Après la libération de l'otage, les suspects ont pris la fuite à bord du véhicule susmentionné.
• Itinéraire & Fin de poursuite: [Décrire l'accident, l'immobilisation, la manœuvre PIT ou la fuite à pied]
• Butin / Objets saisis        : [Montant en liquide / Sacs d'argent / Armes / Masques saisis]
• Droits Miranda & Mise en cellule : Droits lus et compris, fouille complète effectuée au poste.
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Certifié exact par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  {
    id: "tpl_braquage_banque_fleeca",
    group: "braquage",
    title: "Rapport de Grand Braquage — Banque Fleeca / Bijouterie",
    category: "Fleeca / Bijouterie",
    icon: "building-columns",
    badgeClass: "cat-crime",
    description: "Template tactique complet pour braquage de Banque Fleeca (+2 850 $ / +10m) ou Bijouterie Vangelico (+4 850 $ / +20m) : périmètre, otages, SWAT et saisies.",
    defaultPriority: "critical",
    defaultDivision: "Major Crimes / SWAT / LSPD",
    presetOffenses: [
      { infractionId: "ART403", aggKeyword: "fleeca" },
      { infractionId: "ART207", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD — RAPPORT DE GRAND BRAQUAGE (FLEECA / BIJOUTERIE)
     ALERTE MAJEURE 10-90 • DOSSIER N° : ${caseNumber || "LSPD-FLC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. DISPOSITIF & COMMANDEMENT DE SCÈNE]
• Date & Heure d'alerte        : ${date} à ${heure}
• Cible du braquage (Art. 403) : [X] Banque Fleeca (+2 850 $ / +10m)   [ ] Bijouterie Vangelico (+4 850 $ / +20m)
• Localisation précise         : ${location || "Banque Fleeca Hawick / Bijouterie Rockford Hills"}
• Directeur des opérations (CS): ${agent || "16 | Vance Winchester"}
• Négociateur LSPD             : [Matricule & Nom]
• Effectifs & Unités déployées : [Unités Patrouille, Interceptor, Air-One, SWAT]

[2. SITUATION DES OTAGES & PROTOCOLE DE NÉGOCIATION]
• Nombre total d'otages        : [Ex: 2 civils]
• Identité & Bilan médical EMS : [Noms des otages — Examen EMS effectué : RAS / Blessures]
• Conditions négociées         : [Ex: Libre passage contre otages, pas de barrage bloquant]
• Respect de l'accord          : [Respecté / Rompu par les braqueurs (préciser)]

[3. IDENTIFICATION DES BRAQUEURS & MOYENS UTILISÉS]
• Suspect(s) identifié(s)      : ${targetName || "Liste des suspects interpellés"}
• Organisation / Gang suspecté : ${targetGroup || "Non confirmé"}
• Équipement & Armes constatées: [Ex: Armes Cat. B / Cat. A, perceuses thermiques, tenues tactiques, masques]
• Véhicule(s) impliqué(s)      : [Modèle(s), couleur(s), plaques, véhicules relais éventuels]

[4. CHRONOLOGIE DE L'INTERVENTION, POURSUITE & SAISIES]
• Phase 1 (Bouclage & Négociation) : Périmètre établi à ${heure}, sécurisation des axes routiers et prise de contact visuelle/vocale.
• Phase 2 (Départ & Poursuite)     : [Décrire la fuite, changement de véhicule éventuel, soutien Air-One, usage de la force / tirs éventuels]
• Phase 3 (Interpellation & Scellés):
  - Butin récupéré (Bijoux / Billets / Sacs) : [À préciser]
  - Armes & Munitions placées sous scellés   : [À préciser]
  - Blessés (Civils / LSPD / Suspects)       : [Aucun / Préciser bilan EMS]

[5. SUIVI JUDICIAIRE (DOJ — DÉLIT MAJEUR / CRIME)]
• Procureur & Juge contactés   : [Oui — Comparution immédiate / Procès + Bracelet électronique]
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  {
    id: "tpl_braquage_pacific_fourgon",
    group: "braquage",
    title: "Rapport de Braquage Majeur — Pacific Bank / Fourgon Blindé",
    category: "Pacific / Fourgon",
    icon: "vault",
    badgeClass: "cat-crime",
    description: "Rapport d'opération haute intensité pour la Pacific Standard Bank (+29 850 $ / +20m) ou l'attaque d'un Fourgon Blindé (+4 000 $ / +15m).",
    defaultPriority: "critical",
    defaultDivision: "SWAT / Command Staff / DOJ",
    presetOffenses: [
      { infractionId: "ART403", aggKeyword: "pacific" },
      { infractionId: "ART309", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD & DOJ — OPÉRATION HAUTE INTENSITÉ (PACIFIC / FOURGON)
     CODE ROUGE / 10-90 • DOSSIER N° : ${caseNumber || "LSPD-PAC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. SYNTHÈSE DE L'OPÉRATION]
• Date & Heure d'engagement    : ${date} à ${heure}
• Nature (Art. 403 Cir. Agg.)  : [X] Pacific Standard Bank (+29 850 $ / +20m)   [ ] Fourgon Blindé Gruppe 6 (+4 000 $ / +15m)
• Localisation                 : ${location || "Vinewood Blvd — Pacific Standard Bank"}
• Commandement d'opération     : ${agent || "16 | Vance Winchester"}
• Forces engagées              : LSPD, SWAT, Air-One, Unités Interceptor, EMS en attente périmètre

[2. FORCE ENNEMIE, OTAGES & ARMEMENT LOURD]
• Nombre d'assaillants         : [Ex: 4 à 6 individus lourdement armés]
• Suspects capturés / identifiés: ${targetName || "À compléter"} ${targetGroup ? `(Organisation : ${targetGroup})` : ""}
• Armes de guerre observées    : [Cat. A1 / A2 / Explosifs C4 / Thermite]
• Otages & Civils sécurisés    : [Nombre, identités, prise en charge EMS]

[3. RAPPORT TACTIQUE & USAGE DE LA FORCE LÉTALE]
• Déroulement de l'assaut / fuite :
  [Décrire les négociations, l'usage éventuel d'explosifs, les échanges de tirs (Art. 309), les manœuvres tactiques SWAT et l'arrestation]
• Bilan humain (LSPD / Civils / Suspects) : [Blessures graves / Décès éventuels]

[4. BILAN DES SAISIES & PRÉJUDICE BANCAIRE]
• Fonds récupérés / Fonds en fuite : [Montant saisi / Montant dérobé]
• Armes & Équipements saisis       : [Inventaire complet pour scellés]
• Véhicules saisis / Fourrière     : [Modèles & plaques]

[5. TRANSMISSION IMMÉDIATE AU BUREAU DU PROCUREUR & JUGE FÉDÉRAL]
Dossier classé PRIORITÉ CRITIQUE — Mise sous bracelet électronique / Détention provisoire en attente de procès.
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Certifié conforme par : ${agent || "16 | Vance Winchester"} — LSPD Command Staff.`
  },

  {
    id: "tpl_cambriolage_effraction",
    group: "braquage",
    title: "Rapport de Cambriolage / Effraction & Vol (Art. 408 / 401)",
    category: "Cambriolage",
    icon: "house-crack",
    badgeClass: "cat-delit-mineur",
    description: "Compte-rendu d'intervention sur cambriolage d'habitation, effraction avec dégradations ou vol en réunion.",
    defaultPriority: "medium",
    defaultDivision: "Patrouille LSPD",
    presetOffenses: [
      { infractionId: "ART408", aggKeyword: "vol" },
      { infractionId: "ART401", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT DE CAMBRIOLAGE
     DOSSIER N° : ${caseNumber || "LSPD-CMB-2026-001"} (ART. 408 / 401)
╚══════════════════════════════════════════════════════════════════╝

[1. INTERVENTION]
• Date & Heure                 : ${date} à ${heure}
• Adresse / Quartier visé      : ${location || "Quartier résidentiel — Los Santos"}
• Agent(s) intervenant(s)      : ${agent || "16 | Vance Winchester"}
• Propriétaire / Victime       : [Nom du propriétaire ou alarme résidentielle]

[2. CONSTATATIONS SUR PLACE & EFFRACTION]
• Point d'entrée forcé         : [Porte d'entrée / Fenêtre / Garage — Outils d'effraction trouvés]
• Dégradations constatées      : [Serrure fracturée, vitre brisée, mobilier fouillé]
• Biens dérobés / retrouvés    : [Bijoux, électronique, espèces, objets de valeur]

[3. INTERPELLATION DU / DES SUSPECT(S)]
• Individu(s) interpellé(s)    : ${targetName || "Nom du suspect"}
• Circonstances                : [Interpellé en flagrant délit sur place / Lors de la fuite avec les biens volés]
• Objets saisis (Restitution)  : [Liste des biens restitués ou mis sous scellés]
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  // =========================================================================
  // 2. INTERVENTIONS TERRAIN (POURSUITE, FUSILLADE, DEAL, OTAGE, ROUTE, PATROUILLE)
  // =========================================================================
  {
    id: "tpl_course_poursuite",
    group: "intervention",
    title: "Rapport de Course-Poursuite & Refus d'Obtempérer (Art. 301 / 302)",
    category: "Poursuite 10-80",
    icon: "car-burst",
    badgeClass: "cat-delit-mineur",
    description: "Rapport complet de poursuite motorisée (10-80) : motif du contrôle, plaque, manœuvres PIT/herses, infractions routières et interpellation.",
    defaultPriority: "high",
    defaultDivision: "Traffic & Patrol Division",
    presetOffenses: [
      { infractionId: "ART301", aggKeyword: "danger" },
      { infractionId: "CIRC_CONDUITE_DANGEREUSE", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT DE POURSUITE (10-80)
     DOSSIER N° : ${caseNumber || "LSPD-1080-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. DÉCLENCHEMENT DE LA POURSUITE]
• Date & Heure                 : ${date} à ${heure}
• Lieu de départ               : ${location || "Los Santos"}
• Motif initial du contrôle    : [Ex: Excès de vitesse >51 km/h, conduite dangereuse, véhicule signalé volé]
• Unité Primaire               : ${agent || "16 | Vance Winchester"}
• Unités en renfort            : [Secondaire, Interceptor, Air-One]

[2. VÉHICULE & CONDUCTEUR]
• Conducteur interpellé        : ${targetName || "Nom du conducteur"}
• Permis de conduire           : [Valide / Retiré 48h / Conduite sans permis]
• Véhicule poursuivi           : [Modèle, Couleur, Plaque d'immatriculation, État final]
• Passager(s) éventuel(s)      : [Aucun / Nom(s) des passagers]

[3. DÉROULEMENT & MANŒUVRES TACTIQUES]
• Infractions constatées en fuite : [Contre-sens, franchissement feux rouges, mise en danger de piétons, dégradation domaine public]
• Manœuvres autorisées         : [ ] Manœuvre PIT   [ ] Herses (Spike Strips)   [ ] Barrage routier   [ ] Accident autonome
• Fin de poursuite & Arrestation : [Lieu d'immobilisation, mise en fourrière du véhicule, fouille véhicule & conducteur]
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  {
    id: "tpl_fusillade_tirs",
    group: "intervention",
    title: "Rapport de Fusillade / Échange de Tirs (10-71 / Art. 309)",
    category: "Fusillade 10-71",
    icon: "crosshairs",
    badgeClass: "cat-crime",
    description: "Compte-rendu d'intervention sur fusillade (10-71) et déclaration d'usage de l'arme de service par les agents LSPD.",
    defaultPriority: "critical",
    defaultDivision: "Patrouille / Detective Bureau",
    presetOffenses: [
      { infractionId: "ART309", aggKeyword: "public" },
      { infractionId: "ART701_3_2", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT DE FUSILLADE (10-71)
     USAGE DE LA FORCE & TIRS • DOSSIER N° : ${caseNumber || "LSPD-1071-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. ALERTE COUPS DE FEU (10-71 / CODE 99)]
• Date & Heure des tirs        : ${date} à ${heure}
• Secteur / Lieu de la scène   : ${location || "Los Santos"}
• Agent rédacteur              : ${agent || "16 | Vance Winchester"}
• Unités LSPD & EMS sur scène  : [Lister les unités présentes et ambulances EMS]

[2. PARTIES IMPLIQUÉES & BILAN MÉDICAL]
• Tireur(s) / Suspect(s)       : ${targetName || "Suspect(s) interpellé(s)"} ${targetGroup ? `(Affiliation : ${targetGroup})` : ""}
• Bilan des blessés / victimes :
  - Civils   : [Aucun / Nombre & Gravité]
  - Agents   : [Aucun / Matricules & Gravité]
  - Suspects : [Neutralisé / Blessé pris en charge EMS / Indemne]

[3. DÉCLARATION D'USAGE DE LA FORCE (ARME DE SERVICE)]
• Usage de l'arme LSPD         : [ ] Non   [X] Oui — Légitime défense proportionnée face à une menace létale immédiate
• Arme de service utilisée     : [Ex: Glock 19 / Carabine M4A1]
• Sommations préalables        : [Effectuées / Impossibles du fait de tirs immédiats]

[4. RELEVÉS BALISTIQUES & SCELLÉS]
• Armes récupérées sur scène   : [Modèles, catégories Cat. A/B/C, numéros de série]
• Douilles & Impact de balles  : [Calibres relevés : 9mm / 5.56mm / Calibre 12]
• Photographies de scène       : [Prises et jointes au dossier MDT]
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_stupefiants_deal",
    group: "intervention",
    title: "Rapport Stupéfiants — Point de Deal / Trafic (Art. 802 & 803)",
    category: "Stupéfiants",
    icon: "cannabis",
    badgeClass: "cat-delit-majeur",
    description: "Rapport d'interpellation pour revente (Art. 802 — 25 $/pochon), possession illicite (Art. 803 — 50 $/pochon) ou trafic organisé.",
    defaultPriority: "high",
    defaultDivision: "Gang & Narcotics Division (GND)",
    presetOffenses: [
      { infractionId: "ART803", aggKeyword: null },
      { infractionId: "ART802_REVENTE", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD — RAPPORT STUPÉFIANTS & LUTTE ANTI-DROGUE (ART. 802/803)
     DOSSIER N° : ${caseNumber || "LSPD-NARC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. CONTEXTE DE L'INTERPELLATION]
• Date & Heure                 : ${date} à ${heure}
• Zone / Point de deal observé : ${location || "Los Santos"}
• Qualification retenue        : [ ] Possession (Art. 803)  [X] Revente (Art. 802)  [ ] Trafic — Instigateur (Art. 802)
• Agent(s) intervenant(s)      : ${agent || "16 | Vance Winchester"}

[2. INDIVIDU INTERPELLÉ & OBSERVATIONS]
• Identité du mis en cause     : ${targetName || "Nom du suspect"} ${targetGroup ? `(${targetGroup})` : ""}
• Faits constatés (Flagrant délit) : [Observation de transactions main à main, guetteurs, prise de fuite à vue des agents]
• Circonstances aggravantes    : [ ] Lieu public sensible  [ ] Proximité mineurs/école  [ ] Quantité > seuil légal  [ ] Récidive  [ ] Réseau organisé

[3. INVENTAIRE DES STUPÉFIANTS & ARGENT SALE SAISIS]
• Substance(s) saisie(s)       : [Ex: Cannabis / Cocaïne / Méthamphétamine]
• Quantité exacte (Pochons)    : [Nombre exact de pochons saisis pour calcul par pochon]
• Argent liquide / Sale saisi  : [Montant exact saisi]
• Armes / Téléphones saisis    : [À préciser]
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — LSPD / GND.`
  },

  {
    id: "tpl_kidnapping_otage",
    group: "intervention",
    title: "Rapport de Kidnapping / Séquestration / Prise d'Otage (Art. 207 / 208)",
    category: "Kidnapping",
    icon: "handcuffs",
    badgeClass: "cat-crime",
    description: "Rapport criminel pour enlèvement, séquestration ou prise d'otage avec demande de rançon ou menace armée.",
    defaultPriority: "critical",
    defaultDivision: "Detective Bureau / Major Crimes",
    presetOffenses: [
      { infractionId: "ART208", aggKeyword: null },
      { infractionId: "ART207", aggKeyword: "armé" }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, targetGroup, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD — RAPPORT CRIMINEL : KIDNAPPING / SÉQUESTRATION (207/208)
     DOSSIER N° : ${caseNumber || "LSPD-KID-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. ALERTE & VICTIME(S)]
• Date & Heure                 : ${date} à ${heure}
• Lieu d'enlèvement / rétention: ${location || "Los Santos / Blaine County"}
• Identité de la victime       : [Nom & Prénom de la victime — Qualité : Civil / Agent public / Élu]
• État de la victime (EMS)     : [Saine et sauve / Traumatisme / Blessures graves]

[2. RAVISSEUR(S) & REVENDICATIONS]
• Auteur(s) interpellé(s)      : ${targetName || "Nom du / des ravisseur(s)"} ${targetGroup ? `(${targetGroup})` : ""}
• Demande de rançon / avantage : [Oui (Montant/Objet) / Non]
• Armes & Véhicule utilisés    : [À préciser]

[3. LIBÉRATION & SUIVI JUDICIAIRE (CRIME — PROCÈS OBLIGATOIRE)]
• Conditions de libération     : [Négociation réussie / Intervention tactique LSPD-SWAT]
• Mesure immédiate             : Pose de bracelet électronique & Convocation devant le Juge (Procès criminel obligatoire).
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_controle_routier_fourriere",
    group: "intervention",
    title: "Rapport de Contrôle Routier, Retrait Permis & Fourrière",
    category: "Code Route",
    icon: "traffic-light",
    badgeClass: "cat-contravention",
    description: "Compte-rendu d'infraction routière grave (Ivresse, Sans permis, Excès 51+ km/h, Sabot/Fourrière, Saisie véhicule).",
    defaultPriority: "medium",
    defaultDivision: "Traffic Division LSPD",
    presetOffenses: [
      { infractionId: "CIRC_VITESSE_51_PLUS", aggKeyword: null }
    ],
    generateContent: ({ caseNumber, title, agent, targetName, location, date, heure, extraChargesBlock }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LSPD TRAFFIC DIVISION — PROCÈS-VERBAL ROUTIER & FOURRIÈRE
     DOSSIER N° : ${caseNumber || "LSPD-TR-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. CONTRÔLE ROUTIER]
• Date & Heure                 : ${date} à ${heure}
• Axe routier / Lieu           : ${location || "Autoroute / Centre-ville Los Santos"}
• Agent verbalisateur          : ${agent || "16 | Vance Winchester"}

[2. CONDUCTEUR & VÉHICULE]
• Identité du conducteur       : ${targetName || "Nom du conducteur"}
• Véhicule (Modèle / Couleur)  : [À compléter]
• Plaque d'immatriculation     : [À compléter]

[3. INFRACTIONS RELEVÉES & MESURES ADMINISTRATIVES]
• Vitesse / Taux d'alcoolémie  : [Ex: 195 km/h en zone 90 / Test éthylotest positif]
• Mesure sur le permis         : [ ] Aucune  [ ] Retrait permis 48h (51+ km/h)  [ ] Retrait permis (Ivresse)  [ ] Interdiction 48h (Sans permis)
• Mesure sur le véhicule       : [ ] Restitué  [ ] Mise en fourrière  [ ] Pose de sabot  [ ] Saisie définitive (Véhicule non réglementaire)
${extraChargesBlock ? "\n" + extraChargesBlock : ""}
Signé : ${agent || "16 | Vance Winchester"} — LSPD Traffic Division.`
  },

  {
    id: "tpl_rapport_patrouille",
    group: "intervention",
    title: "Rapport de Patrouille & Fin de Service LSPD",
    category: "Fin de Service",
    icon: "car-side",
    badgeClass: "cat-delit-mineur",
    description: "Débriefing de fin de service d'une patrouille LSPD (heures, indicatif, coéquipier, interventions majeures et état du véhicule).",
    defaultPriority: "medium",
    defaultDivision: "Patrouille LSPD",
    generateContent: ({ caseNumber, title, agent, location, date, heure }) =>
`╔══════════════════════════════════════════════════════════════════╗
     LOS SANTOS POLICE DEPARTMENT — RAPPORT DE FIN DE SERVICE
     FEUILLE DE PATROUILLE N° : ${caseNumber || "LSPD-PAT-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. SERVICE & PATROUILLE]
• Date                         : ${date}
• Prise / Fin de service       : __:__ → ${heure}
• Agent rédacteur              : ${agent || "16 | Vance Winchester"}
• Indicatif radio & Coéquipier : [Ex: Adam-16 — Coéquipier : Matricule & Nom]
• Secteur patrouillé           : ${location || "Los Santos Centre / Sud / Nord"}

[2. SYNTHÈSE DES INTERVENTIONS DE LA PATROUILLE]
• Nombre de contrôles routiers : [0]
• Nombre d'arrestations        : [0]
• Braquages / 10-90 traités    : [Ex: 1 supérette, 0 banque]
• Faits notables / Incidents   :
  - [Heure] : [Résumé rapide de l'intervention n°1]
  - [Heure] : [Résumé rapide de l'intervention n°2]

[3. ÉTAT DU MATÉRIEL & VÉHICULE DE SERVICE]
• Véhicule de patrouille       : [Réparé, plein effectué et rangé au garage du commissariat]
• Armement & Équipement        : [Complet et restitué en armurerie]

Fin de service — Code 7. Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  // =========================================================================
  // 3. DETECTIVE BUREAU & GND
  // =========================================================================
  {
    id: "tpl_enquete_criminelle",
    group: "enquete",
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
- Nature des infractions suspectées : [Trafic d'armes / Homicide / Braquage / Blanchiment...]
- Contexte initial :
  1. [Élément factuel n°1]
  2. [Élément factuel n°2]

[4. ÉLÉMENTS DE PREUVE & SCELLÉS RÉUNIS]
• Scellé #01 (Matériel / Armes) : [Ex: Douilles 9mm relevées sur place / Arme saisie]
• Scellé #02 (Numérique / Photo): [Ex: Photographies de surveillance / Relevés téléphoniques]
• Scellé #03 (Témoignages)      : [Ex: Déposition du témoin / Procès-verbal d'audition]

[5. CHRONOLOGIE DES INVESTIGATIONS]
• [${date} - ${heure}] : Ouverture officielle du dossier d'enquête et consignation des premiers scellés.
• [À compléter]       : Surveillance / Audition / Demande de mandat.

[6. RÉQUISITIONS AU DEPARTMENT OF JUSTICE (DOJ)]
• Mesure sollicitée            : [ ] Mandat de perquisition  [ ] Mandat d'arrêt  [ ] Mise sur écoute  [ ] Renvoi en procès

Signé : ${agent || "16 | Vance Winchester"} — Detective Bureau, LSPD.`
  },

  {
    id: "tpl_surveillance_gang",
    group: "enquete",
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
  - [Transactions de stupéfiants (Art. 802), port d'armes lourdes, rassemblement armé...]
• Photographies / Preuves jointes : [Oui / Références photos]

Signé : ${agent || "16 | Vance Winchester"} — Gang & Narcotics Division, LSPD.`
  },

  // =========================================================================
  // 4. MANDATS, AUDITIONS, PLAINTES & SCELLÉS (DOJ)
  // =========================================================================
  {
    id: "tpl_interrogatoire",
    group: "doj",
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
• Magistrat présent            : Procureur / Aucun

[2. IDENTITÉ DE LA PERSONNE ENTENDUE]
• Nom & Prénom                 : ${targetName || "Nom du suspect / témoin"}
• Statut durant l'audition     : [X] Suspect en rétention judiciaire  [ ] Témoin  [ ] Victime
• Notification Droits Miranda  : Notifiés et compris avant le début des questions
• Assistance d'un Avocat       : [ ] Non  [ ] Oui (M° ________________)

[3. RETRANSCRIPTION DE L'INTERROGATOIRE (QUESTIONS / RÉPONSES)]
• Question LSPD : Pouvez-vous décliner votre identité et expliquer votre implication dans les faits ?
  ↳ Réponse de ${targetName || "l'individu"} : « [Retranscrire la déclaration] »

• Question LSPD : [Question n°2 sur les faits / complices / matériel saisi]
  ↳ Réponse de ${targetName || "l'individu"} : « [Retranscrire la déclaration] »

[4. CONCLUSION & PLAIDOYER]
• Comportement observé         : [Calme / Coopératif / Évasif / Garde le silence]
• Plaidoyer (si Délit Majeur)  : [ ] Coupable (Comparution immédiate)  [ ] Non Coupable

Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_mandat_perquisition",
    group: "doj",
    title: "Demande de Mandat de Perquisition (Art. 151-160)",
    category: "Mandat Perquisition",
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

À L'ATTENTION DE : Bureau du Procureur de San Andreas & Cour de Justice (Juge)

[1. AGENT REQUÉRANT]
• Nom, Grade & Matricule       : ${agent || "16 | Vance Winchester"}
• Date & Heure de la requête   : ${date} à ${heure}

[2. PERSONNE & LIEUX VISÉS (ART. 154)]
• Propriétaire / Occupant visé : ${targetName || "Nom du suspect"} ${targetGroup ? `(Affiliation : ${targetGroup})` : ""}
• Désignation précise des lieux: ${location || "Adresse exacte du domicile / entrepôt / plaque véhicule"}
• Nature du bien               : [X] Domicile privé  [ ] Locaux entreprise  [ ] Véhicule(s)

[3. EXPOSÉ DE LA CAUSE PROBABLE (PROBABLE CAUSE)]
1. Faits reprochés : ${title || "Trafic d'armes / Stupéfiants / Recel / Braquage"}.
2. Preuves & Indices concordants :
   - [Détail de la filature, saisie préalable, témoignage ou flagrant délit]

[4. OBJETS & PREUVES RECHERCHÉS]
- Armes à feu illégales (Catégories A, B, C), munitions, équipements tactiques ;
- Substances stupéfiantes, matériel de conditionnement ;
- Fonds illicites, documents comptables ou supports numériques.

Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_bolo_mandat_arret",
    group: "doj",
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
• Groupe / Gang connu          : ${targetGroup || "Aucun / Indépendant"}
• Dernière position connue     : ${location || "Los Santos"} (le ${date} à ${heure})

[2. SIGNALEMENT & VÉHICULE(S)]
• Description vestimentaire    : [Tenue, masque, signes distinctifs...]
• Véhicule(s) utilisé(s)       : [Modèle, Couleur, Plaque d'immatriculation]

[3. MOTIFS DE RECHERCHE & CHEFS D'ACCUSATION]
• Affaire concernée            : ${title || "Braquage / Délit de fuite / Fusillade"}
• Niveau de menace             : [X] ARMÉ ET DANGEREUX — Renforts recommandés (Code 3)

Agent émetteur : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_depot_plainte",
    group: "doj",
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

[3. PERSONNE MISE EN CAUSE & FAITS]
• Plainte déposée contre       : ${targetName || "Contre X (Auteur non identifié)"}
• Lieu et heure des faits      : ${location || "Los Santos"}
• Déclaration de la victime    : « [Récit détaillé des faits] »
• Préjudice & Preuves remises  : [Montant, certificat médical EMS, photos/vidéos]

Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_saisie_scelles",
    group: "doj",
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
• Dossier / Prévenu rattaché       : ${targetName || "Non renseigné"} (${title || "Arrestation"})

[2. INVENTAIRE DES PIÈCES À CONVICTION]
1. ARMES & MUNITIONS : [Modèle, Catégorie A/B/C/D, N° série, Munitions]
2. STUPÉFIANTS       : [Nature, Quantité exacte de pochons]
3. AUTRES BIENS      : [Argent sale, Équipement gouvernemental, Véhicule]

Certifié conforme par : ${agent || "16 | Vance Winchester"} — LSPD.`
  },

  {
    id: "tpl_rapport_perquisition",
    group: "doj",
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

[2. DÉROULEMENT & BILAN DES SAISIES]
• Date & Heure d'intervention  : Le ${date} à ${heure}
• Responsable d'opération      : ${agent || "16 | Vance Winchester"}
• Personnes interpellées       : ${targetName || "Aucune / Lister les suspects"}
• Inventaire des biens saisis  : [Lister les scellés saisis sur place]

Signé : ${agent || "16 | Vance Winchester"} — LSPD.`
  }
];
