// Bibliothèque officielle des 10 Templates de Demandes DOJ (Descentes, Perquisitions, Mandats & Réquisitions)
// Basée strictement sur le Code de Procédure Criminelle de San Andreas (Art. 140-148 & Art. 150-165)

export const DOJ_TEMPLATE_GROUPS = [
  { id: "ALL", label: "Toutes les requêtes DOJ (10)" },
  { id: "descente", label: "Descentes & Perquisitions" },
  { id: "personnes", label: "Mandats d'Arrêt / Comparution" },
  { id: "enquete", label: "Surveillance, Saisie & Procureur" }
];

function formatExhibitsSummaryBlock(exhibits = []) {
  if (!Array.isArray(exhibits) || exhibits.length === 0) {
    return "• Aucune pièce photographique ou scellé joint pour l'instant (ajoutez vos preuves dans le panneau ci-dessus).";
  }
  return exhibits
    .map(ex => {
      const meta = [ex.source, ex.date].filter(Boolean).join(" — ");
      const hasImg = ex.imageData || ex.imageUrl ? " [PHOTO ANNEXÉE]" : "";
      return `• [${ex.code || "PIÈCE"}] ${ex.title || "Preuve jointe"}${meta ? ` (${meta})` : ""}${hasImg}${ex.description ? ` : ${ex.description}` : ""}`;
    })
    .join("\n");
}

export const DOJ_TEMPLATES = [
  // 1. DESCENTE / RAID TACTIQUE QG / GANG / PROPRIÉTÉ
  {
    id: "doj_descente_qg",
    group: "descente",
    title: "Demande de Mandat de Descente / Assaut Tactique (Raid QG)",
    category: "Descente / Raid",
    legalBasis: "Art. 142, 151, 158, 159 & 162 CPC",
    icon: "person-rifle",
    badgeClass: "cat-crime",
    description: "Requête officielle au Juge / Procureur pour autoriser une descente coordonnée (SWAT / LSPD) sur un QG de gang, propriété, entrepôt ou complexe armé.",
    defaultUrgency: "critical",
    defaultAuthority: "Cour Supérieure de San Andreas (Juge) & Bureau du Procureur",
    defaultValidity: "72 heures à compter de la signature du Magistrat",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE OFFICIELLE DOJ — DEMANDE DE MANDAT DE DESCENTE (RAID)
     RÉFÉRENCE : ${requestNumber || "DOJ-RAID-2026-001"} • ART. 151, 158, 159 & 162
╚══════════════════════════════════════════════════════════════════╝

[1. AUTORITÉ SAISIE & OFFICIER DEMANDEUR]
• Autorité judiciaire saisie   : ${authority || "Cour Supérieure de San Andreas (Juge) & Bureau du Procureur"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Division / Commandement      : ${division || "Detective Bureau / SWAT / Command Staff LSPD"}
• Date & Heure de dépôt        : ${date} à ${heure}
• Durée de validité demandée   : ${validity || "72 heures à compter de la signature (Art. 151-5)"}

[2. DÉSIGNATION PRÉCISE DES CIBLES & LIEUX VISÉS (ART. 151-4 & 158-3)]
• Organisation / Gang ciblé    : ${targetGroup || "Nom du gang / organisation criminelle"}
• Individus principaux visés   : ${targetName || "Identités des dirigeants / membres identifiés"}
• Adresse & Périmètre exact    : ${targetLocation || "Adresse complète, bâtiment, entrepôt, accès, garage et annexes"}
• Véhicules rattachés au QG    : [Modèles, couleurs, plaques d'immatriculation relevées sur place]

[3. BASE LÉGALE, FAITS & INFRACTIONS VISÉES (ART. 151-1 & 151-2)]
• Infractions qualifiées       : ${charges || "Association de malfaiteurs (Art. 601), Trafic d'armes Cat. A/B, Trafic de stupéfiants, Braquages répétés"}
• Exposé de la cause probable  :
  À la suite d'investigations menées par le Los Santos Police Department, des éléments concordants et vérifiés établissent l'existence d'une cause probable sérieuse démontrant que les lieux désignés ci-dessus servent de base opérationnelle, de lieu de stockage d'armes illégales, de stupéfiants et/ou de recel du produit d'infractions graves.
  [Détailler ici la chronologie : filatures, interpellations antérieures, flagrants délits, témoignages et observations visuelles confirmant la présence d'éléments illicites sur les lieux.]

[4. OBJET DE LA DESCENTE, SAISIES DEMANDÉES & PROPORTIONNALITÉ (ART. 151-3 & 159)]
• Mesures sollicitées          :
  - Autorisation d'entrée tactique (avec effraction si nécessaire — Art. 162-3) et sécurisation complète du périmètre.
  - Perquisition intégrale des bâtiments, locaux, coffres, caches et véhicules présents sur le périmètre (Art. 158).
  - Saisie et mise sous scellés de toutes armes, munitions, gilets, stupéfiants, argent sale, matériels de braquage, supports numériques et documents comptables (Art. 146, 147 & 159).
  - Interpellation de tout individu visé ou pris en flagrant délit sur les lieux.
• Dispositif tactique prévu    : Déploiement LSPD, unités SWAT, soutien Air-One, périmètre sécurisé et présence EMS en réserve.

[5. PIÈCES À CONVICTION & PREUVES ANNEXÉES AU DOSSIER]
${formatExhibitsSummaryBlock(exhibits)}

[6. DÉCISION DU MAGISTRAT / BUREAU DU PROCUREUR (ART. 150-3 & 158-4)]
• Décision DOJ                 : [ ] MANDAT ACCORDÉ   [ ] ACCORDÉ AVEC RÉSERVES   [ ] REFUSÉ (Complément requis)
• Observations / Limites fixées: ____________________________________________________________________

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 2. MANDAT DE PERQUISITION — DOMICILE / ENTREPÔT / PLANQUE
  {
    id: "doj_perquisition_domicile",
    group: "descente",
    title: "Demande de Mandat de Perquisition — Domicile / Entrepôt",
    category: "Perquisition Lieu",
    legalBasis: "Art. 142, 151 & 158 CPC",
    icon: "house-lock",
    badgeClass: "cat-delit-majeur",
    description: "Requête motivée pour perquisitionner une habitation, un appartement, un garage ou un entrepôt privé conformément aux Articles 142 et 158.",
    defaultUrgency: "high",
    defaultAuthority: "Juge / Bureau du Procureur — San Andreas",
    defaultValidity: "48 heures à compter de la signature",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — DEMANDE DE MANDAT DE PERQUISITION (ART. 158)
     RÉFÉRENCE : ${requestNumber || "DOJ-PERQ-2026-001"} • DOMICILE / ENTREPÔT
╚══════════════════════════════════════════════════════════════════╝

[1. IDENTIFICATION DE LA REQUÊTE]
• Autorité saisie              : ${authority || "Juge / Bureau du Procureur — San Andreas"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service / Unité              : ${division || "Detective Bureau — LSPD"}
• Date & Heure                 : ${date} à ${heure}
• Validité sollicitée          : ${validity || "48 heures (Art. 151-5)"}

[2. LIEU VISÉ & PROPRIÉTAIRE / OCCUPANT (ART. 158-3)]
• Propriétaire / Occupant visé : ${targetName || "Nom & Prénom du mis en cause"} ${targetGroup ? `(${targetGroup})` : ""}
• Désignation exacte du lieu   : ${targetLocation || "Adresse complète, n° d'appartement, garage / entrepôt"}
• Présence de l'occupant       : Conformément à l'Art. 145, l'occupant sera informé / présent sauf nécessité tactique ou absence constatée.

[3. CAUSE PROBABLE & MOTIVATION (ART. 151-2 & 158-2)]
• Infractions poursuivies      : ${charges || "Préciser les articles du Code Pénal visés"}
• Éléments fondant la cause probable :
  [Exposer précisément les faits démontrant pourquoi les objets recherchés se trouvent dans ce lieu : surveillance, témoignage, aveux partiels, saisie antérieure, vidéosurveillance.]

[4. OBJETS & PREUVES RECHERCHÉS (ART. 158-3 & 158-5)]
• Éléments recherchés          : [Armes à feu, munitions, stupéfiants, butin de braquage, tenues/masques, téléphones, documents financiers]
• Rappel légal (Art. 158-5)    : La perquisition sera exécutée strictement dans les limites du présent mandat ; tout élément découvert fortuitement lié à une infraction ou présentant un danger sera placé sous scellés (Art. 147).

[5. PIÈCES À CONVICTION & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[6. VISA & DÉCISION DU DOJ]
• Décision                     : [ ] ACCORDÉ   [ ] REFUSÉ — Motif : __________________________________

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 3. PERQUISITION LOCAL PROFESSIONNEL / ENTREPRISE (ART. 144)
  {
    id: "doj_perquisition_entreprise",
    group: "descente",
    title: "Demande de Perquisition — Local Professionnel / Entreprise",
    category: "Perquisition Pro",
    legalBasis: "Art. 144, 151 & 158 CPC",
    icon: "building-shield",
    badgeClass: "cat-delit-majeur",
    description: "Requête DOJ spécifique pour perquisitionner une société, concession, garage, club ou entrepôt commercial soupçonné de blanchiment ou recel (Art. 144).",
    defaultUrgency: "high",
    defaultAuthority: "Cour Supérieure de San Andreas / Bureau du Procureur & IRS",
    defaultValidity: "72 heures à compter de la signature",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — PERQUISITION DE LOCAL PROFESSIONNEL (ART. 144)
     RÉFÉRENCE : ${requestNumber || "DOJ-PRO-2026-001"} • ENTREPRISE / SOCIÉTÉ
╚══════════════════════════════════════════════════════════════════╝

[1. AUTORITÉ & SERVICE REQUÉRANT]
• Autorité saisie              : ${authority || "Cour Supérieure de San Andreas / Bureau du Procureur"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service                      : ${division || "Detective Bureau / Enquêtes Financières LSPD"}
• Date & Heure                 : ${date} à ${heure}
• Durée de validité            : ${validity || "72 heures"}

[2. ENTREPRISE & DIRIGEANTS VISÉS]
• Raison sociale / Enseigne    : ${targetGroup || "Nom officiel de l'entreprise / commerce"}
• Gérant / Dirigeant visé      : ${targetName || "Nom & Prénom du gérant / responsable"}
• Adresse des locaux           : ${targetLocation || "Adresse complète, bureaux, réserves, garages et coffres de l'entreprise"}

[3. MOTIFS, INFRACTIONS & PROPORTIONNALITÉ (ART. 144 & 151)]
• Infractions visées           : ${charges || "Blanchiment, Recel, Trafic sous couvert d'activité commerciale, Fraude"}
• Exposé détaillé              :
  [Expliquer le lien direct entre l'activité du local professionnel et les infractions constatées, ainsi que les précautions prises pour limiter l'atteinte aux tiers de bonne foi.]
• Éléments recherchés          : Registres comptables, factures, coffres-forts, stocks dissimulés, enregistrements CCTV, matériel illicite.

[4. PIÈCES À CONVICTION & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. DÉCISION DU MAGISTRAT]
• Décision                     : [ ] ACCORDÉ   [ ] REFUSÉ — Limites : _________________________________

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 4. PERQUISITION & SAISIE DE VÉHICULES / COFFRES / FLOTTE
  {
    id: "doj_perquisition_vehicule",
    group: "descente",
    title: "Demande de Mandat de Fouille & Saisie — Véhicules / Coffres",
    category: "Mandat Véhicule",
    legalBasis: "Art. 140, 141, 158 & 159 CPC",
    icon: "car-burst",
    badgeClass: "cat-delit-mineur",
    description: "Demande judiciaire d'ouverture de coffres, fouille approfondie, saisie ou mise en fourrière judiciaire de véhicules impliqués dans une enquête.",
    defaultUrgency: "medium",
    defaultAuthority: "Bureau du Procureur / Juge — San Andreas",
    defaultValidity: "48 heures à compter de la signature",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — MANDAT DE FOUILLE & SAISIE DE VÉHICULES
     RÉFÉRENCE : ${requestNumber || "DOJ-VEH-2026-001"} • ART. 140, 141, 158 & 159
╚══════════════════════════════════════════════════════════════════╝

[1. DEMANDEUR & AUTORITÉ]
• Autorité saisie              : ${authority || "Bureau du Procureur / Juge — San Andreas"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Unité                        : ${division || "LSPD — Traffic / Detective Bureau"}
• Date & Heure                 : ${date} à ${heure}
• Validité                     : ${validity || "48 heures"}

[2. VÉHICULE(S) & PROPRIÉTAIRE VISÉS (ART. 151-4)]
• Propriétaire / Conducteur    : ${targetName || "Nom & Prénom du propriétaire"} ${targetGroup ? `(${targetGroup})` : ""}
• Localisation / Fourrière     : ${targetLocation || "Fourrière LSPD / Garage / Parking précis"}
• Liste des véhicules visés    :
  - Véhicule 1 : [Modèle, Couleur, Plaque d'immatriculation]
  - Véhicule 2 : [Si flotte ou véhicule relais — préciser plaque]

[3. CAUSE PROBABLE & MESURES SOLLICITÉES]
• Infractions concernées       : ${charges || "Transport d'armes illégales, Stupéfiants, Véhicule de fuite de braquage"}
• Cause probable               : [Décrire les indices prouvant que le coffre / boîte à gants contient des preuves ou objets illicites, ou que le véhicule est l'instrument du crime.]
• Mesures demandées            : Ouverture et fouille complète (habitacle, coffre, compartiments) + Saisie conservatoire du véhicule (Art. 159).

[4. PIÈCES & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. DÉCISION DOJ]
• Décision                     : [ ] ACCORDÉ   [ ] REFUSÉ

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 5. MANDAT D'ARRÊT (ART. 153)
  {
    id: "doj_mandat_arret",
    group: "personnes",
    title: "Demande de Mandat d'Arrêt (Arrest Warrant — Art. 153)",
    category: "Mandat d'Arrêt",
    legalBasis: "Art. 151, 153 & 162 CPC",
    icon: "handcuffs",
    badgeClass: "cat-crime",
    description: "Requête officielle au Juge / Procureur pour obtenir un mandat d'arrêt contre un suspect identifié en fuite ou impliqué dans un délit majeur / crime.",
    defaultUrgency: "critical",
    defaultAuthority: "Juge / Bureau du Procureur — San Andreas",
    defaultValidity: "7 jours (renouvelable — Art. 164)",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — DEMANDE DE MANDAT D'ARRÊT (ART. 153)
     RÉFÉRENCE : ${requestNumber || "DOJ-ARR-2026-001"} • ARREST WARRANT
╚══════════════════════════════════════════════════════════════════╝

[1. DEMANDEUR & AUTORITÉ SAISIE]
• Autorité saisie              : ${authority || "Juge / Bureau du Procureur — San Andreas"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service                      : ${division || "LSPD — Detective Bureau / Patrouille"}
• Date & Heure                 : ${date} à ${heure}
• Validité souhaitée           : ${validity || "7 jours (Art. 151-5 & 164)"}

[2. IDENTITÉ DU SUSPECT RECHERCHÉ (ART. 151-4)]
• Nom & Prénom complet         : ${targetName || "Identité exacte du mis en cause"}
• Affiliation / Gang           : ${targetGroup || "Indépendant / Organisation connue"}
• Dernière localisation connue : ${targetLocation || "Secteur / Domicile / Lieu de fréquentation"}
• Niveau de dangerosité        : [ ] Faible   [ ] Modéré   [X] Élevé (Individu potentiellement armé / risque de fuite)

[3. FAITS REPROCHÉS & CAUSE PROBABLE (ART. 151-1 & 153)]
• Chefs d'inculpation visés    : ${charges || "Préciser les articles du Code Pénal et circonstances aggravantes"}
• Résumé des faits & preuves   :
  [Exposer les faits précis, la date de l'infraction, la manière dont le suspect a été formellement identifié (ADN, caméra, témoignage, plaque, reconnaissance) et pourquoi son arrestation immédiate est nécessaire.]

[4. PIÈCES À CONVICTION & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. ORDONNANCE & SIGNATURE DU MAGISTRAT]
• Décision DOJ                 : [ ] MANDAT D'ARRÊT DÉLIVRÉ   [ ] REFUSÉ
• Consignes post-arrestation   : Lecture des droits Miranda (Art. 123), placement en rétention judiciaire et présentation au Procureur / Juge.

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 6. MANDAT DE COMPARUTION / MANDAT D'AMENER (ART. 154 & 155)
  {
    id: "doj_mandat_comparution",
    group: "personnes",
    title: "Demande de Mandat de Comparution / d'Amener (Art. 154 & 155)",
    category: "Comparution / Amener",
    legalBasis: "Art. 154 & 155 CPC",
    icon: "gavel",
    badgeClass: "cat-delit-mineur",
    description: "Requête visant à convoquer officiellement un suspect ou témoin récalcitrant au commissariat ou devant le magistrat (avec contrainte si mandat d'amener).",
    defaultUrgency: "medium",
    defaultAuthority: "Bureau du Procureur / Juge — San Andreas",
    defaultValidity: "72 heures à compter de la délivrance",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — MANDAT DE COMPARUTION / D'AMENER (ART. 154-155)
     RÉFÉRENCE : ${requestNumber || "DOJ-CMP-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. INFORMATIONS DE LA REQUÊTE]
• Autorité saisie              : ${authority || "Bureau du Procureur / Juge — San Andreas"}
• Type de mandat sollicité     : [ ] Mandat de comparution (Art. 154)   [X] Mandat d'amener par la force publique (Art. 155)
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service                      : ${division || "LSPD — Detective Bureau"}
• Date & Heure                 : ${date} à ${heure}
• Validité                     : ${validity || "72 heures"}

[2. PERSONNE CONCERNÉE]
• Identité complète            : ${targetName || "Nom & Prénom"} ${targetGroup ? `(${targetGroup})` : ""}
• Domicile / Lieu de travail   : ${targetLocation || "Adresse connue"}
• Qualité dans la procédure    : [X] Mis en cause   [ ] Témoin essentiel ayant refusé de répondre aux convocations

[3. MOTIVATION & OBJET DE L'AUDITION]
• Enquête / Faits concernés    : ${charges || "Préciser la nature de l'enquête"}
• Justification de la mesure   : [Préciser les convocations restées sans réponse, le risque de fuite ou la nécessité urgente de l'audition pour la manifestation de la vérité.]

[4. PIÈCES & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. DÉCISION DOJ]
• Décision                     : [ ] ACCORDÉ   [ ] REFUSÉ

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 7. MANDAT DE SURVEILLANCE / ÉCOUTES / BALISE GPS (ART. 160)
  {
    id: "doj_mandat_surveillance",
    group: "enquete",
    title: "Demande de Mandat de Surveillance / Écoutes / GPS (Art. 160)",
    category: "Surveillance / Écoutes",
    legalBasis: "Art. 151 & 160 CPC (Conditions renforcées)",
    icon: "satellite-dish",
    badgeClass: "cat-crime",
    description: "Requête à conditions renforcées (Art. 160-2 & 160-3) pour filature prolongée, écoutes téléphoniques, surveillance de lieu ou pose de balise GPS.",
    defaultUrgency: "high",
    defaultAuthority: "Cour Supérieure de San Andreas (Juge) / Bureau du Procureur",
    defaultValidity: "7 jours (limité dans le temps — Art. 160-4)",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — MANDAT DE SURVEILLANCE / ÉCOUTES (ART. 160)
     RÉFÉRENCE : ${requestNumber || "DOJ-SURV-2026-001"} • CONFIDENTIEL ENQUÊTE
╚══════════════════════════════════════════════════════════════════╝

[1. AUTORITÉ & SERVICE REQUÉRANT]
• Autorité saisie              : ${authority || "Cour Supérieure de San Andreas (Juge) / Bureau du Procureur"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service spécialisé           : ${division || "Detective Bureau / Gang & Narcotics Division (GND)"}
• Date & Heure                 : ${date} à ${heure}
• Durée limitée demandée       : ${validity || "7 jours à compter de la signature (Art. 160-4)"}

[2. CIBLES & MOYENS DE SURVEILLANCE SOLLICITÉS (ART. 160-1)]
• Personne / Groupe ciblé      : ${targetName || "Suspect principal"} ${targetGroup ? `(${targetGroup})` : ""}
• Lieux / Véhicules / Lignes   : ${targetLocation || "Quartier, QG, numéro de téléphone, plaques d'immatriculation"}
• Moyens techniques demandés   :
  [X] Surveillance visuelle / photographique et filature longue durée
  [ ] Interception / relevé des communications téléphoniques & SMS
  [ ] Pose de balise GPS sur véhicule(s) identifié(s)

[3. CONDITIONS RENFORCÉES (ART. 160-2 & 160-3)]
• Infractions graves visées    : ${charges || "Délit majeur / Crime en bande organisée / Trafic d'armes ou stupéfiants / Corruption"}
• Caractère indispensable      :
  Conformément à l'Art. 160-2, les informations recherchées (identification des fournisseurs, lieux de stockage et complices) ne peuvent raisonnablement être obtenues par une mesure moins attentatoire.
• Éléments déjà recueillis     : [Résumer l'état de l'enquête et les indices initiaux justifiant cette surveillance renforcée.]

[4. PIÈCES À CONVICTION & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. CONTRÔLE & DÉCISION DU MAGISTRAT (ART. 160-5)]
• Décision DOJ                 : [ ] ACCORDÉ   [ ] ACCORDÉ (Durée réduite)   [ ] REFUSÉ

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 8. MANDAT DE SAISIE, GEL D'AVOIRS & RÉQUISITION BANCAIRE / TÉLÉCOM (ART. 159 & 161)
  {
    id: "doj_mandat_saisie_bancaire",
    group: "enquete",
    title: "Demande de Réquisition Bancaire / Télécom & Gel d'Avoirs",
    category: "Saisie / Réquisition",
    legalBasis: "Art. 159 & 161 CPC",
    icon: "landmark",
    badgeClass: "cat-delit-majeur",
    description: "Requête au DOJ pour obtenir des relevés bancaires, historiques d'appels, enregistrements CCTV ou le gel/conservation d'avoirs et biens (Art. 159 & 161).",
    defaultUrgency: "high",
    defaultAuthority: "Bureau du Procureur / Juge & IRS San Andreas",
    defaultValidity: "72 heures / Durée strictement nécessaire (Art. 161-4)",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     REQUÊTE DOJ — RÉQUISITION, SAISIE & CONSERVATION (ART. 159-161)
     RÉFÉRENCE : ${requestNumber || "DOJ-FIN-2026-001"} • BANCAIRE / TÉLÉCOM / GEL
╚══════════════════════════════════════════════════════════════════╝

[1. DEMANDEUR & AUTORITÉ]
• Autorité saisie              : ${authority || "Bureau du Procureur / Juge — San Andreas"}
• Officier demandeur           : ${agent || "16 | Vance Winchester"}
• Service                      : ${division || "Detective Bureau / LSPD"}
• Date & Heure                 : ${date} à ${heure}
• Durée sollicitée             : ${validity || "72 heures (Art. 161-4)"}

[2. PERSONNE / ENTITÉ & DONNÉES VISÉES]
• Titulaire / Entité ciblée    : ${targetName || "Nom & Prénom"} ${targetGroup ? `(${targetGroup})` : ""}
• Établissement / Opérateur    : ${targetLocation || "Fleeca Bank / Maze Bank / Opérateur Télécom / Caméras CCTV"}
• Nature des données / biens   :
  [X] Relevés bancaires et mouvements financiers sur la période du ___ au ___
  [ ] Facturations détaillées / Bornage / Historique d'appels & SMS
  [ ] Conservation d'enregistrements de vidéosurveillance (risque d'effacement — Art. 161-3)
  [ ] Saisie / Gel conservatoire de comptes ou biens (produit d'infraction — Art. 159-2)

[3. MOTIVATION & RISQUE DE DISPARITION DES PREUVES (ART. 159-2 & 161-3)]
• Infractions visées           : ${charges || "Blanchiment, Escroquerie, Financement de bande organisée, Trafic"}
• Justification                : [Expliquer en quoi ces relevés ou ce gel sont indispensables à la manifestation de la vérité et le risque de dissipation des fonds/données.]

[4. PIÈCES À CONVICTION & PREUVES ANNEXÉES]
${formatExhibitsSummaryBlock(exhibits)}

[5. DÉCISION DU MAGISTRAT / PROCUREUR]
• Décision                     : [ ] ACCORDÉ   [ ] REFUSÉ

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 9. TRANSMISSION DOSSIER AU PROCUREUR / COMPARUTION IMMÉDIATE (ART. 165)
  {
    id: "doj_transmission_procureur",
    group: "enquete",
    title: "Transmission de Dossier au Procureur & Demande de Procès",
    category: "Transmission DOJ",
    legalBasis: "Art. 165 CPC (Délit Majeur / Crime)",
    icon: "scale-balanced",
    badgeClass: "cat-delit-majeur",
    description: "Dossier de saisine officielle du Bureau du Procureur (Art. 165) pour comparution immédiate, mise en accusation ou procès suite à un délit majeur ou crime.",
    defaultUrgency: "high",
    defaultAuthority: "Bureau du Procureur de San Andreas (DOJ)",
    defaultValidity: "Rétention judiciaire en cours (12h Délit majeur / 24h Crime)",
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     SAISINE DU BUREAU DU PROCUREUR — TRANSMISSION DOSSIER (ART. 165)
     RÉFÉRENCE : ${requestNumber || "DOJ-PROC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. TRANSMISSION OFFICIELLE]
• Destinataire                 : ${authority || "Bureau du Procureur de San Andreas (DOJ)"}
• Officier transmetteur        : ${agent || "16 | Vance Winchester"}
• Service                      : ${division || "LSPD — Commandement / Detective Bureau"}
• Date & Heure                 : ${date} à ${heure}
• Délai légal / Rétention      : ${validity || "Rétention 12h (Délit majeur) / 24h (Crime)"}

[2. MIS EN CAUSE & STATUT ACTUEL]
• Identité du prévenu          : ${targetName || "Nom & Prénom du prévenu"} ${targetGroup ? `(${targetGroup})` : ""}
• Lieu des faits               : ${targetLocation || "Los Santos"}
• Situation actuelle           : [X] En cellule LSPD   [ ] Libéré sous bracelet électronique en attente de procès
• Avocat de la défense         : [Nom de l'avocat / Commis d'office / Aucun]

[3. CHEFS D'INCULPATION & SYNTHÈSE DE L'ENQUÊTE]
• Chefs retenus                : ${charges || "Lister les délits majeurs / crimes + amendes & peines encourues"}
• Synthèse factuelle           :
  [Résumer les faits, les droits Miranda lus et respectés (Art. 123), les déclarations lors de l'audition (Art. 131), et la chaîne de conservation des scellés (Art. 148).]
• Réquisitions suggérées LSPD  : [Comparution immédiate / Procès / Maintien en détention / Saisie définitive des biens]

[4. INVENTAIRE DES PIÈCES & PREUVES TRANSMISES]
${formatExhibitsSummaryBlock(exhibits)}

[5. ACCUSÉ DE RÉCEPTION & SUITE DONNÉE PAR LE PROCUREUR]
• Suite DOJ                    : [ ] Poursuites engagées   [ ] Comparution immédiate   [ ] Enquête complémentaire   [ ] Classement

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  },

  // 10. RAPPORT D'EXÉCUTION DE DESCENTE / MANDAT DOJ (ART. 163)
  {
    id: "doj_rapport_execution",
    group: "descente",
    title: "Rapport d'Exécution de Descente / Mandat DOJ (Art. 163)",
    category: "Retour Exécution",
    legalBasis: "Art. 147, 148, 162 & 163 CPC",
    icon: "clipboard-check",
    badgeClass: "cat-contravention",
    description: "Compte-rendu obligatoire transmis au Magistrat / Procureur après l'exécution d'une descente ou perquisition, avec bilan des interpellations et scellés saisis (Art. 163).",
    defaultUrgency: "medium",
    defaultAuthority: "Magistrat / Bureau du Procureur ayant délivré le mandat",
    defaultValidity: "Exécuté le " + new Date().toLocaleDateString("fr-FR"),
    generateContent: ({
      requestNumber,
      agent,
      division,
      authority,
      targetName,
      targetGroup,
      targetLocation,
      charges,
      validity,
      date,
      heure,
      exhibits
    }) =>
`╔══════════════════════════════════════════════════════════════════╗
     RAPPORT D'EXÉCUTION DE DESCENTE / MANDAT DOJ (ART. 163)
     RÉFÉRENCE : ${requestNumber || "DOJ-EXEC-2026-001"}
╚══════════════════════════════════════════════════════════════════╝

[1. RAPPEL DU MANDAT EXÉCUTÉ (ART. 163-2)]
• Autorité ayant délivré       : ${authority || "Juge / Procureur signataire du mandat initial"}
• Officier chef d'exécution    : ${agent || "16 | Vance Winchester"}
• Unités exécutantes           : ${division || "LSPD / SWAT / Detective Bureau"}
• Date & Heure d'exécution     : ${date} à ${heure}
• Référence / Statut           : ${validity || "Mandat exécuté conformément aux limites (Art. 162-1)"}

[2. LIEUX VISITÉS & PERSONNES INTERPELLÉES]
• Lieux perquisitionnés        : ${targetLocation || "Adresse exacte visitée"}
• Personnes concernées         : ${targetName || "Liste des personnes présentes / interpellées"} ${targetGroup ? `(${targetGroup})` : ""}
• Conditions d'exécution       : [Entrée normale / Effraction nécessaire / Usage proportionné de la force — Art. 162-3 / Bilan EMS]

[3. INVENTAIRE DES BIENS SAISIS & MIS SOUS SCELLÉS (ART. 147 & 148)]
• Infractions constatées       : ${charges || "Infractions confirmées lors de la descente"}
• Objets & Scellés saisis      :
  - Armes & Munitions          : [Détail exact + numéros de série]
  - Stupéfiants / Produits     : [Nature et quantités exactes]
  - Liquidités / Biens         : [Montant saisi / Véhicules mis en fourrière]
• Incidents éventuels          : [Aucun incident / Préciser tout incident constaté]

[4. PREUVES PHOTOGRAPHIQUES DE L'EXÉCUTION & SCELLÉS]
${formatExhibitsSummaryBlock(exhibits)}

[5. TRANSMISSION AU MAGISTRAT (ART. 163-3)]
• Réception DOJ                : [ ] Rapport vérifié et versé au dossier de la procédure

Requête soumise et certifiée exacte par : ${agent || "16 | Vance Winchester"} — Los Santos Police Department.`
  }
];
