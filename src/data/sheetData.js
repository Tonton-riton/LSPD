// Données extraites intégralement du Google Sheet "Calcl peine"
// Inclut toutes les infractions, circonstances aggravantes, armes, procédures et formules officielles.

export const DEFAULT_FORMULA_CONFIG = {
  // Multiplicateurs de ligne (Formules colonnes J et K du CALCULATEUR)
  tentativeMultiplier: 0.5,   // IF(G12="Oui", 0.5, 1) -> -50%
  compliciteMultiplier: 0.75, // IF(H12="Oui", 0.75, 1) -> -25% (réglable, ex: 0.5 selon RÈGLES)
  avocatMultiplier: 0.9,      // IF(I12="Oui", 0.9, 1) -> -10%
  roundToInteger: true,       // ROUND(..., 0)

  // Paliers de décision (Lignes 26 à 30 du CALCULATEUR)
  paliers: [
    { id: "MIN_1", label: "MIN 1", factorAmende: 0.2, factorPeine: 0.2, decision: "CS - Procureurs", color: "emerald", description: "20% de la peine maximale (Recours avocat / CS / Procureur)" },
    { id: "MIN_2", label: "MIN 2", factorAmende: 0.4, factorPeine: 0.4, decision: "CS - Procureurs", color: "teal", description: "40% de la peine maximale (Recours avocat / CS / Procureur)" },
    { id: "NOMINALE", label: "NOMINALE", factorAmende: 0.6, factorPeine: 0.6, decision: "BASE", color: "blue", isDefault: true, description: "60% de la peine maximale (Peine de base par défaut)" },
    { id: "AGGRAVE", label: "AGGRAVÉ", factorAmende: 0.8, factorPeine: 0.8, decision: "Juge - Procureur - CS", color: "amber", description: "80% de la peine maximale (Sur décision Juge / Procureur / CS)" },
    { id: "MAXIMAL", label: "MAXIMAL", factorAmende: 1.0, factorPeine: 1.0, decision: "Juge", color: "rose", description: "100% du cumul maximal (Décision Juge ou peines maximales obligatoires)" }
  ],

  // Durées maximales de rétention judiciaire (Cellules E25:E29 : to_date(0.125)=3h, to_date(0.5)=12h, to_date(1)=24h)
  retentionHours: {
    "Contravention": 0,
    "Délit mineur": 3,
    "Délit majeur": 12,
    "Crime": 24
  },

  // Conversion UP (Cellules N25:O26 : =SUM(180*N26/5000)/60)
  upConversion: {
    secondsPerSlice: 180,
    amountPerSlice: 5000
  },

  // Plafonds optionnels (0 = aucun plafond, réglable par l'utilisateur)
  maxFineCap: 0,
  maxPrisonMinutesCap: 0,

  // Modèle des droits Miranda (Cellule N3 du CALCULATEUR)
  mirandaTemplate: `Monsieur / Madame {prevenu}, 

Vous êtes placé.e en état d'arrestation ce {date} à {heure} pour les chefs d'inculpation suivants :
{chefs}

Sachez que les chefs d'accusation peuvent être amenés à changer tout au long de la procédure. Vous avez le droit de garder le silence. Si vous renoncez à ce droit, tout ce que vous direz pourra et sera utilisé contre vous devant une cour de justice.
  
Vous avez le droit à un avocat. Si vous n'en n'avez pas les moyens, un avocat vous sera commis d'office. 

Avez-vous bien compris vos droits ?`
};

export const ORIGINAL_SHEET_FORMULAS = [
  {
    cell: "B12:B23 (ARTICLE)",
    title: "Recherche de l'Article",
    formula: `=IFERROR(XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$B$2:$B),"")`,
    explanation: "Récupère automatiquement le numéro d'article (ex: Art. 403, CIRCULATION, IRS) correspondant au chef d'accusation sélectionné."
  },
  {
    cell: "C12:C23 (CATÉGORIE D'INFRACTION)",
    title: "Classification de l'Infraction",
    formula: `=IFERROR(XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$D$2:$D),"")`,
    explanation: "Identifie la gravité de l'infraction : Contravention, Délit mineur, Délit majeur ou Crime."
  },
  {
    cell: "J12:J23 (AMENDES MAX)",
    title: "Calcul de l'Amende Maximale par Ligne",
    formula: `=IF(D12="","",ROUND((XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$E$2:$E)+IF(E12="",0,SUMPRODUCT((AGGRAVANTES!$A$2:$A=XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$A$2:$A))*N(ISNUMBER(SEARCH(AGGRAVANTES!$C$2:$C,E12)))*AGGRAVANTES!$D$2:$D)))*IF(F12="",1,F12)*IF(G12="Oui",0.5,1)*IF(H12="Oui",0.75,1)*IF(I12="Oui",0.9,1),0))`,
    explanation: "Additionne l'amende de base et toutes les circonstances aggravantes sélectionnées, puis multiplie par la Quantité, Tentative (×0.5), Complicité (×0.75) et Avocat (×0.9), arrondi à l'entier."
  },
  {
    cell: "K12:K23 (PEINES DE PRISON)",
    title: "Calcul de la Peine par Ligne (Minutes / Format Horaire)",
    formula: `=IF(D12="","",ROUND((XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$F$2:$F)+IF(E12="",0,SUMPRODUCT((AGGRAVANTES!$A$2:$A=XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$A$2:$A))*(AGGRAVANTES!$C$2:$C<>"")*ISNUMBER(SEARCH(AGGRAVANTES!$C$2:$C,E12))*AGGRAVANTES!$E$2:$E)))*IF(F12="",1,F12)*IF(G12="Oui",0.5,1)*IF(H12="Oui",0.75,1)*IF(I12="Oui",0.9,1),0)/1440)`,
    explanation: "Additionne la peine de base (en minutes) et les peines supplémentaires des circonstances aggravantes, applique les multiplicateurs (Qté, Tentative ×0.5, Complicité ×0.75, Avocat ×0.9) et convertit en heures/minutes (/1440 jours)."
  },
  {
    cell: "L12:L23 (SPÉCIAL / PEINES COMPLÉMENTAIRES)",
    title: "Agrégation des Mentions Spéciales",
    formula: `=IF(D12="","",TEXTJOIN(" • ",TRUE,XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$G$2:$G,""),IF(E12="","",IFERROR(TEXTJOIN(" • ",TRUE,FILTER(AGGRAVANTES!$F$2:$F,AGGRAVANTES!$A$2:$A=XLOOKUP(D12,INFRACTIONS!$C$2:$C,INFRACTIONS!$A$2:$A),ISNUMBER(SEARCH(AGGRAVANTES!$C$2:$C,E12)),AGGRAVANTES!$F$2:$F<>"")),""))))`,
    explanation: "Concatène avec « • » les sanctions complémentaires de l'infraction (saisie, retrait de permis, prison fédérale...) et celles des circonstances aggravantes (perpétuité, peine de mort, confiscation...)."
  },
  {
    cell: "I26:J30 (GRILLE DES PALIERS DE PEINE)",
    title: "Paliers MIN 1 (20%), MIN 2 (40%), NOMINALE (60%), AGGRAVÉ (80%), MAXIMAL (100%)",
    formula: `MIN 1: =0.2*I30 | MIN 2: =0.4*I30 | NOMINALE: =0.6*I30 | AGGRAVÉ: =0.8*I30 | MAXIMAL: =SUM(J12:J23)`,
    explanation: "Calcule automatiquement les 5 niveaux de condamnation pour les amendes et les peines selon l'autorité décisionnaire (BASE, CS - Procureurs, Juge)."
  },
  {
    cell: "D25:E29 (COMPTAGE & RÉTENTION MAX)",
    title: "Décompte par Catégorie & Durée de Rétention",
    formula: `D25:D28 =COUNTIF($C$12:$C$23, B25) | E26 =IF(D26<>0, to_date(0.125), 0) | E27 =IF(D27<>0, to_date(0.5), 0) | E28 =IF(D28<>0, to_date(1), 0) | E29 =MAX(E26:E28)`,
    explanation: "Compte le nombre d'infractions par catégorie, vérifie si un Juge/Procureur est obligatoire (Délit majeur ou Crime) et détermine le temps maximal de rétention judiciaire (3h, 12h ou 24h)."
  },
  {
    cell: "O26 (CONVERSION UP)",
    title: "Conversion d'Amende en Unités Pénitentiaires (UP)",
    formula: `=SUM(180*N26/5000)/60`,
    explanation: "Convertit un montant en dollars (N26) en temps de peine / UP à raison de 180 secondes (3 minutes) par tranche de 5 000 $."
  },
  {
    cell: "N3 (DROITS MIRANDA)",
    title: "Générateur de Lecture des Droits Miranda",
    formula: `="Monsieur / Madame " &D9& ", \n\nVous êtes placé.e en état d'arrestation ce " & TEXT($D$2, "dd/mm/yyyy") & " à " & TEXT($F$2, "HH:MM") & " pour les chefs d'inculpation suivants :\n- " & TEXTJOIN("\n- ", TRUE, D12:D23) & "..."`,
    explanation: "Génère automatiquement le texte officiel de mise en état d'arrestation et de lecture des droits Miranda avec le nom du prévenu, la date, l'heure et la liste des chefs d'inculpation."
  }
];

export const INITIAL_INFRACTIONS = [
  {
    "id": "CIRC_CONDUITE_DANGEREUSE",
    "article": "CIRCULATION",
    "chefAccusation": "Conduite dangereuse",
    "categorie": "Contravention",
    "amendeBase": 400,
    "peineBaseMinutes": 10,
    "specialBase": ""
  },
  {
    "id": "CIRC_CONTRESENS",
    "article": "CIRCULATION",
    "chefAccusation": "Conduite en contre-sens",
    "categorie": "Contravention",
    "amendeBase": 60,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_SANS_CASQUE",
    "article": "CIRCULATION",
    "chefAccusation": "Conduite sans port de casque",
    "categorie": "Contravention",
    "amendeBase": 150,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_VITESSE_1_10",
    "article": "CIRCULATION",
    "chefAccusation": "Excès de vitesse 1-10 km/h",
    "categorie": "Contravention",
    "amendeBase": 60,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_VITESSE_11_20",
    "article": "CIRCULATION",
    "chefAccusation": "Excès de vitesse 11-20 km/h",
    "categorie": "Contravention",
    "amendeBase": 125,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_VITESSE_21_30",
    "article": "CIRCULATION",
    "chefAccusation": "Excès de vitesse 21-30 km/h",
    "categorie": "Contravention",
    "amendeBase": 175,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_VITESSE_31_50",
    "article": "CIRCULATION",
    "chefAccusation": "Excès de vitesse 31-50 km/h",
    "categorie": "Contravention",
    "amendeBase": 225,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_VITESSE_51_PLUS",
    "article": "CIRCULATION",
    "chefAccusation": "Excès de vitesse 51+ km/h",
    "categorie": "Contravention",
    "amendeBase": 300,
    "peineBaseMinutes": 0,
    "specialBase": "Retrait du permis pendant 48 heures"
  },
  {
    "id": "CIRC_VEHICULE_NON_REGLEMENTAIRE",
    "article": "CIRCULATION",
    "chefAccusation": "Véhicule non réglementaire",
    "categorie": "Contravention",
    "amendeBase": 200,
    "peineBaseMinutes": 0,
    "specialBase": "Saisie du véhicule"
  },
  {
    "id": "CIRC_PIETON_AUTOROUTE",
    "article": "CIRCULATION",
    "chefAccusation": "Présence piétonne sur une autoroute",
    "categorie": "Contravention",
    "amendeBase": 35,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_STATIONNEMENT_INTERDIT",
    "article": "CIRCULATION",
    "chefAccusation": "Stationnement interdit",
    "categorie": "Contravention",
    "amendeBase": 100,
    "peineBaseMinutes": 0,
    "specialBase": "Mise en fourrière si conducteur absent"
  },
  {
    "id": "CIRC_STATIONNEMENT_GENANT",
    "article": "CIRCULATION",
    "chefAccusation": "Stationnement gênant",
    "categorie": "Contravention",
    "amendeBase": 75,
    "peineBaseMinutes": 0,
    "specialBase": "Sabot si conducteur absent ; libération après paiement de la fourrière"
  },
  {
    "id": "CIRC_VEHICULE_DEGRADE",
    "article": "CIRCULATION",
    "chefAccusation": "Véhicule dégradé",
    "categorie": "Contravention",
    "amendeBase": 75,
    "peineBaseMinutes": 0,
    "specialBase": "Rappel à l'ordre si coopération ; immobilisation si opposition"
  },
  {
    "id": "CIRC_NON_RESPECT_PRIORITAIRE",
    "article": "CIRCULATION",
    "chefAccusation": "Non-respect d'un véhicule prioritaire",
    "categorie": "Contravention",
    "amendeBase": 250,
    "peineBaseMinutes": 0,
    "specialBase": ""
  },
  {
    "id": "CIRC_TELEPHONE_VOLANT",
    "article": "CIRCULATION",
    "chefAccusation": "Téléphone au volant",
    "categorie": "Contravention",
    "amendeBase": 100,
    "peineBaseMinutes": 0,
    "specialBase": "Amende à compléter"
  },
  {
    "id": "ART206",
    "article": "Art. 206",
    "chefAccusation": "Coups et blessures sans lésion manifeste",
    "categorie": "Contravention",
    "amendeBase": 200,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 206 - Coups et blessures\n206-1 Définition : Les coups et blessures volontaires sont les violences physiques infligées intentionnellement à une victime, notamment par des coups, l’usage d’un objet ou tout autre moyen susceptible de porter atteinte à son intégrité physique.\n206-2 Peine : Les coups et blessures sans lésion manifeste sont punis d'une amende de 200 $.\n206-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 500 $ d'amende si la victime subit un traumatisme ou une blessure persistante au-delà de 8 jours.\nLa peine est majorée de 16 ans de détention et de 2 000 $ d'amende si la victime subit des mutilations ou des infirmités permanentes.\nLa peine est majorée de 24 ans de détention et de 5 000 $ d'amende si la victime décède sans intention de donner la mort."
  },
  {
    "id": "ART303",
    "article": "Art. 303",
    "chefAccusation": "Entrave aux mesures d’assistance et omission de porter secours",
    "categorie": "Contravention",
    "amendeBase": 500,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 303 - Entrave aux mesures d'assistance et omission de porter secours\n303-1 Définition : Constitue une entrave aux mesures d'assistance le fait d’entraver volontairement l'arrivée de secours ou de ne pas porter assistance à une personne en péril imminent.\n303-2 Peine : L'entrave aux mesures d'assistance et l'omission de porter secours sont punies d'une amende de 500$.\n303-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si l'entrave aux mesures d'assistance est commise sous la menace d'une arme.\nLa peine est majorée de 15 ans de détention et de 2 500 $ d'amende si l'entrave aux mesures d'assistance ou l'omission de porter secours entraîne la mort de la victime."
  },
  {
    "id": "ART304",
    "article": "Art. 304",
    "chefAccusation": "Fausse alerte",
    "categorie": "Contravention",
    "amendeBase": 400,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 304 - Fausse alerte\n304-1 Définition : La fausse alerte est définie comme le fait de frauduleusement signaler une situation d'urgence ou de danger inexistant, entraînant une mobilisation inutile des services d'urgence.\n304-2 Peine : La fausse alerte est punie d'une amende de 400$.\n304-2-1 Circonstances aggravantes :\nLa peine est majorée de 400 $ d'amende si la fausse alerte met concrètement en danger la sécurité d'autrui.\nLa peine est majorée de 2 ans de détention et de 750$ d'amende si la fausse alerte entraîne des blessures."
  },
  {
    "id": "ART305",
    "article": "Art. 305",
    "chefAccusation": "Refus d’identification",
    "categorie": "Contravention",
    "amendeBase": 150,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 305 - Refus d’identification\n305-1 Définition : Le refus d’identification est constitué par le fait de refuser de s'identifier à un représentant des forces de l'ordre lors d'un contrôle légal, en particulier lorsque la personne est au volant d'un véhicule motorisé, circule la nuit dans un lieu public, ou est soupçonnée d'avoir commis un délit ou un crime.\n305-2 Peine : Le refus d'identification est puni d'une amende de 150 $.\n305-2-1 Circonstances aggravantes :\nLa peine est majorée de 100 $ d'amende si le refus d'identification est accompagné d'un comportement menaçant.\nLa peine est majorée de 1 an de détention et de 250 $ d'amende si le refus d'identification entrave ou compromet une enquête en cours."
  },
  {
    "id": "ART306",
    "article": "Art. 306",
    "chefAccusation": "Dissimulation du visage dans l’espace public",
    "categorie": "Contravention",
    "amendeBase": 150,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 306 - Dissimulation du visage dans l’espace public\n306-1 Définition : Il est interdit de porter une tenue destinée à dissimuler son visage dans l'espace public, à l'exception des cas liés à la sécurité, aux soins médicaux ou aux obligations professionnelles.\n306-2 Peine : La dissimulation du visage dans l'espace public est punie d'une amende de 150$.\n306-2-1 Circonstances aggravantes :\nLa peine est majorée de 1 an de détention et de 250 $ d'amende si la dissimulation du visage est utilisée afin de préparer, faciliter ou commettre une infraction."
  },
  {
    "id": "ART406",
    "article": "Art. 406",
    "chefAccusation": "Dégradation",
    "categorie": "Contravention",
    "amendeBase": 400,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 406 - Dégradation\n406-1 Définition : La dégradation ou détérioration d'un bien appartenant à autrui est définie comme tout acte volontaire qui endommage ou détruit un bien, qu'il soit privé ou public.\n406-2 Peine : La dégradation est punie d'une amende de 400 $.\n406-2-1 Circonstances aggravantes :\nLa peine est majorée de 400 $ d'amende si la dégradation est commise avec l'intention de nuire gravement au propriétaire ou à l'occupant du bien.\nLa peine est majorée de 2 ans de détention et de 750$ d'amende si le bien est entièrement détruit ou rendu définitivement inutilisable."
  },
  {
    "id": "ART408",
    "article": "Art. 408",
    "chefAccusation": "Effraction",
    "categorie": "Contravention",
    "amendeBase": 400,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 408 - Effraction\n408-1 Définition : L’effraction est le forcement, la dégradation ou la destruction de dispositifs de fermeture ou de clôture, ou l’usage de fausses clés, de clés indûment obtenues, ou de tout instrument permettant l’accès illégal à une propriété.\n408-2 Peine : L'effraction est punie d'une amende de 400 $.\n408-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 400 $ d'amende si l'effraction cause des dégradations importantes.\nLa peine est majorée de 5 ans de détention et de 400 $ d'amende si l'effraction est suivie d'un vol.\nLa peine est majorée de 7 ans de détention et de 1250 $ d'amende si l'effraction entraîne des blessures au propriétaire, à l'occupant ou à une autre personne présente.\nLa peine est majorée de 10 ans de détention et de 1500 $ d'amende si l'effraction est commise afin de réaliser un braquage."
  },
  {
    "id": "ART802_REVENTE",
    "article": "Art. 802",
    "chefAccusation": "Revente illicite de stupéfiants",
    "categorie": "Contravention",
    "amendeBase": 25,
    "peineBaseMinutes": 0,
    "specialBase": "Amende par pochon",
    "legalExcerpt": "Article 802 - Vente et Production Illicite de Stupéfiants\n802-1 Définition : Le trafic de drogue inclut la vente, la production, l'importation ou l'exportation illicite de stupéfiants.\n802-2 Peine : Le trafic de stupéfiants est puni de 20 ans de détention et de 3500 $ d'amende pour l'instigateur. Le revendeur est puni d'une amende de 25 $ par pochon.\n802-3 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si le trafic implique ou exploite une personne particulièrement vulnérable.\nLa peine est majorée de 10 ans de détention et de 4000 $ d'amende si le trafic implique ou exploite un mineur.\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si l'auteur participe à un réseau organisé de trafic. Les biens utilisés ou obtenus dans le cadre du trafic peuvent être confisqués.\nLa peine est majorée de 10 ans de détention et de 5000 $ d'amende si l'auteur dirige, organise ou finance un réseau de trafic. Les biens utilisés ou obtenus dans le cadre du trafic peuvent être confisqués."
  },
  {
    "id": "CIRC_IVRESSE",
    "article": "CIRCULATION",
    "chefAccusation": "Conduite en état d'ivresse",
    "categorie": "Délit mineur",
    "amendeBase": 500,
    "peineBaseMinutes": 10,
    "specialBase": "Retrait du permis de conduire"
  },
  {
    "id": "CIRC_SANS_PERMIS",
    "article": "CIRCULATION",
    "chefAccusation": "Conduite sans permis",
    "categorie": "Délit mineur",
    "amendeBase": 200,
    "peineBaseMinutes": 15,
    "specialBase": "Interdiction de passer le permis pendant 48 heures"
  },
  {
    "id": "ART212",
    "article": "Art. 212",
    "chefAccusation": "Harcèlement",
    "categorie": "Délit mineur",
    "amendeBase": 750,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 212 - Harcèlement\n212-1 Définition : Le harcèlement inclut tout comportement répété visant à troubler la tranquillité, à intimider, à menacer, ou à porter atteinte à la dignité d’une personne, qu’il soit verbal, non verbal, physique ou psychologique. Ce comportement peut se manifester par des communications insistantes, des surveillances, des gestes déplacés, des propos menaçants ou diffamatoires, ou tout autre comportement intrusif et oppressif.\n212-2 Peine : Le harcèlement est puni de 5 ans de détention et d'une amende de 750 $.\n212-2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si le harcèlement est commis par une personne en position d'autorité ou de confiance sur la victime.\nLa peine est majorée de 4 ans de détention et de 1 250 $ d'amende si le harcèlement est commis à l'encontre d'un mineur, d'une personne âgée, d'une personne en situation de handicap ou de toute autre personne particulièrement vulnérable.\nLa peine est majorée de 5 ans de détention et de 2 000 $ d'amende si le harcèlement entraîne des conséquences graves pour la santé physique ou mentale de la victime."
  },
  {
    "id": "ART301",
    "article": "Art. 301",
    "chefAccusation": "Refus d’obtempérer",
    "categorie": "Délit mineur",
    "amendeBase": 750,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 301 - Refus d’obtempérer\n301-1 Définition : Le refus d’obtempérer est constitué par le fait de ne pas respecter une injonction d’une personne dépositaire de l’autorité publique, à condition que l’ordre donné soit légal.\n301-2 Peine : Le refus d'obtempérer est puni de 5 ans de détention et d'une amende de 750 $.\n301-2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si le refus d'obtempérer cause une dégradation grave du domaine public.\nLa peine est majorée de 5 ans de détention et de 1 500 $ d'amende si le refus d'obtempérer met directement en danger la vie d'une ou de plusieurs personnes."
  },
  {
    "id": "ART302",
    "article": "Art. 302",
    "chefAccusation": "Délit de fuite",
    "categorie": "Délit mineur",
    "amendeBase": 1000,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 302 - Délit de fuite\n302-1 Définition : Le délit de fuite est défini comme le fait, pour toute personne impliquée dans une infraction ou un accident de la route, de quitter les lieux pour échapper à ses responsabilités légales.\n302-2 Peine : Le délit de fuite est puni de 5 ans de détention et d'une amende de 1 000 $.\n302-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 1 250 $ d'amende si le délit de fuite entraîne des blessures graves.\nLa peine est majorée de 15 ans de détention et de 4 000 $ d'amende si le délit de fuite entraîne la mort d'une personne."
  },
  {
    "id": "ART307",
    "article": "Art. 307",
    "chefAccusation": "Manifestation illicite",
    "categorie": "Délit mineur",
    "amendeBase": 1000,
    "peineBaseMinutes": 2,
    "specialBase": "",
    "legalExcerpt": "Article 307 - Manifestation illicite\n307-1 Définition : Constitue une manifestation illicite toute participation ou organisation de manifestation sur la voie publique sans déclaration préalable ou en violation des conditions fixées par la loi.\n307-2 Peine : L'organisation ou la participation à une manifestation illicite est punie de 2 ans de détention et d'une amende de 1 000 $.\n307-2-1 Circonstances aggravantes :\nLa peine est majorée de 1 an de détention et de 400 $ d'amende si la manifestation illicite menace gravement l'ordre public.\nLa peine est majorée de 2 ans de détention et de 750 $ d'amende si la manifestation illicite entraîne des dégradations.\nLa peine est majorée de 3 ans de détention et de 1 250 $ d'amende si la manifestation illicite entraîne des violences contre des personnes."
  },
  {
    "id": "ART308",
    "article": "Art. 308",
    "chefAccusation": "Trouble à l’ordre public",
    "categorie": "Délit mineur",
    "amendeBase": 250,
    "peineBaseMinutes": 1,
    "specialBase": "",
    "legalExcerpt": "Article 308 - Trouble à l'ordre public\n308-1 Définition : Le trouble à l'ordre public est défini comme toute action portant atteinte à la tranquillité publique, que ce soit par des actes, des paroles déplacées ou des nuisances, incluant les regroupements lors de manifestations illégales ou d'émeutes.\n308-2 Peine : Le trouble à l'ordre public est puni d'1 an de détention et d'une amende de 250$.\n308-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 250 $ d'amende si le trouble à l'ordre public est commis de manière concertée et accompagné de coups.\nLa peine est majorée de 3 ans de détention et de 500 $ d'amende si le trouble à l'ordre public est commis de manière concertée et accompagné de violences graves.\nLa peine est majorée de 4 ans de détention et de 500 $ d'amende si le trouble à l'ordre public est commis de manière concertée et accompagné de destructions."
  },
  {
    "id": "ART310_2_1",
    "article": "Art. 310-2-1",
    "chefAccusation": "Entrée illégale sur le territoire",
    "categorie": "Délit mineur",
    "amendeBase": 750,
    "peineBaseMinutes": 30,
    "specialBase": "Peines maximales",
    "legalExcerpt": "Article 310 - Violation des lois de l’immigration\n310-1 Définition : La violation des lois de l'immigration inclut l’entrée, le séjour ou le travail sur le territoire sans autorisations légales, ou en violation des conditions imposées par les autorités compétentes.\n310-2 Peine :\n310-2-1 Entrée illégale : L'entrée illégale sur le territoire est passible d'une peine d'emprisonnement allant jusqu'à 6 mois et d'une amende pouvant atteindre 750$.\n310-2-2 Séjour illégal : Le séjour sans titre de séjour valide est passible d'une peine d'emprisonnement allant jusqu'à 1 an et d'une amende pouvant atteindre 1250 $.\n310-2-3 Trafic d'êtres humains et aide à l'immigration illégale : Toute personne qui facilite, organise ou participe au transport illégal de personnes à travers les frontières est passible d'une peine d'emprisonnement allant jusqu'à 10 ans et d'une amende pouvant atteindre 15 000 $."
  },
  {
    "id": "ART310_2_2",
    "article": "Art. 310-2-2",
    "chefAccusation": "Séjour illégal sur le territoire",
    "categorie": "Délit mineur",
    "amendeBase": 1250,
    "peineBaseMinutes": 60,
    "specialBase": "Peines maximales",
    "legalExcerpt": "Article 310 - Violation des lois de l’immigration\n310-1 Définition : La violation des lois de l'immigration inclut l’entrée, le séjour ou le travail sur le territoire sans autorisations légales, ou en violation des conditions imposées par les autorités compétentes.\n310-2 Peine :\n310-2-1 Entrée illégale : L'entrée illégale sur le territoire est passible d'une peine d'emprisonnement allant jusqu'à 6 mois et d'une amende pouvant atteindre 750$.\n310-2-2 Séjour illégal : Le séjour sans titre de séjour valide est passible d'une peine d'emprisonnement allant jusqu'à 1 an et d'une amende pouvant atteindre 1250 $.\n310-2-3 Trafic d'êtres humains et aide à l'immigration illégale : Toute personne qui facilite, organise ou participe au transport illégal de personnes à travers les frontières est passible d'une peine d'emprisonnement allant jusqu'à 10 ans et d'une amende pouvant atteindre 15 000 $."
  },
  {
    "id": "ART324",
    "article": "Art. 324",
    "chefAccusation": "Diffamation",
    "categorie": "Délit mineur",
    "amendeBase": 750,
    "peineBaseMinutes": 2,
    "specialBase": "",
    "legalExcerpt": "Article 324 - Diffamation\n324-1 Définition : La diffamation est définie comme toute allégation ou imputation d’un fait qui porte atteinte à l'honneur ou à la considération d'une personne, formulée ou diffusée publiquement ou par tout moyen de communication. Cette imputation doit être précise, identifiable, et de nature à porter atteinte à la réputation de la victime.\n324-2 Peine : La diffamation est punie de 2 ans de détention et d'une amende de 750 $.\n324-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 500 $ d'amende si la diffamation est diffusée par voie de presse, sur un réseau social ou par tout autre média de masse.\nLa peine est majorée de 2 ans de détention et de 500 $ d'amende si la diffamation vise un fonctionnaire public, un élu ou une personne exerçant une fonction publique en raison de ses fonctions.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si la diffamation est motivée par l'origine, la race, l'ethnie, la religion, le sexe, le handicap ou l'orientation sexuelle de la victime."
  },
  {
    "id": "ART325",
    "article": "Art. 325",
    "chefAccusation": "Menace",
    "categorie": "Délit mineur",
    "amendeBase": 1000,
    "peineBaseMinutes": 3,
    "specialBase": "",
    "legalExcerpt": "Article 325 - Menace\n325-1 Définition : La menace est définie comme le fait de communiquer à autrui une intention de causer un dommage illégal, soit à sa personne, soit à ses biens, de manière à susciter une crainte légitime de la réalisation de ce dommage. La menace peut être formulée verbalement, par écrit, par geste, ou par tout autre moyen de communication.\n325-2 Peine : La menace est punie de 3 ans de détention et d'une amende de 1000 $.\n325-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 750 $ d'amende si la menace est formulée à l'encontre d'un fonctionnaire public, d'un élu ou de toute personne exerçant une fonction publique dans l'exercice de ses fonctions.\nLa peine est majorée de 3 ans de détention et de 1250 $ d'amende si la menace est accompagnée d'un ordre ou d'une condition visant à contraindre la victime à accomplir ou à ne pas accomplir un acte déterminé.\nLa peine est majorée de 3 ans de détention et de 1250 $ d'amende si la menace vise un groupe de personnes en raison de leur origine, de leur race, de leur religion, de leur sexe, de leur handicap ou de leur orientation sexuelle.\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si la menace contient l'intention explicite de donner la mort ou fait craindre une atteinte imminente à la vie de la victime."
  },
  {
    "id": "ART401",
    "article": "Art. 401",
    "chefAccusation": "Vol",
    "categorie": "Délit mineur",
    "amendeBase": 500,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 401 - Le vol\n401-1 Définition : Le vol est défini comme la soustraction frauduleuse de la chose d’autrui, avec l’intention de se l’approprier sans le consentement du propriétaire.\n401-2 Peine : Le vol est puni de 5 ans de détention et d'une amende de 500 $.\n401-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 400 $ d'amende si le vol est commis par plusieurs personnes agissant ensemble en qualité d'auteur ou de complice, sans constituer une bande organisée.\nLa peine est majorée de 10 ans de détention et de 1000 $ d'amende si le vol est commis par une personne chargée de représenter la loi ou la justice, en abusant de ses fonctions.\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si le vol est accompagné de destructions, de dégradations ou de détériorations des biens volés ou d'autres biens."
  },
  {
    "id": "ART409",
    "article": "Art. 409",
    "chefAccusation": "Violation de propriété privée",
    "categorie": "Délit mineur",
    "amendeBase": 750,
    "peineBaseMinutes": 30,
    "specialBase": "Peines maximales",
    "legalExcerpt": "Article 409 - Violation de propriété privée\n409-1 Définition : La violation de propriété privée est constituée par le fait d'entrer ou de demeurer volontairement sur une propriété privée sans le consentement du propriétaire ou de l'occupant légal, ou après avoir été expressément interdit d'y accéder.\n409-2 Peine : La violation de propriété privée est punie d'une peine d'emprisonnement pouvant aller jusqu'à 6 mois et d'une amende pouvant atteindre 750 $.\n409-2-1 Circonstances aggravantes :\nLa peine est majorée de 6 mois de détention et de 400 $ d'amende si la violation de propriété privée est commise avec l'intention de causer des dommages.\nLa peine est majorée de 1 an de détention et de 750 $ d'amende si la violation de propriété privée est commise afin de préparer ou de commettre une autre infraction."
  },
  {
    "id": "ART701_3_1",
    "article": "Art. 701-3-1",
    "chefAccusation": "Acquisition non réglementaire d’armes de catégorie C",
    "categorie": "Délit mineur",
    "amendeBase": 1250,
    "peineBaseMinutes": 1,
    "specialBase": "",
    "legalExcerpt": "Article 701 - Réglementation des Armes par Catégorie\n701-1 Définition : Est considérée comme arme tout objet conçu pour tuer, blesser ou menacer une personne.\n701-2 Catégories :\nCatégorie D : Armes en vente libre (gazeuse, couteau, matraque, etc.).\nCatégorie C : Armes soumises à déclaration (Flare Gun, Taser, gilet par balle etc.).\nCatégorie B : Armes soumises à autorisation du Gouvernement (Revolver, armes de poing, fusils de chasse, fusils à pompe).\nCatégorie A : Armes prohibées (armes de guerre, explosifs).\n701-3 Peines :\n701-3-1 : Acquisition non réglementaire d'armes de catégorie C : 1 ans de détention et 1250 $ d'amende.\n701-3-2 : Acquisition non réglementaire d'armes de catégorie B : 2 ans de détention et 2000 $ d'amende."
  },
  {
    "id": "ART705",
    "article": "Art. 705",
    "chefAccusation": "Exhibition d’une arme",
    "categorie": "Délit mineur",
    "amendeBase": 350,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 705 - Exhibition d'une Arme\n705-1 Définition : L'exhibition d'une arme consiste à porter de manière visible, afficher, tenir ou exhiber une arme dans un lieu public ou sur la voie publique.\n705-2 Peine : Le délit d'exhibition d'arme est puni de 350 $ d'amende.\n705-3 Circonstances aggravantes :\nLa peine est majorée de 1 an de détention et de 500 $ d'amende si l'arme est exhibée dans un lieu particulièrement fréquenté.\nLa peine est majorée de 2 ans de détention et de 750 $ d'amende si l'arme est exhibée dans un établissement accueillant habituellement des mineurs ou directement en présence de mineurs."
  },
  {
    "id": "ART803",
    "article": "Art. 803",
    "chefAccusation": "Possession illicite de stupéfiants",
    "categorie": "Délit mineur",
    "amendeBase": 50,
    "peineBaseMinutes": 5,
    "specialBase": "par pochon",
    "legalExcerpt": "Article 803 - Possession Illicite de Stupéfiants\n803-1 Définition : La possession de stupéfiants inclut le transport, la détention, l'acquisition ou l'emploi de drogues illicites sans autorisation légale.\n803-2 Peine : La possession de stupéfiants est punie de 5 ans de détention et 50 $ d'amende par pochon.\n803-3 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 500 $ d'amende si la possession est constatée dans un lieu public particulièrement sensible.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si la possession est constatée dans un établissement scolaire ou dans un établissement accueillant habituellement des mineurs.\nLa peine est majorée de 5 ans de détention et de 1000 $ d'amende si les quantités détenues dépassent les seuils légaux de possession personnelle, sans préjudice d'une éventuelle requalification en trafic de stupéfiants.\nLa peine est majorée de 10 ans de détention et de 1250 $ d'amende en cas de récidive.\nCréé par Thomas | Discord : thomassss — Créé par Thomas | Discord : thomassss — Créé par Thomas | Discord : thomassss"
  },
  {
    "id": "IRS_DETOURNEMENT",
    "article": "IRS",
    "chefAccusation": "Détournement de fonds",
    "categorie": "Délit majeur",
    "amendeBase": 4000,
    "peineBaseMinutes": 30,
    "specialBase": "Prix du détournement  + 12 500 $"
  },
  {
    "id": "ART204",
    "article": "Art. 204",
    "chefAccusation": "Mise en danger de la vie d’autrui",
    "categorie": "Délit majeur",
    "amendeBase": 750,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 204 - Mise en danger de la vie d’autrui\n204-1 Définition : La mise en danger de la vie d’autrui consiste à exposer directement autrui à un risque immédiat de mort ou de blessure grave par la violation manifestement délibérée d'une obligation particulière de prudence ou de sécurité imposée par la loi ou le règlement.\n204-2 Peine : La mise en danger de la vie d'autrui est punie de 5 ans de détention et d'une amende de 750 $."
  },
  {
    "id": "ART205",
    "article": "Art. 205",
    "chefAccusation": "Provocation au suicide",
    "categorie": "Délit majeur",
    "amendeBase": 750,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 205 - Provocation au suicide\n205-1 Définition : La provocation au suicide se définit comme le fait de provoquer, d’aider, d’inciter ou d’assister une personne à se donner la mort.\n205-2 Peine : La provocation au suicide est punie de 5 ans de détention et d'une amende de 750 $.\n205-2-1 Circonstances aggravantes :\nLa peine est majorée de 25 ans de détention et de 12 500 $ d'amende lorsque la provocation, l'aide, l'incitation ou l'assistance entraîne la mort de la victime."
  },
  {
    "id": "ART211_3",
    "article": "Art. 211-3",
    "chefAccusation": "Non-signalement d’une suspicion de trafic d’organes par un professionnel de santé",
    "categorie": "Délit majeur",
    "amendeBase": 20000,
    "peineBaseMinutes": 5,
    "specialBase": "Interdiction d’exercer jusqu’à 10 ans",
    "legalExcerpt": "Article 211 - Trafic d'organe\n211-1 Définition : Le trafic d'organe est défini comme toute activité visant à acheter, vendre, échanger, transporter ou faciliter la transplantation d'organes humains obtenus illégalement.\n211-2 Peine : Le trafic d'organe est puni de 15 ans de détention et d'une amende de 25 000 $.\n211-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 12 500 $ d'amende si le trafic implique une personne âgée, une personne en situation de handicap ou toute autre personne particulièrement vulnérable.\nLa peine est majorée de 10 ans de détention et de 30 000 $ d'amende si le trafic implique un ou plusieurs mineurs.\n211-3 Obligations des professionnels de santé : Les professionnels de santé doivent signaler aux autorités toute suspicion de trafic d'organes. Le non-respect de cette obligation est puni de 5 ans de détention, 20 000 $ d'amende, et d'une interdiction d'exercer pouvant aller jusqu'à 10 ans."
  },
  {
    "id": "ART309",
    "article": "Art. 309",
    "chefAccusation": "Participation à une fusillade",
    "categorie": "Délit majeur",
    "amendeBase": 1500,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 309 - Participation à une fusillade\n309-1 Définition : La participation à une fusillade consiste à prendre part activement ou intentionnellement à un échange de coups de feu mettant en danger la vie ou l'intégrité physique d'autrui.\n309-2 Peine : La participation à une fusillade est punie de 10 ans de détention et d'une amende de 1 500 $.\n309-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 2 000 $ d'amende si la fusillade a lieu dans un espace public particulièrement fréquenté.\nLa peine est majorée de 10 ans de détention et de 2 500 $ d'amende si la fusillade a lieu dans une école, un établissement accueillant habituellement des mineurs ou un lieu de culte."
  },
  {
    "id": "ART310_2_3",
    "article": "Art. 310-2-3",
    "chefAccusation": "Trafic d’êtres humains et aide à l’immigration illégale",
    "categorie": "Délit majeur",
    "amendeBase": 15000,
    "peineBaseMinutes": 10,
    "specialBase": "Peines maximales",
    "legalExcerpt": "Article 310 - Violation des lois de l’immigration\n310-1 Définition : La violation des lois de l'immigration inclut l’entrée, le séjour ou le travail sur le territoire sans autorisations légales, ou en violation des conditions imposées par les autorités compétentes.\n310-2 Peine :\n310-2-1 Entrée illégale : L'entrée illégale sur le territoire est passible d'une peine d'emprisonnement allant jusqu'à 6 mois et d'une amende pouvant atteindre 750$.\n310-2-2 Séjour illégal : Le séjour sans titre de séjour valide est passible d'une peine d'emprisonnement allant jusqu'à 1 an et d'une amende pouvant atteindre 1250 $.\n310-2-3 Trafic d'êtres humains et aide à l'immigration illégale : Toute personne qui facilite, organise ou participe au transport illégal de personnes à travers les frontières est passible d'une peine d'emprisonnement allant jusqu'à 10 ans et d'une amende pouvant atteindre 15 000 $."
  },
  {
    "id": "ART311",
    "article": "Art. 311",
    "chefAccusation": "Outrage à la justice",
    "categorie": "Délit majeur",
    "amendeBase": 2500,
    "peineBaseMinutes": 1,
    "specialBase": "",
    "legalExcerpt": "Article 311 - Outrage à la justice\n311-1 Définition : Constitue un outrage à la justice les gestes, menaces, écrits ou images de toute nature, adressés à une personne dépositaire de l'autorité publique dans l'exercice ou à l'occasion de ses missions, de nature à porter atteinte à sa dignité ou au respect dû à sa fonction.\n311-2 Peine : L'outrage à la justice est puni d'1 an de détention et d'une amende de 2500 $.\n311-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 750 $ d'amende si l'outrage est commis publiquement ou diffusé par un moyen de communication accessible au public.\nLa peine est majorée de 4 ans de détention et de 1500 $ d'amende si l'outrage est accompagné de violences."
  },
  {
    "id": "ART312",
    "article": "Art. 312",
    "chefAccusation": "Parjure",
    "categorie": "Délit majeur",
    "amendeBase": 10000,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 312 - Parjure\n312-1 Définition : Le parjure est le fait de fournir un témoignage mensonger sous serment devant une juridiction.\n312-2 Peine : Le parjure est puni de 5 ans de détention et d'une amende de 10000 $.\n312-2-1 Exceptions : Le silence ou la déclaration de non-culpabilité par un témoin ou accusé en état d'arrestation ne peut être considéré comme parjure."
  },
  {
    "id": "ART315",
    "article": "Art. 315",
    "chefAccusation": "Entrave à une opération de police",
    "categorie": "Délit majeur",
    "amendeBase": 1250,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 315 - Entrave à une opération de police\n315-1 Définition : L'entrave à une opération de police consiste à gêner, empêcher, retarder ou compromettre volontairement l'action des forces de l'ordre dans l'exercice de leurs fonctions, notamment lors d'un contrôle, d'une arrestation, d'une enquête, d'une perquisition, d'une intervention d'urgence ou de la sécurisation d'une scène.\n315-2 Peine : L'entrave à une opération de police est punie de 5 ans de détention et d'une amende de 1250 $.\n315-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 400 $ d'amende si l'entrave est commise en réunion ou avec la participation de plusieurs personnes.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'entrave est accompagnée de menaces ou d'intimidations à l'encontre des forces de l'ordre.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'entrave est accompagnée de violences à l'encontre des forces de l'ordre.\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si l'entrave permet ou vise à permettre la fuite d'un suspect ou l'évasion d'une personne légalement détenue.\nLa peine est majorée de 4 ans de détention et de 750 $ d'amende si l'entrave compromet gravement une enquête, une arrestation ou la préservation de preuves."
  },
  {
    "id": "ART316",
    "article": "Art. 316",
    "chefAccusation": "Recel",
    "categorie": "Délit majeur",
    "amendeBase": 1000,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 316 - Recel\n316-1 Définition : Le recel consiste à détenir, dissimuler, transporter, utiliser, vendre, transmettre ou bénéficier sciemment d'un bien, d'une somme d'argent ou de tout autre objet provenant d'un crime ou d'un délit.\n316-2 Peine : Le recel est puni de 5 ans de détention et d'une amende de 1000 $.\n316-2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si le recel est commis dans le cadre d'une activité habituelle ou organisée.\nLa peine est majorée de 4 ans de détention et de 1000 $ d'amende si le recel est réalisé au profit d'une organisation criminelle.\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si le recel porte sur des armes, des explosifs ou des matériels dangereux.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si le recel porte sur des biens appartenant à l'État, aux forces de l'ordre ou aux services d'urgence.\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si le recel porte sur le produit direct d'un crime."
  },
  {
    "id": "ART317",
    "article": "Art. 317",
    "chefAccusation": "Usurpation d’identité",
    "categorie": "Délit majeur",
    "amendeBase": 500,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 317 - Usurpation d'identité\n317-1 Définition : L'usurpation d'identité consiste à utiliser l'identité d'un tiers ou à faire usage de données permettant d'identifier une personne en vue de troubler sa tranquillité ou de porter atteinte à son honneur ou à sa considération.\n317-2 Peine : L'usurpation d'identité est punie de 5 ans de détention et d'une amende de 500 $.\n317-2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'identité usurpée est utilisée afin de commettre un délit.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'identité usurpée est utilisée afin de commettre un crime."
  },
  {
    "id": "ART318",
    "article": "Art. 318",
    "chefAccusation": "Usurpation de fonction",
    "categorie": "Délit majeur",
    "amendeBase": 1250,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 318 - Usurpation de fonction\n318-1 Définition : L'usurpation de fonction consiste à se présenter, agir ou se faire passer volontairement pour une personne investie d'une fonction publique, d'une mission de service public ou d'une profession réglementée, sans en avoir la qualité, les pouvoirs ou l'autorisation légale.\n318-2 Peine : L'usurpation de fonction est punie de 5 ans de détention et d'une amende de 1250 $.\n318-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 400 $ d'amende si l'usurpation est commise au moyen d'un uniforme, d'un insigne, d'un badge, d'un véhicule ou d'un équipement officiel.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'usurpation est réalisée afin d'obtenir un avantage financier, matériel ou personnel.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'usurpation porte atteinte aux droits ou à la liberté d'une personne.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'auteur se fait passer pour un membre des forces de l'ordre, de la justice, des services de secours ou d'une autorité gouvernementale."
  },
  {
    "id": "ART319",
    "article": "Art. 319",
    "chefAccusation": "Faux et usage de faux",
    "categorie": "Délit majeur",
    "amendeBase": 1500,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 319 - Faux et usage de faux\n319 -1 Définition : Constitue un faux, toute altération frauduleuse de la vérité par quelque moyen que ce soit, dans un écrit ou tout autre support d'expression de la pensée, ayant pour effet d'établir la preuve d'un droit ou d'un fait ayant des conséquences juridiques.\n319 -2 Peine : Le faux et usage de faux est puni de 5 ans de détention et d'une amende de 1500 $.\n319 -2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si le faux est commis afin d'obtenir un avantage financier, matériel ou juridique significatif.\nLa peine est majorée de 5 ans de détention et de 1250$ d'amende si le faux est commis dans l'exercice ou sous couvert d'une fonction publique."
  },
  {
    "id": "ART321",
    "article": "Art. 321",
    "chefAccusation": "Atteinte à la liberté individuelle (abus de pouvoir)",
    "categorie": "Délit majeur",
    "amendeBase": 1250,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 321- Atteintes à la liberté individuelle (abus de pouvoir)\n321-1 Définition : L’abus de pouvoir est le fait, par une personne représentant la loi ou la justice, d’ordonner ou d’accomplir arbitrairement un acte attentatoire à la liberté individuelle, dans l’exercice de ses fonctions.\n322-2 Peine : L'abus de pouvoir est puni de 5 ans de détention et d'une amende de 1250 $.\n321-2-1 Circonstances aggravantes :\nLa peine est majorée de 10 ans de détention et de 2500 $ d'amende si l'abus de pouvoir cause un préjudice grave à la victime."
  },
  {
    "id": "ART322",
    "article": "Art. 322",
    "chefAccusation": "Atteinte au secret professionnel",
    "categorie": "Délit majeur",
    "amendeBase": 1250,
    "peineBaseMinutes": 2,
    "specialBase": "",
    "legalExcerpt": "Article 322 - Atteinte au secret professionnel\n322-1 Définition : L’atteinte au secret professionnel est la révélation, par une personne dépositaire d’une information à caractère secret en raison de sa profession ou de sa fonction, de cette information à des tiers non autorisés.\n322-2 Peine : L'atteinte au secret professionnel est punie de 2 ans de détention et d'une amende de 1250 $.\n322-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si la divulgation entraîne des conséquences graves pour les parties concernées."
  },
  {
    "id": "ART323",
    "article": "Art. 323",
    "chefAccusation": "Exercice illégal du droit",
    "categorie": "Délit majeur",
    "amendeBase": 5000,
    "peineBaseMinutes": 2,
    "specialBase": "",
    "legalExcerpt": "Article 323 - Exercice illégal du droit\n323-1 Définition : Constitue un exercice illégal du droit le fait, pour toute personne n’étant pas avocat inscrit au Barreau de San Andreas, d’assister ou représenter des parties devant les juridictions et organismes juridictionnels ou disciplinaires.\n323-2 Peine : L'exercice illégal du droit est puni de 2 ans de détention et d'une amende de 5000 $.\n323-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 7500 $ d'amende si l'exercice illégal du droit cause un préjudice significatif aux parties représentées."
  },
  {
    "id": "ART402",
    "article": "Art. 402",
    "chefAccusation": "Possession non autorisée d’équipement gouvernemental",
    "categorie": "Délit majeur",
    "amendeBase": 1750,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 402 - Possession non autorisée d'équipement gouvernemental\n402-1 Définition : La possession non autorisée d'équipement gouvernemental consiste à détenir, transporter, utiliser, dissimuler ou conserver sans autorisation légitime un équipement, un uniforme, un badge, une arme, un document officiel, un moyen de communication ou tout autre matériel réservé à l'usage exclusif des administrations publiques, des forces de l'ordre, des services de secours, des forces armées ou de toute autre autorité gouvernementale.\n402-2 Peine : La possession non autorisée d'équipement gouvernemental est punie de 5 ans de détention et d'une amende de 1750 $.\n402-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 400 $ d'amende si l'infraction est commise par plusieurs personnes agissant de concert.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'équipement détenu est un badge, une carte professionnelle, un uniforme ou tout autre élément permettant de se faire passer pour un agent public.\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'équipement est détenu afin de faciliter la commission d'un délit.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'équipement est détenu afin de faciliter la commission d'un crime.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'infraction porte sur une arme de service, des munitions ou un équipement tactique.\nLa peine est majorée de 7 ans de détention et de 2000 $ d'amende si l'infraction porte sur du matériel classifié, confidentiel ou particulièrement sensible."
  },
  {
    "id": "ART403",
    "article": "Art. 403",
    "chefAccusation": "Braquage",
    "categorie": "Délit majeur",
    "amendeBase": 150,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 403 - Le braquage\n403-1 Définition : Le braquage est le fait de dérober un bien, de l'argent ou des informations confidentielles en utilisant la force, l'intimidation, ou la menace d'une arme, dans des lieux tels que les banques, convois de fonds ou commerces.\n403-2 Peine : Le braquage est puni de 5 ans de détention et d'une amende de 150$.\n403-2-1 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 100$ d'amende si le braquage vise un distributeur automatique de billets (ATM).\nLa peine est majorée de 5 ans de détention et de 200 $ d'amende si le braquage vise une supérette ou un commerce de proximité.\nLa peine est majorée de 10 ans de détention et de 2850 $ d'amende si le braquage vise une agence bancaire Fleeca.\nLa peine est majorée de 15 ans de détention et de 4000 $ d'amende si le braquage vise un fourgon blindé de transport de fonds, notamment un fourgon Brinks.\nLa peine est majorée de 20 ans de détention et de 4850 $ d'amende si le braquage vise une bijouterie.\nLa peine est majorée de 20 ans de détention et de 29850 $ d'amende si le braquage vise la Pacific Bank."
  },
  {
    "id": "ART404",
    "article": "Art. 404",
    "chefAccusation": "Extorsion",
    "categorie": "Délit majeur",
    "amendeBase": 1250,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 404 - L’extorsion\n404 -1 Définition : L’extorsion consiste à obtenir des biens, des services, des avantages ou des immunités en exerçant une pression ou en utilisant la coercition sur une autre personne.\n404 -2 Peine : L'extorsion est punie de 10 ans de détention et d'une amende de 1250 $.\n404 -2-1 Circonstances aggravantes :\nLa peine est majorée de 3 ans de détention et de 750 $ d'amende si l'extorsion vise un mineur, une personne âgée, une personne en situation de handicap ou toute autre personne particulièrement vulnérable.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'extorsion est accompagnée de violences physiques."
  },
  {
    "id": "ART405",
    "article": "Art. 405",
    "chefAccusation": "Escroquerie",
    "categorie": "Délit majeur",
    "amendeBase": 750,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 405 - L’escroquerie\n405-1 Définition : L'escroquerie est le fait, par des manœuvres frauduleuses, de tromper une personne et de la pousser à remettre des fonds, des valeurs ou des biens quelconques, ou à fournir un service, au détriment de celle-ci ou d'un tiers.\n405-2 Peine : L'escroquerie est punie de 10 ans de détention et d'une amende de 750 $.\n405-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si l'escroquerie porte sur des biens, des fonds ou des services d'une valeur particulièrement élevée.\nLa peine est majorée de 10 ans de détention et de 1500 $ d'amende si l'escroquerie est préparée ou commise au profit d'une organisation criminelle."
  },
  {
    "id": "ART407",
    "article": "Art. 407",
    "chefAccusation": "Incendie criminel (ARSON)",
    "categorie": "Délit majeur",
    "amendeBase": 3500,
    "peineBaseMinutes": 15,
    "specialBase": "",
    "legalExcerpt": "Article 407 - Incendie criminel (ARSON)\n407-1 Définition : L'incendie criminel consiste à provoquer volontairement un incendie, une explosion ou tout autre sinistre susceptible de détruire, dégrader ou endommager un bien immobilier, un véhicule, une infrastructure, un terrain ou tout autre bien appartenant à autrui ou à l'État\n407-2 Peine : L'incendie criminel est puni de 15 ans de détention et d'une amende de 3500 $\n407-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si l'incendie est commis afin de dissimuler un autre délit ou crime.\nLa peine est majorée de 10 ans de détention et de 2500 $ d'amende si l'incendie est commis au profit d'une organisation criminelle.\nLa peine est majorée de 10 ans de détention et de 4000 $ d'amende si l'incendie vise un bâtiment public, gouvernemental ou une infrastructure critique.\nLa peine est majorée de 15 ans de détention et de 4000 $ d'amende si l'incendie est commis dans un bâtiment occupé ou susceptible d'être occupé.\nLa peine est majorée de 15 ans de détention et de 5000 $ d'amende si l'incendie met directement en danger la vie d'une ou de plusieurs personnes.\nLa peine est majorée de 25 ans de détention et de 6000 $ d'amende si l'incendie entraîne des blessures graves."
  },
  {
    "id": "ART701_3_2",
    "article": "Art. 701-3-2",
    "chefAccusation": "Acquisition non réglementaire d’armes de catégorie B",
    "categorie": "Délit majeur",
    "amendeBase": 2000,
    "peineBaseMinutes": 2,
    "specialBase": "",
    "legalExcerpt": "Article 701 - Réglementation des Armes par Catégorie\n701-1 Définition : Est considérée comme arme tout objet conçu pour tuer, blesser ou menacer une personne.\n701-2 Catégories :\nCatégorie D : Armes en vente libre (gazeuse, couteau, matraque, etc.).\nCatégorie C : Armes soumises à déclaration (Flare Gun, Taser, gilet par balle etc.).\nCatégorie B : Armes soumises à autorisation du Gouvernement (Revolver, armes de poing, fusils de chasse, fusils à pompe).\nCatégorie A : Armes prohibées (armes de guerre, explosifs).\n701-3 Peines :\n701-3-1 : Acquisition non réglementaire d'armes de catégorie C : 1 ans de détention et 1250 $ d'amende.\n701-3-2 : Acquisition non réglementaire d'armes de catégorie B : 2 ans de détention et 2000 $ d'amende."
  },
  {
    "id": "ART704",
    "article": "Art. 704",
    "chefAccusation": "Vente illégale d’une arme à feu",
    "categorie": "Délit majeur",
    "amendeBase": 5000,
    "peineBaseMinutes": 0,
    "specialBase": "",
    "legalExcerpt": "Article 704 - Vente illégale d’une arme à feu\n704-1 Définition : Constitue une vente illégale d’arme à feu le fait de vendre, céder ou échanger, à titre onéreux, une arme de catégorie A, B ou C sans respecter les autorisations, déclarations ou procédures légales requises.\nLa présente infraction s’applique à une cession ponctuelle. Lorsque les faits sont répétés, organisés ou destinés à alimenter un réseau criminel, ils sont qualifiés de trafic d’armes conformément à l’article 702.\n704-2 Peine : La vente illégale d’une arme à feu est punie de 2 ans de détention et de 7 500 $ d’amende.\n702-3 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 10000 $ d’amende si le trafic implique une ou plusieurs armes de catégorie B.\nLa peine est majorée de 5 ans de détention et de 20000 $ d’amende si le trafic implique une ou plusieurs armes de catégorie A."
  },
  {
    "id": "ART802_TRAFIC",
    "article": "Art. 802",
    "chefAccusation": "Trafic de stupéfiants — instigateur",
    "categorie": "Délit majeur",
    "amendeBase": 3500,
    "peineBaseMinutes": 20,
    "specialBase": "",
    "legalExcerpt": "Article 802 - Vente et Production Illicite de Stupéfiants\n802-1 Définition : Le trafic de drogue inclut la vente, la production, l'importation ou l'exportation illicite de stupéfiants.\n802-2 Peine : Le trafic de stupéfiants est puni de 20 ans de détention et de 3500 $ d'amende pour l'instigateur. Le revendeur est puni d'une amende de 25 $ par pochon.\n802-3 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si le trafic implique ou exploite une personne particulièrement vulnérable.\nLa peine est majorée de 10 ans de détention et de 4000 $ d'amende si le trafic implique ou exploite un mineur.\nLa peine est majorée de 5 ans de détention et de 2500 $ d'amende si l'auteur participe à un réseau organisé de trafic. Les biens utilisés ou obtenus dans le cadre du trafic peuvent être confisqués.\nLa peine est majorée de 10 ans de détention et de 5000 $ d'amende si l'auteur dirige, organise ou finance un réseau de trafic. Les biens utilisés ou obtenus dans le cadre du trafic peuvent être confisqués."
  },
  {
    "id": "IRS_BLANCHIMENT",
    "article": "IRS",
    "chefAccusation": "Blanchiment",
    "categorie": "Crime",
    "amendeBase": 1,
    "peineBaseMinutes": 12,
    "specialBase": "5 $ × quantité saisie"
  },
  {
    "id": "IRS_FRAUDE_FISCALE",
    "article": "IRS",
    "chefAccusation": "Fraude fiscale",
    "categorie": "Crime",
    "amendeBase": 12500,
    "peineBaseMinutes": 20,
    "specialBase": "Remboursement du préjudice"
  },
  {
    "id": "ART201",
    "article": "Art. 201",
    "chefAccusation": "Meurtre au premier degré (assassinat)",
    "categorie": "Crime",
    "amendeBase": 25000,
    "peineBaseMinutes": 70,
    "specialBase": "Prison fédérale",
    "legalExcerpt": "Article 201 - Meurtre au premier degré (Assassinat)\n201-1 Définition : Le meurtre au premier degré consiste à tuer volontairement un être humain avec préméditation ou en préparant l’acte de manière quelconque.\n201-2 Peine : Le meurtre au premier degré est puni de 70 ans de détention en prison fédérale et d'une amende de 25 000 $.\n201-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 1 250 $ d'amende si le meurtre est commis sur une personne particulièrement vulnérable.\nLa peine est majorée de 10 ans de détention et de 3 000 $ d'amende si le meurtre est commis pendant l'accomplissement d'un cambriolage.\nLa peine est majorée de 15 ans de détention et de 4 000 $ d'amende si le meurtre est commis pendant l'accomplissement d'un vol.\nLa peine est majorée de 20 ans de détention et de 5 000 $ d'amende si le meurtre est commis pendant l'accomplissement d'un incendie criminel.\nLa peine est majorée de 25 ans de détention et de 6 000 $ d'amende si le meurtre est commis pendant l'accomplissement d'un enlèvement.\nLa peine est majorée de 25 ans de détention et de 7 500 $ d'amende si le meurtre est commis dans le cadre d'un abus de pouvoir."
  },
  {
    "id": "ART202",
    "article": "Art. 202",
    "chefAccusation": "Meurtre au second degré (homicide volontaire)",
    "categorie": "Crime",
    "amendeBase": 15000,
    "peineBaseMinutes": 50,
    "specialBase": "Prison fédérale",
    "legalExcerpt": "Article 202 - Meurtre au second degré (Homicide volontaire)\n202-1 Définition : Le meurtre au second degré est défini comme l’acte de tuer un être humain sans préméditation.\n202-2 Peine : Le meurtre au second degré est puni de 50 ans de détention en prison fédérale et d'une amende de 15 000 $."
  },
  {
    "id": "ART203",
    "article": "Art. 203",
    "chefAccusation": "Homicide involontaire",
    "categorie": "Crime",
    "amendeBase": 5000,
    "peineBaseMinutes": 20,
    "specialBase": "",
    "legalExcerpt": "Article 203 - Homicide involontaire\n203-1 Définition : L’homicide involontaire est commis lorsqu'une personne cause la mort d’autrui par maladresse, imprudence, inattention, négligence ou manquement à une obligation de prudence ou de sécurité imposée par la loi ou le règlement.\n203-2 Peine : L'homicide involontaire est puni de 20 ans de détention et d'une amende de 5 000 $."
  },
  {
    "id": "ART207",
    "article": "Art. 207",
    "chefAccusation": "Séquestration",
    "categorie": "Crime",
    "amendeBase": 3500,
    "peineBaseMinutes": 15,
    "specialBase": "",
    "legalExcerpt": "Article 207 - Séquestration\n207-1 Définition : La séquestration est l’infraction consistant à priver illégalement une personne de sa liberté de déplacement, avec ou sans l’usage de menace, intimidation ou force.\n207-2 Peine : La séquestration est punie de 15 ans de détention et d'une amende de 3 500 $.\n207-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si le séquestreur est armé.\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si la séquestration est commise afin de faciliter un vol.\nLa peine est majorée de 7 ans de détention et de 1 250 $ d'amende si la victime subit une blessure corporelle.\nLa peine est majorée de 10 ans de détention et de 1 500 $ d'amende si la séquestration est commise afin de faciliter un crime.\nLa peine est majorée de 10 ans de détention et de 1 500 $ d'amende si la séquestration est commise afin d'interférer avec une fonction gouvernementale ou politique.\nLa peine est majorée de 10 ans de détention et de 1 500 $ d'amende si la séquestration est commise dans le but de terroriser la victime."
  },
  {
    "id": "ART208",
    "article": "Art. 208",
    "chefAccusation": "Kidnapping",
    "categorie": "Crime",
    "amendeBase": 3000,
    "peineBaseMinutes": 20,
    "specialBase": "",
    "legalExcerpt": "Article 208 - Kidnapping\n208-1 Définition : Le kidnapping consiste à capturer, transporter, déplacer ou retenir une personne contre sa volonté, par la force, la menace, la contrainte, la fraude ou la tromperie, en vue de la priver de sa liberté ou de l'éloigner de son lieu de résidence, de travail ou de toute autre localisation où elle se trouvait légitimement.\n208-2 Peine : Le kidnapping est puni de 20 ans de détention et d'une amende de 3 000 $.\n208-2-1 Circonstances aggravantes :\nLa peine est majorée de 10 ans de détention et de 2 500 $ d'amende si l'enlèvement est réalisé dans le but d'obtenir une rançon, une contrepartie financière ou un avantage quelconque.\nLa peine est majorée de 15 ans de détention et de 4 000 $ d'amende si l'enlèvement est commis à l'encontre d'un fonctionnaire public, d'un élu ou d'un membre des forces de l'ordre dans l'exercice de ses fonctions.\nLa peine est majorée de 20 ans de détention et de 5 000 $ d'amende si l'enlèvement est commis à l'encontre d'un mineur.\nLa peine est majorée de 25 ans de détention et de 6 000 $ d'amende si l'enlèvement est accompagné de violences graves.\nLa peine est majorée de 30 ans de détention et de 7 500 $ d'amende si l'enlèvement est accompagné d'actes de torture.\nLa peine est majorée de 50 ans de détention et de 12 500 $ d'amende si l'enlèvement entraîne la mort de la victime. La réclusion à perpétuité peut également être prononcée."
  },
  {
    "id": "ART209",
    "article": "Art. 209",
    "chefAccusation": "Torture",
    "categorie": "Crime",
    "amendeBase": 5000,
    "peineBaseMinutes": 15,
    "specialBase": "",
    "legalExcerpt": "Article 209 - Torture\n209-1 Définition : La torture inclut tout acte infligeant intentionnellement une douleur ou des souffrances aiguës physiques ou mentales à une personne.\n209-2 Peine : L'acte de torture est puni de 15 ans de détention et d'une amende de 5 000 $.\n209-2-1 Circonstances aggravantes :\nLa peine est majorée de 20 ans de détention et de 6 250 $ d'amende lorsque les actes de torture présentent une gravité extrême en raison de leur durée, de leur répétition ou des séquelles irréversibles causées à la victime.\nLa peine est majorée de 35 ans de détention et de 12 500 $ d'amende lorsque les actes de torture entraînent la mort de la victime. La peine de mort peut également être prononcée par la juridiction compétente."
  },
  {
    "id": "ART210",
    "article": "Art. 210",
    "chefAccusation": "Vol d’organe",
    "categorie": "Crime",
    "amendeBase": 12500,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 210- Vol d'organe\n210-1 Définition : Le vol d'organe est défini comme l'extraction non consentie d'un organe, d'un tissu ou d'une partie du corps d'une personne vivante ou décédée.\n210-2 Peine : Le vol d'organe est puni de 10 ans de détention et d'une amende de 12 500 $.\n210-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 6 000 $ d'amende si la victime est une personne âgée ou une personne en situation de handicap.\nLa peine est majorée de 10 ans de détention et de 10 000 $ d'amende si la victime est mineure.\nLa peine est majorée de 15 ans de détention et de 12 500 $ d'amende si l'extraction entraîne des blessures graves.\nLa peine est majorée de 30 ans de détention et de 30 000 $ d'amende si l'extraction entraîne la mort de la victime."
  },
  {
    "id": "ART211",
    "article": "Art. 211",
    "chefAccusation": "Trafic d’organe",
    "categorie": "Crime",
    "amendeBase": 25000,
    "peineBaseMinutes": 15,
    "specialBase": "",
    "legalExcerpt": "Article 211 - Trafic d'organe\n211-1 Définition : Le trafic d'organe est défini comme toute activité visant à acheter, vendre, échanger, transporter ou faciliter la transplantation d'organes humains obtenus illégalement.\n211-2 Peine : Le trafic d'organe est puni de 15 ans de détention et d'une amende de 25 000 $.\n211-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 12 500 $ d'amende si le trafic implique une personne âgée, une personne en situation de handicap ou toute autre personne particulièrement vulnérable.\nLa peine est majorée de 10 ans de détention et de 30 000 $ d'amende si le trafic implique un ou plusieurs mineurs.\n211-3 Obligations des professionnels de santé : Les professionnels de santé doivent signaler aux autorités toute suspicion de trafic d'organes. Le non-respect de cette obligation est puni de 5 ans de détention, 20 000 $ d'amende, et d'une interdiction d'exercer pouvant aller jusqu'à 10 ans."
  },
  {
    "id": "ART313",
    "article": "Art. 313",
    "chefAccusation": "Évasion",
    "categorie": "Crime",
    "amendeBase": 4000,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 313 - Évasion\n313-1 Définition : L’évasion est définie comme le fait, pour un détenu, de se soustraire à la garde à laquelle il est soumis.\n313-2 Peine : L'évasion est punie de 10 ans de détention et d'une amende de 4000 $.\n313-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si l'évasion est réalisée par effraction.\nLa peine est majorée de 7 ans de détention et de 2000 $ d'amende si l'évasion est facilitée par un acte de corruption.\nLa peine est majorée de 10 ans de détention et de 2500 $ d'amende si l'évasion est réalisée par violence ou menace de violence."
  },
  {
    "id": "ART314",
    "article": "Art. 314",
    "chefAccusation": "Obstruction à la justice",
    "categorie": "Crime",
    "amendeBase": 4000,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 314 - Obstruction à la justice\n314-1 Définition : L’obstruction à la justice consiste à receler, cacher, modifier ou détruire une preuve ou un individu dans le cadre d'une enquête ou d'un jugement.\n314-2 Peine : L'obstruction à la justice est punie de 10 ans de détention et d'une amende de 4000 $.\n314-2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si l'obstruction est commise afin d'aider une personne recherchée à échapper aux autorités.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si l'obstruction compromet gravement une enquête, une procédure judiciaire ou la conservation de preuves."
  },
  {
    "id": "ART320",
    "article": "Art. 320",
    "chefAccusation": "Corruption",
    "categorie": "Crime",
    "amendeBase": 5000,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 320 - La corruption\n320 -1 Définition : La corruption consiste à proposer ou accepter, directement ou indirectement, des avantages quelconques en échange de l’accomplissement ou de l’abstention d’un acte dans le cadre d’une fonction publique ou d’un mandat électif.\n320 -2 Peine : La corruption est punie de 10 ans de détention et d'une amende de 5000 $.\n320 -2-1 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 1500 $ d'amende si la corruption porte sur des informations couvertes par le secret d'une enquête ou d'une procédure judiciaire.\nLa peine est majorée de 10 ans de détention et de 4000$ d'amende si la corruption implique un haut responsable public, judiciaire ou gouvernemental."
  },
  {
    "id": "ART501",
    "article": "Art. 501",
    "chefAccusation": "Privatisation des libertés",
    "categorie": "Crime",
    "amendeBase": 25000,
    "peineBaseMinutes": 25,
    "specialBase": "",
    "legalExcerpt": "Article 501 - Privation des libertés\n501-1 Définition : La privation des libertés consiste à restreindre ou abolir les droits fondamentaux d'individus ou de groupes par des moyens illégaux, tels que la censure, l’arrestation arbitraire ou l'interdiction de manifestations pacifiques.\n501-2 Peine : La privatisation des libertés est punie de 25 ans de détention et d'une amende de 25000 $.\n501-2-1 Circonstances aggravantes :\nLa peine est majorée de 15 ans de détention et de 12500 $ d'amende si l'acte est commis afin de réprimer une opposition politique.\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si l'acte est commis afin de maintenir ou d'établir un pouvoir illégitime."
  },
  {
    "id": "ART502",
    "article": "Art. 502",
    "chefAccusation": "Séparatisme (concernant des civils)",
    "categorie": "Crime",
    "amendeBase": 62500,
    "peineBaseMinutes": 100,
    "specialBase": "",
    "legalExcerpt": "Article 502 - Séparatisme\n502-1 Définition : Le séparatisme est la volonté d'un groupe d'individus ou d'une entité territoriale de se détacher politiquement et administrativement d'une collectivité à laquelle ils appartiennent, par des moyens non constitutionnels.\n502-2 Peine : Le séparatisme est puni de 100 ans de détention et d'une amende de 62500 $ lorsqu'il concerne des civils.\n502-2-1 Circonstances aggravantes :\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si l'auteur est le dirigeant ou le responsable d'une ville, d'un comté ou d'un État.\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si la tentative de séparation est imposée par la force.\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si les faits menacent directement l'intégrité territoriale nationale.\nLorsque ces trois circonstances sont réunies, la peine de mort peut être prononcée par la juridiction compétente."
  },
  {
    "id": "ART503",
    "article": "Art. 503",
    "chefAccusation": "Coup d’État",
    "categorie": "Crime",
    "amendeBase": 125000,
    "peineBaseMinutes": 100,
    "specialBase": "",
    "legalExcerpt": "Article 503 - Coup d'État\n503-1 Définition : Un coup d'État est la prise de pouvoir dans une ville, un comté ou un État par une minorité en utilisant des moyens non constitutionnels, imposée par surprise et recourant à la force.\n503-2 Peine : Le coup d'État est puni de 100 ans de détention et d'une amende de 125000 $.\n503-2-1 Circonstances aggravantes :\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si le coup d'État provoque une déstabilisation grave et durable de l'ordre public ou des institutions.\nLa peine est majorée de 50 ans de détention et de 62500 $ d'amende si le coup d'État provoque des pertes humaines importantes. La peine de mort peut également être prononcée."
  },
  {
    "id": "ART601",
    "article": "Art. 601",
    "chefAccusation": "Terrorisme",
    "categorie": "Crime",
    "amendeBase": 62500,
    "peineBaseMinutes": 100,
    "specialBase": "",
    "legalExcerpt": "Article 601 - Définition et Sanctions du Terrorisme\n601-1 Définition : Est constitutif d’un acte de terrorisme tout acte criminel commis dans le but de troubler gravement l'ordre public par l'intimidation ou la terreur, y compris les atteintes volontaires à la vie, les atteintes à l'intégrité de la personne, l'enlèvement, la séquestration, le détournement de moyens de transport, et les destructions.\n601-2 Peine : L'acte de terrorisme est puni de 100 ans de détention et 62500 $ d'amende.\n601-3 Circonstances aggravantes :\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si l'acte terroriste vise une école, un établissement de santé, un bâtiment gouvernemental ou une infrastructure critique.\nLa peine est majorée de 25 ans de détention et de 25000 $ d'amende si l'acte terroriste est commis au moyen d'explosifs, de substances incendiaires, chimiques ou de tout autre moyen susceptible de provoquer des victimes en nombre.\nLa peine est majorée de 30 ans de détention et de 37500 $ d'amende si l'acte terroriste entraîne des blessures graves sur plusieurs victimes.\nLa peine est majorée de 50 ans de détention et de 62500 $ d'amende si l'acte terroriste entraîne la mort d'une ou de plusieurs personnes. La peine de mort peut également être prononcée."
  },
  {
    "id": "ART602",
    "article": "Art. 602",
    "chefAccusation": "Association de malfaiteurs",
    "categorie": "Crime",
    "amendeBase": 1250,
    "peineBaseMinutes": 10,
    "specialBase": "",
    "legalExcerpt": "Article 602 - Constitution et Sanctions de l'Association de Malfaiteurs\n602-1 Définition : Constitue une association de malfaiteurs tout groupement formé ou toute entente établie en vue de la préparation d'une ou de plusieurs infractions, caractérisée par un ou plusieurs faits matériels.\n602-2 Peine : L'association de malfaiteurs est punie de 10 ans de détention et 1250 $ d'amende.\n602-3 Circonstances aggravantes :\nLa peine est majorée de 5 ans de détention et de 750 $ d'amende si le groupement dispose d'une organisation structurée, durable ou hiérarchisée.\nLa peine est majorée de 5 ans de détention et de 1250 $ d'amende si le groupement détient ou utilise des armes, des explosifs ou du matériel dangereux.\nLa peine est majorée de 10 ans de détention et de 1500 $ d'amende si l'auteur dirige, organise ou finance le groupement.\nLa peine est majorée de 10 ans de détention et de 2500 $ d'amende si l'association est constituée en vue de préparer un ou plusieurs crimes violents."
  },
  {
    "id": "ART701_3_3",
    "article": "Art. 701-3-3",
    "chefAccusation": "Acquisition non réglementaire d’armes de catégorie A",
    "categorie": "Crime",
    "amendeBase": 4000,
    "peineBaseMinutes": 4,
    "specialBase": "",
    "legalExcerpt": "Article 701 - Réglementation des Armes par Catégorie\n701-1 Définition : Est considérée comme arme tout objet conçu pour tuer, blesser ou menacer une personne.\n701-2 Catégories :\nCatégorie D : Armes en vente libre (gazeuse, couteau, matraque, etc.).\nCatégorie C : Armes soumises à déclaration (Flare Gun, Taser, gilet par balle etc.).\nCatégorie B : Armes soumises à autorisation du Gouvernement (Revolver, armes de poing, fusils de chasse, fusils à pompe).\nCatégorie A : Armes prohibées (armes de guerre, explosifs).\n701-3 Peines :\n701-3-1 : Acquisition non réglementaire d'armes de catégorie C : 1 ans de détention et 1250 $ d'amende.\n701-3-2 : Acquisition non réglementaire d'armes de catégorie B : 2 ans de détention et 2000 $ d'amende."
  },
  {
    "id": "ART702",
    "article": "Art. 702",
    "chefAccusation": "Trafic d’armes",
    "categorie": "Crime",
    "amendeBase": 10000,
    "peineBaseMinutes": 5,
    "specialBase": "",
    "legalExcerpt": "Article 702 - Trafic d'Armes\n702-1 Définition : Le trafic d'armes est défini comme toute activité visant à confectionner, vendre, échanger, transporter ou faciliter le transfert d'armes sans les autorisations légales requises ou en dehors des circuits réglementaires.\n702-2 Peine : Le trafic d'armes est puni de 5 ans de détention et 10000 $ d'amende.\n702-3 Circonstances aggravantes :\nLa peine est majorée de 2 ans de détention et de 6000 $ d'amende si le trafic implique une ou plusieurs armes de catégorie B.\nLa peine est majorée de 5 ans de détention et de 12000 $ d'amende si le trafic implique une ou plusieurs armes de catégorie A."
  },
  {
    "id": "ART703_2",
    "article": "Art. 703-2",
    "chefAccusation": "Non-respect des obligations des commerçants d’armes",
    "categorie": "Crime",
    "amendeBase": 10000,
    "peineBaseMinutes": 0,
    "specialBase": "Suspension de licence ; amende maximale ; prison possible en cas de récidive",
    "legalExcerpt": "Article 703 - Obligations des Commerçants\n703-1 Obligations :\nLes vendeurs doivent être enregistrés auprès du Gouvernement et disposer d'une licence renouvelable tous les 3 mois.\nToute transaction doit être consignée dans un registre officiel et déclarée aux autorités dans un délai de 48 heures.\nLa vente d'armes de catégorie C et B nécessite une vérification stricte de l’identité de l’acheteur et de ses autorisations légales.\n703-2 Peine : Le non-respect des obligations peut entraîner la suspension de la licence, une amende allant jusqu'à 10000 $, ainsi que des peines de prison en cas de récidive."
  }
];

export const INITIAL_AGGRAVANTES = [
  {
    "uid": "AGG_1_ART206",
    "idInfraction": "ART206",
    "article": "206 Cir.Agg",
    "circonstance": "Traumatisme ou blessure de plus de 8 jours",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_2_ART206",
    "idInfraction": "ART206",
    "article": "206 Cir.Agg",
    "circonstance": "Mutilation ou infirmité permanente",
    "amendeSupplementaire": 2000,
    "peineSupplementaireMinutes": 16,
    "special": ""
  },
  {
    "uid": "AGG_3_ART206",
    "idInfraction": "ART206",
    "article": "206 Cir.Agg",
    "circonstance": "Décès sans intention de tuer",
    "amendeSupplementaire": 5000,
    "peineSupplementaireMinutes": 0,
    "special": ""
  },
  {
    "uid": "AGG_4_ART303",
    "idInfraction": "ART303",
    "article": "303 Cir.Agg",
    "circonstance": "Menace avec une arme",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_5_ART303",
    "idInfraction": "ART303",
    "article": "303 Cir.Agg",
    "circonstance": "Décès de la victime",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_6_ART304",
    "idInfraction": "ART304",
    "article": "304 Cir.Agg",
    "circonstance": "Mise en danger d’autrui",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 0,
    "special": ""
  },
  {
    "uid": "AGG_7_ART304",
    "idInfraction": "ART304",
    "article": "304 Cir.Agg",
    "circonstance": "Blessures causées",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_8_ART305",
    "idInfraction": "ART305",
    "article": "305 Cir.Agg",
    "circonstance": "Comportement menaçant",
    "amendeSupplementaire": 100,
    "peineSupplementaireMinutes": 0,
    "special": ""
  },
  {
    "uid": "AGG_9_ART305",
    "idInfraction": "ART305",
    "article": "305 Cir.Agg",
    "circonstance": "Entrave à une enquête",
    "amendeSupplementaire": 250,
    "peineSupplementaireMinutes": 1,
    "special": ""
  },
  {
    "uid": "AGG_10_ART306",
    "idInfraction": "ART306",
    "article": "306 Cir.Agg",
    "circonstance": "Visage dissimulé pour commettre une infraction",
    "amendeSupplementaire": 250,
    "peineSupplementaireMinutes": 1,
    "special": ""
  },
  {
    "uid": "AGG_11_ART406",
    "idInfraction": "ART406",
    "article": "406 Cir.Agg",
    "circonstance": "Intention de nuire gravement",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 0,
    "special": ""
  },
  {
    "uid": "AGG_12_ART406",
    "idInfraction": "ART406",
    "article": "406 Cir.Agg",
    "circonstance": "Bien détruit ou inutilisable",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_13_ART408",
    "idInfraction": "ART408",
    "article": "408 Cir.Agg",
    "circonstance": "Dégradations importantes",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_14_ART408",
    "idInfraction": "ART408",
    "article": "408 Cir.Agg",
    "circonstance": "Effraction suivie d’un vol",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_15_ART408",
    "idInfraction": "ART408",
    "article": "408 Cir.Agg",
    "circonstance": "Blessures causées",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 7,
    "special": ""
  },
  {
    "uid": "AGG_16_ART408",
    "idInfraction": "ART408",
    "article": "408 Cir.Agg",
    "circonstance": "Effraction pour braquage",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_17_ART212",
    "idInfraction": "ART212",
    "article": "212 Cir.Agg",
    "circonstance": "Abus d’autorité ou de confiance",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_18_ART212",
    "idInfraction": "ART212",
    "article": "212 Cir.Agg",
    "circonstance": "Victime vulnérable",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 4,
    "special": ""
  },
  {
    "uid": "AGG_19_ART212",
    "idInfraction": "ART212",
    "article": "212 Cir.Agg",
    "circonstance": "Graves conséquences physiques ou mentales",
    "amendeSupplementaire": 2000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_20_ART301",
    "idInfraction": "ART301",
    "article": "301 Cir.Agg",
    "circonstance": "Dégradation grave du domaine public",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_21_ART301",
    "idInfraction": "ART301",
    "article": "301 Cir.Agg",
    "circonstance": "Mise en danger de vies",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_22_ART302",
    "idInfraction": "ART302",
    "article": "302 Cir.Agg",
    "circonstance": "Blessures graves",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_23_ART302",
    "idInfraction": "ART302",
    "article": "302 Cir.Agg",
    "circonstance": "Décès d’une personne",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_24_ART307",
    "idInfraction": "ART307",
    "article": "307 Cir.Agg",
    "circonstance": "Menace grave à l’ordre public",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 1,
    "special": ""
  },
  {
    "uid": "AGG_25_ART307",
    "idInfraction": "ART307",
    "article": "307 Cir.Agg",
    "circonstance": "Dégradations",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_26_ART307",
    "idInfraction": "ART307",
    "article": "307 Cir.Agg",
    "circonstance": "Violences sur des personnes",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_27_ART308",
    "idInfraction": "ART308",
    "article": "308 Cir.Agg",
    "circonstance": "En réunion avec coups",
    "amendeSupplementaire": 250,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_28_ART308",
    "idInfraction": "ART308",
    "article": "308 Cir.Agg",
    "circonstance": "En réunion avec violences graves",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_29_ART308",
    "idInfraction": "ART308",
    "article": "308 Cir.Agg",
    "circonstance": "En réunion avec destructions",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 4,
    "special": ""
  },
  {
    "uid": "AGG_30_ART324",
    "idInfraction": "ART324",
    "article": "324 Cir.Agg",
    "circonstance": "Diffusion par média",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_31_ART324",
    "idInfraction": "ART324",
    "article": "324 Cir.Agg",
    "circonstance": "Fonctionnaire ou élu visé",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_32_ART324",
    "idInfraction": "ART324",
    "article": "324 Cir.Agg",
    "circonstance": "Motif discriminatoire",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_33_ART325",
    "idInfraction": "ART325",
    "article": "325 Cir.Agg",
    "circonstance": "Fonctionnaire ou élu visé",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_34_ART325",
    "idInfraction": "ART325",
    "article": "325 Cir.Agg",
    "circonstance": "Menace sous condition",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_35_ART325",
    "idInfraction": "ART325",
    "article": "325 Cir.Agg",
    "circonstance": "Groupe visé pour motif discriminatoire",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_36_ART325",
    "idInfraction": "ART325",
    "article": "325 Cir.Agg",
    "circonstance": "Menace de mort",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_37_ART401",
    "idInfraction": "ART401",
    "article": "401 Cir.Agg",
    "circonstance": "Vol en réunion",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_38_ART401",
    "idInfraction": "ART401",
    "article": "401 Cir.Agg",
    "circonstance": "Abus d’une fonction publique",
    "amendeSupplementaire": 1000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_39_ART401",
    "idInfraction": "ART401",
    "article": "401 Cir.Agg",
    "circonstance": "Dégradations associées",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_40_ART409",
    "idInfraction": "ART409",
    "article": "409 Cir.Agg",
    "circonstance": "Intention de causer des dommages",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_41_ART409",
    "idInfraction": "ART409",
    "article": "409 Cir.Agg",
    "circonstance": "Préparation d’une autre infraction",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 60,
    "special": ""
  },
  {
    "uid": "AGG_42_ART705",
    "idInfraction": "ART705",
    "article": "705 Cir.Agg",
    "circonstance": "Lieu très fréquenté",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 1,
    "special": ""
  },
  {
    "uid": "AGG_43_ART705",
    "idInfraction": "ART705",
    "article": "705 Cir.Agg",
    "circonstance": "Présence de mineurs",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_44_ART803",
    "idInfraction": "ART803",
    "article": "803 Cir.Agg",
    "circonstance": "Lieu public sensible",
    "amendeSupplementaire": 500,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_45_ART803",
    "idInfraction": "ART803",
    "article": "803 Cir.Agg",
    "circonstance": "Établissement accueillant des mineurs",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_46_ART803",
    "idInfraction": "ART803",
    "article": "803 Cir.Agg",
    "circonstance": "Quantité supérieure au seuil légal",
    "amendeSupplementaire": 1000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_47_ART803",
    "idInfraction": "ART803",
    "article": "803 Cir.Agg",
    "circonstance": "Récidive",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_48_ART205",
    "idInfraction": "ART205",
    "article": "205 Cir.Agg",
    "circonstance": "Décès de la victime",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_49_ART309",
    "idInfraction": "ART309",
    "article": "309 Cir.Agg",
    "circonstance": "Lieu public très fréquenté",
    "amendeSupplementaire": 2000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_50_ART309",
    "idInfraction": "ART309",
    "article": "309 Cir.Agg",
    "circonstance": "École, lieu pour mineurs ou lieu de culte",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_51_ART311",
    "idInfraction": "ART311",
    "article": "311 Cir.Agg",
    "circonstance": "Outrage public ou diffusé",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_52_ART311",
    "idInfraction": "ART311",
    "article": "311 Cir.Agg",
    "circonstance": "Violences associées",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 4,
    "special": ""
  },
  {
    "uid": "AGG_53_ART315",
    "idInfraction": "ART315",
    "article": "315 Cir.Agg",
    "circonstance": "Entrave en réunion",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_54_ART315",
    "idInfraction": "ART315",
    "article": "315 Cir.Agg",
    "circonstance": "Menaces contre les forces de l’ordre",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_55_ART315",
    "idInfraction": "ART315",
    "article": "315 Cir.Agg",
    "circonstance": "Violences contre les forces de l’ordre",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_56_ART315",
    "idInfraction": "ART315",
    "article": "315 Cir.Agg",
    "circonstance": "Fuite ou évasion facilitée",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_57_ART315",
    "idInfraction": "ART315",
    "article": "315 Cir.Agg",
    "circonstance": "Enquête ou arrestation gravement compromise",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 4,
    "special": ""
  },
  {
    "uid": "AGG_58_ART316",
    "idInfraction": "ART316",
    "article": "316 Cir.Agg",
    "circonstance": "Activité habituelle ou organisée",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_59_ART316",
    "idInfraction": "ART316",
    "article": "316 Cir.Agg",
    "circonstance": "Au profit d’une organisation criminelle",
    "amendeSupplementaire": 1000,
    "peineSupplementaireMinutes": 4,
    "special": ""
  },
  {
    "uid": "AGG_60_ART316",
    "idInfraction": "ART316",
    "article": "316 Cir.Agg",
    "circonstance": "Armes, explosifs ou matériel dangereux",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_61_ART316",
    "idInfraction": "ART316",
    "article": "316 Cir.Agg",
    "circonstance": "Biens publics ou de secours",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_62_ART316",
    "idInfraction": "ART316",
    "article": "316 Cir.Agg",
    "circonstance": "Produit direct d’un crime",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_63_ART317",
    "idInfraction": "ART317",
    "article": "317 Cir.Agg",
    "circonstance": "Identité utilisée pour un délit",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_64_ART317",
    "idInfraction": "ART317",
    "article": "317 Cir.Agg",
    "circonstance": "Identité utilisée pour un crime",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_65_ART318",
    "idInfraction": "ART318",
    "article": "318 Cir.Agg",
    "circonstance": "Usage d’un équipement officiel",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_66_ART318",
    "idInfraction": "ART318",
    "article": "318 Cir.Agg",
    "circonstance": "Obtention d’un avantage",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_67_ART318",
    "idInfraction": "ART318",
    "article": "318 Cir.Agg",
    "circonstance": "Atteinte aux droits ou libertés",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_68_ART318",
    "idInfraction": "ART318",
    "article": "318 Cir.Agg",
    "circonstance": "Usurpation d’une autorité publique",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_69_ART319",
    "idInfraction": "ART319",
    "article": "319 Cir.Agg",
    "circonstance": "Obtention d’un avantage important",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_70_ART319",
    "idInfraction": "ART319",
    "article": "319 Cir.Agg",
    "circonstance": "Sous couvert d’une fonction publique",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_71_ART321",
    "idInfraction": "ART321",
    "article": "321 Cir.Agg",
    "circonstance": "Préjudice grave à la victime",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_72_ART322",
    "idInfraction": "ART322",
    "article": "322 Cir.Agg",
    "circonstance": "Conséquences graves de la divulgation",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_73_ART323",
    "idInfraction": "ART323",
    "article": "323 Cir.Agg",
    "circonstance": "Préjudice important aux parties",
    "amendeSupplementaire": 7500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_74_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Infraction commise en réunion",
    "amendeSupplementaire": 400,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_75_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Équipement permettant une usurpation",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_76_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Équipement destiné à faciliter un délit",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_77_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Équipement destiné à faciliter un crime",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_78_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Arme, munitions ou matériel tactique",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_79_ART402",
    "idInfraction": "ART402",
    "article": "402 Cir.Agg",
    "circonstance": "Matériel classifié ou sensible",
    "amendeSupplementaire": 2000,
    "peineSupplementaireMinutes": 7,
    "special": ""
  },
  {
    "uid": "AGG_80_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage d’un distributeur",
    "amendeSupplementaire": 100,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_81_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage d’une supérette",
    "amendeSupplementaire": 200,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_82_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage d’une banque Fleeca",
    "amendeSupplementaire": 2850,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_83_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage d’un fourgon blindé",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_84_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage d’une bijouterie",
    "amendeSupplementaire": 4850,
    "peineSupplementaireMinutes": 20,
    "special": ""
  },
  {
    "uid": "AGG_85_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Braquage de la Pacific Bank",
    "amendeSupplementaire": 29850,
    "peineSupplementaireMinutes": 20,
    "special": ""
  },
  {
    "uid": "AGG_86_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Blessures graves",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_87_ART403",
    "idInfraction": "ART403",
    "article": "403 Cir.Agg",
    "circonstance": "Décès d’une personne",
    "amendeSupplementaire": 7500,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_88_ART404",
    "idInfraction": "ART404",
    "article": "404 Cir.Agg",
    "circonstance": "Victime vulnérable",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 3,
    "special": ""
  },
  {
    "uid": "AGG_89_ART404",
    "idInfraction": "ART404",
    "article": "404 Cir.Agg",
    "circonstance": "Violences physiques",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_90_ART405",
    "idInfraction": "ART405",
    "article": "405 Cir.Agg",
    "circonstance": "Préjudice de grande valeur",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_91_ART405",
    "idInfraction": "ART405",
    "article": "405 Cir.Agg",
    "circonstance": "Au profit d’une organisation criminelle",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_92_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Dissimulation d’une autre infraction",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_93_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Au profit d’une organisation criminelle",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_94_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Bâtiment public ou infrastructure critique",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_95_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Bâtiment occupé",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_96_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Mise en danger de vies",
    "amendeSupplementaire": 5000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_97_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Blessures graves",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_98_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "Décès d’une personne",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 50,
    "special": "Réclusion à perpétuité possible"
  },
  {
    "uid": "AGG_99_ART407",
    "idInfraction": "ART407",
    "article": "407 Cir.Agg",
    "circonstance": "But terroriste",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 50,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_100_ART704",
    "idInfraction": "ART704",
    "article": "702 Cir.Agg",
    "circonstance": "Armes de catégorie B",
    "amendeSupplementaire": 3000,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_101_ART704",
    "idInfraction": "ART704",
    "article": "702 Cir.Agg",
    "circonstance": "Armes de catégorie A",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_102_ART802_TRAFIC",
    "idInfraction": "ART802_TRAFIC",
    "article": "802 Cir.Agg",
    "circonstance": "Personne vulnérable exploitée",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_103_ART802_TRAFIC",
    "idInfraction": "ART802_TRAFIC",
    "article": "802 Cir.Agg",
    "circonstance": "Mineur exploité",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_104_ART802_TRAFIC",
    "idInfraction": "ART802_TRAFIC",
    "article": "802 Cir.Agg",
    "circonstance": "Participation à un réseau organisé",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 5,
    "special": "Confiscation possible des biens utilisés ou obtenus"
  },
  {
    "uid": "AGG_105_ART802_TRAFIC",
    "idInfraction": "ART802_TRAFIC",
    "article": "802 Cir.Agg",
    "circonstance": "Direction ou financement du réseau",
    "amendeSupplementaire": 5000,
    "peineSupplementaireMinutes": 10,
    "special": "Confiscation possible des biens utilisés ou obtenus"
  },
  {
    "uid": "AGG_106_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Victime vulnérable",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_107_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Meurtre pendant un cambriolage",
    "amendeSupplementaire": 3000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_108_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Meurtre pendant un vol",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_109_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Meurtre pendant un incendie criminel",
    "amendeSupplementaire": 5000,
    "peineSupplementaireMinutes": 20,
    "special": ""
  },
  {
    "uid": "AGG_110_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Meurtre pendant un enlèvement",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_111_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Abus de pouvoir",
    "amendeSupplementaire": 7500,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_112_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Magistrat ou agent public visé",
    "amendeSupplementaire": 10000,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_113_ART201",
    "idInfraction": "ART201",
    "article": "201 Cir.Agg",
    "circonstance": "Acte terroriste",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 30,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_114_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Séquestreur armé",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_115_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Séquestration pour faciliter un vol",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_116_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Blessure corporelle",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 7,
    "special": ""
  },
  {
    "uid": "AGG_117_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Séquestration pour faciliter un crime",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_118_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Entrave à une fonction publique",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_119_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "But de terroriser la victime",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_120_ART207",
    "idInfraction": "ART207",
    "article": "207 Cir.Agg",
    "circonstance": "Blessures graves",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_121_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Demande de rançon ou avantage",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_122_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Fonctionnaire, élu ou agent public visé",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_123_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Victime mineure",
    "amendeSupplementaire": 5000,
    "peineSupplementaireMinutes": 20,
    "special": ""
  },
  {
    "uid": "AGG_124_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Violences graves",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_125_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Actes de torture",
    "amendeSupplementaire": 7500,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_126_ART208",
    "idInfraction": "ART208",
    "article": "208 Cir.Agg",
    "circonstance": "Décès de la victime",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 50,
    "special": "Réclusion à perpétuité possible"
  },
  {
    "uid": "AGG_127_ART209",
    "idInfraction": "ART209",
    "article": "209 Cir.Agg",
    "circonstance": "Torture d’une gravité extrême",
    "amendeSupplementaire": 6250,
    "peineSupplementaireMinutes": 20,
    "special": ""
  },
  {
    "uid": "AGG_128_ART209",
    "idInfraction": "ART209",
    "article": "209 Cir.Agg",
    "circonstance": "Décès de la victime",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 35,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_129_ART210",
    "idInfraction": "ART210",
    "article": "210 Cir.Agg",
    "circonstance": "Victime âgée ou handicapée",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_130_ART210",
    "idInfraction": "ART210",
    "article": "210 Cir.Agg",
    "circonstance": "Victime mineure",
    "amendeSupplementaire": 10000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_131_ART210",
    "idInfraction": "ART210",
    "article": "210 Cir.Agg",
    "circonstance": "Blessures graves",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_132_ART210",
    "idInfraction": "ART210",
    "article": "210 Cir.Agg",
    "circonstance": "Décès de la victime",
    "amendeSupplementaire": 30000,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_133_ART211",
    "idInfraction": "ART211",
    "article": "211 Cir.Agg",
    "circonstance": "Personne vulnérable impliquée",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_134_ART211",
    "idInfraction": "ART211",
    "article": "211 Cir.Agg",
    "circonstance": "Mineur impliqué",
    "amendeSupplementaire": 30000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_135_ART313",
    "idInfraction": "ART313",
    "article": "313 Cir.Agg",
    "circonstance": "Évasion par effraction",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_136_ART313",
    "idInfraction": "ART313",
    "article": "313 Cir.Agg",
    "circonstance": "Évasion facilitée par corruption",
    "amendeSupplementaire": 2000,
    "peineSupplementaireMinutes": 7,
    "special": ""
  },
  {
    "uid": "AGG_137_ART313",
    "idInfraction": "ART313",
    "article": "313 Cir.Agg",
    "circonstance": "Violence ou menace",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_138_ART314",
    "idInfraction": "ART314",
    "article": "314 Cir.Agg",
    "circonstance": "Aide apportée à un fugitif",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_139_ART314",
    "idInfraction": "ART314",
    "article": "314 Cir.Agg",
    "circonstance": "Enquête ou preuves gravement compromises",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_140_ART320",
    "idInfraction": "ART320",
    "article": "320 Cir.Agg",
    "circonstance": "Secret d’une enquête ou procédure",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_141_ART320",
    "idInfraction": "ART320",
    "article": "320 Cir.Agg",
    "circonstance": "Haut responsable impliqué",
    "amendeSupplementaire": 4000,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_142_ART501",
    "idInfraction": "ART501",
    "article": "501 Cir.Agg",
    "circonstance": "Répression d’une opposition politique",
    "amendeSupplementaire": 12500,
    "peineSupplementaireMinutes": 15,
    "special": ""
  },
  {
    "uid": "AGG_143_ART501",
    "idInfraction": "ART501",
    "article": "501 Cir.Agg",
    "circonstance": "Maintien d’un pouvoir illégitime",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_144_ART502",
    "idInfraction": "ART502",
    "article": "502 Cir.Agg",
    "circonstance": "Dirigeant public impliqué",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_145_ART502",
    "idInfraction": "ART502",
    "article": "502 Cir.Agg",
    "circonstance": "Séparation imposée par la force",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_146_ART502",
    "idInfraction": "ART502",
    "article": "502 Cir.Agg",
    "circonstance": "Atteinte à l’intégrité territoriale",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_147_ART502",
    "idInfraction": "ART502",
    "article": "502 Cir.Agg",
    "circonstance": "Cumul des trois circonstances",
    "amendeSupplementaire": 0,
    "peineSupplementaireMinutes": 0,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_148_ART503",
    "idInfraction": "ART503",
    "article": "503 Cir.Agg",
    "circonstance": "Déstabilisation grave des institutions",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_149_ART503",
    "idInfraction": "ART503",
    "article": "503 Cir.Agg",
    "circonstance": "Pertes humaines importantes",
    "amendeSupplementaire": 62500,
    "peineSupplementaireMinutes": 50,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_150_ART601",
    "idInfraction": "ART601",
    "article": "601 Cir.Agg",
    "circonstance": "École, hôpital ou infrastructure critique",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_151_ART601",
    "idInfraction": "ART601",
    "article": "601 Cir.Agg",
    "circonstance": "Explosifs ou moyens de destruction massive",
    "amendeSupplementaire": 25000,
    "peineSupplementaireMinutes": 25,
    "special": ""
  },
  {
    "uid": "AGG_152_ART601",
    "idInfraction": "ART601",
    "article": "601 Cir.Agg",
    "circonstance": "Plusieurs victimes gravement blessées",
    "amendeSupplementaire": 37500,
    "peineSupplementaireMinutes": 30,
    "special": ""
  },
  {
    "uid": "AGG_153_ART601",
    "idInfraction": "ART601",
    "article": "601 Cir.Agg",
    "circonstance": "Un ou plusieurs décès",
    "amendeSupplementaire": 62500,
    "peineSupplementaireMinutes": 50,
    "special": "Peine de mort possible"
  },
  {
    "uid": "AGG_154_ART602",
    "idInfraction": "ART602",
    "article": "602 Cir.Agg",
    "circonstance": "Organisation structurée ou hiérarchisée",
    "amendeSupplementaire": 750,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_155_ART602",
    "idInfraction": "ART602",
    "article": "602 Cir.Agg",
    "circonstance": "Armes, explosifs ou matériel dangereux",
    "amendeSupplementaire": 1250,
    "peineSupplementaireMinutes": 5,
    "special": ""
  },
  {
    "uid": "AGG_156_ART602",
    "idInfraction": "ART602",
    "article": "602 Cir.Agg",
    "circonstance": "Direction ou financement du groupe",
    "amendeSupplementaire": 1500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_157_ART602",
    "idInfraction": "ART602",
    "article": "602 Cir.Agg",
    "circonstance": "Préparation de crimes violents",
    "amendeSupplementaire": 2500,
    "peineSupplementaireMinutes": 10,
    "special": ""
  },
  {
    "uid": "AGG_158_ART702",
    "idInfraction": "ART702",
    "article": "702 Cir.Agg",
    "circonstance": "Armes de catégorie B",
    "amendeSupplementaire": 6000,
    "peineSupplementaireMinutes": 2,
    "special": ""
  },
  {
    "uid": "AGG_159_ART702",
    "idInfraction": "ART702",
    "article": "702 Cir.Agg",
    "circonstance": "Armes de catégorie A",
    "amendeSupplementaire": 12000,
    "peineSupplementaireMinutes": 5,
    "special": ""
  }
];

export const TYPES_ARMES_DATA = [
  {
    "id": "TA_6",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Couteau",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_7",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Couteau à cran d'arrêt",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_8",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Batte de baseball",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_9",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Club de golf",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_10",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Marteau",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_11",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Clé anglaise",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_12",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Queue de billard",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_13",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Hachette",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_14",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Lampe torche",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "Armurerie"
  },
  {
    "id": "TA_15",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Poing américain",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_16",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Hache de combat",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_17",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Machette",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_18",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Couteau de chasse",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_19",
    "categorie": "CATÉGORIE D",
    "sousCategorie": "CATÉGORIE D",
    "nom": "Pied-de-biche",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Pas de Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_21",
    "categorie": "CATÉGORIE C",
    "sousCategorie": "CATÉGORIE C",
    "nom": "Pistolet de détresse",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_22",
    "categorie": "CATÉGORIE C",
    "sousCategorie": "CATÉGORIE C",
    "nom": "Taser",
    "legalite": "Légal",
    "ppaDeclaration": "Pas de PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_25",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_26",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet de combat / Glock 19",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_27",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet SNS",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_28",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet vintage",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_29",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet lourd",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_30",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet céramique",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_31",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet de précision",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_32",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Revolver",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_33",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Revolver double action",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_34",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet AP",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_35",
    "categorie": "CATÉGORIE B1",
    "sousCategorie": "CATÉGORIE B1",
    "nom": "Pistolet Automatique (TEC-9)",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_40",
    "categorie": "CATÉGORIE B2",
    "sousCategorie": "CATÉGORIE B2",
    "nom": "Mousquet",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PERMIS DE CHASSE",
    "achat": "-"
  },
  {
    "id": "TA_41",
    "categorie": "CATÉGORIE B2",
    "sousCategorie": "CATÉGORIE B2",
    "nom": "Fusil à pompe",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_42",
    "categorie": "CATÉGORIE B2",
    "sousCategorie": "CATÉGORIE B2",
    "nom": "Fusil à double cannon",
    "legalite": "Légal",
    "ppaDeclaration": "Avec PPA / Déclaration",
    "achat": "-"
  },
  {
    "id": "TA_43",
    "categorie": "CATÉGORIE B2",
    "sousCategorie": "CATÉGORIE B2",
    "nom": "Fusil à pompe canon scié",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_44",
    "categorie": "CATÉGORIE B2",
    "sousCategorie": "CATÉGORIE B2",
    "nom": "Fusil à pompe bullpup",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_51",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil d'assaut",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_52",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Carabine",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_53",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil avancé",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_54",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Carabine spécial",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_55",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil bullpup",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_56",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil compact",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_57",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil militaire",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_58",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "AK-U",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_60",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil lourd",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_61",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Mitraillette",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_62",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "PDW de combat",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_63",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Pistolet mitrailleur",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_64",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Mini mitraillette",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_65",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Mitrailleuse",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_66",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Mitrailleuse de combat",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_67",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil de précision",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_68",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil de présicion lourd",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_69",
    "categorie": "CATÉGORIE A1",
    "sousCategorie": "CATÉGORIE A1",
    "nom": "Fusil à lunette",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "-"
  },
  {
    "id": "TA_71",
    "categorie": "CATÉGORIE A2",
    "sousCategorie": "CATÉGORIE A2",
    "nom": "Lance-roquette",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_72",
    "categorie": "CATÉGORIE A2",
    "sousCategorie": "CATÉGORIE A2",
    "nom": "Lance-grenades",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_73",
    "categorie": "CATÉGORIE A2",
    "sousCategorie": "CATÉGORIE A2",
    "nom": "Lance-grenades compacte",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_74",
    "categorie": "CATÉGORIE A2",
    "sousCategorie": "CATÉGORIE A2",
    "nom": "Lance-roquettes à guidage",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_75",
    "categorie": "CATÉGORIE A2",
    "sousCategorie": "CATÉGORIE A2",
    "nom": "Minigun",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_77",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Lanceur de feux d'artifices",
    "legalite": "Légal",
    "ppaDeclaration": "Soumis à autorisation / Évènementiel",
    "achat": "FDS"
  },
  {
    "id": "TA_78",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Grenade lacrymogène",
    "legalite": "Légal",
    "ppaDeclaration": "Forces de sécurité",
    "achat": "FDS"
  },
  {
    "id": "TA_79",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Grenade fumigiène",
    "legalite": "Légal",
    "ppaDeclaration": "Forces de sécurité",
    "achat": "FDS"
  },
  {
    "id": "TA_80",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Grenade",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_81",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Bombe collante",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_82",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Mine de proximité",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_83",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Bombe artisanale",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_84",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "Cocktail molotov",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  },
  {
    "id": "TA_85",
    "categorie": "CATÉGORIE A3",
    "sousCategorie": "CATÉGORIE A3",
    "nom": "C4",
    "legalite": "Illégal",
    "ppaDeclaration": "X",
    "achat": "Illégal"
  }
];

export const LSPD_WEAPONS_DATA = [
  {
    "id": "LSPD_W_7",
    "groupe": "ARMES BLANCHE",
    "nom": "COUTEAU",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D8&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_8",
    "groupe": "ARMES BLANCHE",
    "nom": "CRAN D'ARRET",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D9&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_9",
    "groupe": "ARMES BLANCHE",
    "nom": "BATTE DE BASEBALL",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D10&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_10",
    "groupe": "ARMES BLANCHE",
    "nom": "CLUB DE GOLF",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D11&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_11",
    "groupe": "ARMES BLANCHE",
    "nom": "MARTEAU",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D12&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_12",
    "groupe": "ARMES BLANCHE",
    "nom": "CLÉ ANGLAISE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D13&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_13",
    "groupe": "ARMES BLANCHE",
    "nom": "QUEU DE BILLARD",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D14&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_14",
    "groupe": "ARMES BLANCHE",
    "nom": "HACHETTE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D15&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_15",
    "groupe": "ARMES BLANCHE",
    "nom": "LAMPE TORCHE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D16&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_16",
    "groupe": "ARMES BLANCHE",
    "nom": "POING AMÉRICAIN",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D17&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_17",
    "groupe": "ARMES BLANCHE",
    "nom": "HACHE DE COMBAT",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D18&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_18",
    "groupe": "ARMES BLANCHE",
    "nom": "MACHETTE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D19&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_19",
    "groupe": "ARMES BLANCHE",
    "nom": "COUTEAU DE CHASSE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D20&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_20",
    "groupe": "ARMES BLANCHE",
    "nom": "PIED DE BICHE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT D (SI UTILISATION)",
    "remarqueFormula": "=\"SAISIE + AMENDE \" &D21&\" (SI UTILISATION)\""
  },
  {
    "id": "LSPD_W_21",
    "groupe": "ARMES BLANCHE",
    "nom": "MATRAQUE TELESCOPIQUE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D22&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_24",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET DE DÉTRESSE",
    "categorie": "CAT C",
    "munitions": "FEU D'ARTIFICE",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_25",
    "groupe": "ARMES DE POINT",
    "nom": "TASER",
    "categorie": "CAT C",
    "munitions": "RECHARGE ELECTRIQUE",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT C + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D26&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_26",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET",
    "categorie": "CAT B1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_27",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET DE COMBAT",
    "categorie": "CAT B1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "SAISIE + AMENDE CAT B1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D28&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_28",
    "groupe": "ARMES DE POINT",
    "nom": "GLOCK 19",
    "categorie": "CAT B1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT B1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D29&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_29",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET SNS",
    "categorie": "CAT B1",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D30"
  },
  {
    "id": "LSPD_W_30",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET VINTAGE",
    "categorie": "CAT B1",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_31",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET LOURD",
    "categorie": "CAT B1",
    "munitions": "45 ACP",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D32"
  },
  {
    "id": "LSPD_W_32",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET CÉRAMIQUE",
    "categorie": "CAT B1",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D33"
  },
  {
    "id": "LSPD_W_33",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET DE PRÉCISION",
    "categorie": "CAT B1",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D34"
  },
  {
    "id": "LSPD_W_34",
    "groupe": "ARMES DE POINT",
    "nom": "REVOLVER",
    "categorie": "CAT B1",
    "munitions": "CALIBRE 50",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_35",
    "groupe": "ARMES DE POINT",
    "nom": "REVOLVER DOUBLE ACTION",
    "categorie": "CAT B1",
    "munitions": "CALIBRE 50",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D36"
  },
  {
    "id": "LSPD_W_36",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET AP",
    "categorie": "CAT B1",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_37",
    "groupe": "ARMES DE POINT",
    "nom": "TEC-9",
    "categorie": "CAT B1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D38"
  },
  {
    "id": "LSPD_W_38",
    "groupe": "ARMES DE POINT",
    "nom": "PISTOLET AUTOMATIQUE",
    "categorie": "CAT B1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D39"
  },
  {
    "id": "LSPD_W_41",
    "groupe": "SMG",
    "nom": "MITRAILLETTE PDW",
    "categorie": "CAT A1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D42"
  },
  {
    "id": "LSPD_W_42",
    "groupe": "SMG",
    "nom": "SMG MP5",
    "categorie": "CAT A1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D43&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_43",
    "groupe": "SMG",
    "nom": "SMG MP5 MK2",
    "categorie": "CAT A1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D44&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_44",
    "groupe": "SMG",
    "nom": "MUTRAILLETTE UZI",
    "categorie": "CAT A1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D45"
  },
  {
    "id": "LSPD_W_45",
    "groupe": "SMG",
    "nom": "MICRO SMG",
    "categorie": "CAT A1",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D46"
  },
  {
    "id": "LSPD_W_46",
    "groupe": "SMG",
    "nom": "GUSENBERG",
    "categorie": "CAT A2",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D47"
  },
  {
    "id": "LSPD_W_49",
    "groupe": "FUSILS",
    "nom": "M4 A1",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D50&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_50",
    "groupe": "FUSILS",
    "nom": "M4 A1 MK2",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D51&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_51",
    "groupe": "FUSILS",
    "nom": "FUSIL LOURD",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D52"
  },
  {
    "id": "LSPD_W_52",
    "groupe": "FUSILS",
    "nom": "FAMAS",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D53&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_53",
    "groupe": "FUSILS",
    "nom": "FAMAS MK2",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D54&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_54",
    "groupe": "FUSILS",
    "nom": "FUSIL AVANCÉ",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D55"
  },
  {
    "id": "LSPD_W_55",
    "groupe": "FUSILS",
    "nom": "FUSIL MILITAIRE",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D56&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_56",
    "groupe": "FUSILS",
    "nom": "AK-U",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D57&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_57",
    "groupe": "FUSILS",
    "nom": "M60",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D58&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_58",
    "groupe": "FUSILS",
    "nom": "M60 MK2",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D59&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_59",
    "groupe": "FUSILS",
    "nom": "G36",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D60&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_60",
    "groupe": "FUSILS",
    "nom": "G36 MK2",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D61&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_61",
    "groupe": "FUSILS",
    "nom": "AK-47",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D62"
  },
  {
    "id": "LSPD_W_62",
    "groupe": "FUSILS",
    "nom": "AK-47 MK2",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D63"
  },
  {
    "id": "LSPD_W_63",
    "groupe": "FUSILS",
    "nom": "M16",
    "categorie": "CAT A1",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D64&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_66",
    "groupe": "FUSILS A POMPE",
    "nom": "REMINGTON",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT B2 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D67&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_67",
    "groupe": "FUSILS A POMPE",
    "nom": "REMINGTON MK2",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT B2 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D68&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_68",
    "groupe": "FUSILS A POMPE",
    "nom": "FUSIL A POMPE LOURD",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D69"
  },
  {
    "id": "LSPD_W_69",
    "groupe": "FUSILS A POMPE",
    "nom": "FUSIL A POMPE BULLPUP",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D70"
  },
  {
    "id": "LSPD_W_70",
    "groupe": "FUSILS A POMPE",
    "nom": "FUSIL A POMPE D'ASSAUT",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D71"
  },
  {
    "id": "LSPD_W_71",
    "groupe": "FUSILS A POMPE",
    "nom": "BOUBLE CANON",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D72"
  },
  {
    "id": "LSPD_W_72",
    "groupe": "FUSILS A POMPE",
    "nom": "FUSIL A POMPE AUTO",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D73"
  },
  {
    "id": "LSPD_W_73",
    "groupe": "FUSILS A POMPE",
    "nom": "CANON SCIE",
    "categorie": "CAT B2",
    "munitions": "CALIBRE 12",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT B2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D74"
  },
  {
    "id": "LSPD_W_76",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "SNIPER LOURD MK2",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "MATERIEL MILITAIRE",
    "remarqueFormula": "MATERIEL MILITAIRE"
  },
  {
    "id": "LSPD_W_77",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "SNIPER LOURD",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A1 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D78&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_78",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "SNIPER SEMI-AUTO",
    "categorie": "CAT A2",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A2 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D79&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_79",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "FUSIL DE PRÉCISION MK2",
    "categorie": "CAT A2",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D80"
  },
  {
    "id": "LSPD_W_80",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "FUSIL DE PRÉCISION",
    "categorie": "CAT A1",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A1",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D81"
  },
  {
    "id": "LSPD_W_81",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "FUSIL SEMI-AUTO",
    "categorie": "CAT A2",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D82"
  },
  {
    "id": "LSPD_W_82",
    "groupe": "FUSIL DE PRÉCISION",
    "nom": "MOUSQUET",
    "categorie": "CAT B2",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA + PERMIS DE CHASSE",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA + PERMIS DE CHASSE"
  },
  {
    "id": "LSPD_W_85",
    "groupe": "SPÉCIAUX",
    "nom": "LANCE GRENADE",
    "categorie": "CAT A2",
    "munitions": "GRENADE",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D86"
  },
  {
    "id": "LSPD_W_86",
    "groupe": "SPÉCIAUX",
    "nom": "LANCE ROQUETTE",
    "categorie": "CAT A2",
    "munitions": "ROQUETTE",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A2",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D87"
  },
  {
    "id": "LSPD_W_87",
    "groupe": "SPÉCIAUX",
    "nom": "LANCE FEU D'ARTIFICE",
    "categorie": "CAT A3",
    "munitions": "FEU D'ARTIFICE",
    "ppa": true,
    "ppal": true,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_90",
    "groupe": "EXPLOSIFS",
    "nom": "GRENADE",
    "categorie": "CAT A3",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A3 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D91&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_91",
    "groupe": "EXPLOSIFS",
    "nom": "GREANDE FUMIÈNE",
    "categorie": "CAT A3",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A3 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D92&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_92",
    "groupe": "EXPLOSIFS",
    "nom": "GAZ LACRYMOGÈNE",
    "categorie": "CAT A3",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT A3 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D93&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_93",
    "groupe": "EXPLOSIFS",
    "nom": "COCKTAIL MOLOTOV",
    "categorie": "CAT A3",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A3",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D94"
  },
  {
    "id": "LSPD_W_94",
    "groupe": "EXPLOSIFS",
    "nom": "C4",
    "categorie": "CAT A3",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "SAISIE + AMENDE CAT A3 + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D95&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_97",
    "groupe": "MUNITIONS",
    "nom": "RECHARGE ÉLECTRIQUE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": false,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D98&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_98",
    "groupe": "MUNITIONS",
    "nom": "BEENBAG",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D99&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_99",
    "groupe": "MUNITIONS",
    "nom": "9 MM",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_100",
    "groupe": "MUNITIONS",
    "nom": "45 ACP",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_101",
    "groupe": "MUNITIONS",
    "nom": "CALIBRE 50",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_102",
    "groupe": "MUNITIONS",
    "nom": "CALIBRE 12",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_103",
    "groupe": "MUNITIONS",
    "nom": "5,56 MM",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_104",
    "groupe": "MUNITIONS",
    "nom": "7,62 MM",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_105",
    "groupe": "MUNITIONS",
    "nom": "CARTOUCHE DE GAZ",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_106",
    "groupe": "MUNITIONS",
    "nom": "ROQUETTE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_107",
    "groupe": "MUNITIONS",
    "nom": "FEU D'ARTIFICE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "MARCHE NOIR",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_108",
    "groupe": "MUNITIONS",
    "nom": "MUNITION DE MOUSQUET",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL SOUS PRÉSENTATION DU PPA",
    "remarqueFormula": "LÉGAL SOUS PRÉSENTATION DU PPA"
  },
  {
    "id": "LSPD_W_111",
    "groupe": "ÉQUIPEMENTS",
    "nom": "CHARGEUR DE 9 MM",
    "categorie": "CAT D",
    "munitions": "9 MM",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D112&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_112",
    "groupe": "ÉQUIPEMENTS",
    "nom": "CHARGEUR DE 5,56 MM",
    "categorie": "CAT D",
    "munitions": "5.56 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D113&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_113",
    "groupe": "ÉQUIPEMENTS",
    "nom": "CHARGEUR DE 7,62 MM",
    "categorie": "CAT D",
    "munitions": "7.62 MM",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D114&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_114",
    "groupe": "ÉQUIPEMENTS",
    "nom": "LAMPE TACTIQUE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "ARMURIE",
    "remarque": "LÉGAL",
    "remarqueFormula": "LÉGAL"
  },
  {
    "id": "LSPD_W_115",
    "groupe": "ÉQUIPEMENTS",
    "nom": "SILENCIEUX",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D116&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_116",
    "groupe": "ÉQUIPEMENTS",
    "nom": "LUNETTE POINT ROUGE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": true,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D117&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_117",
    "groupe": "ÉQUIPEMENTS",
    "nom": "LUNETTE HOLOGRAPHIQUE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": false,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D118&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_118",
    "groupe": "ÉQUIPEMENTS",
    "nom": "LUNETTE ACOG",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D119&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  },
  {
    "id": "LSPD_W_119",
    "groupe": "ÉQUIPEMENTS",
    "nom": "LUNETTE LONGUE DISTANCE",
    "categorie": "CAT D",
    "munitions": "-",
    "ppa": true,
    "ppal": true,
    "legal": false,
    "achat": "POLICE",
    "remarque": "SAISIE + AMENDE CAT D + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX",
    "remarqueFormula": "=\"SAISIE + AMENDE \"&D120&\" + DETENTION D’ÉQUIPEMENTS GOUVERNEMENTAUX\""
  }
];

export const PROCEDURES_DATA = {
  "regles": [
    {
      "row": 1,
      "cells": [
        "RÈGLES GÉNÉRALES DE PROCÉDURES"
      ],
      "text": "RÈGLES GÉNÉRALES DE PROCÉDURES"
    },
    {
      "row": 3,
      "cells": [
        "Constitution de l'infraction"
      ],
      "text": "Constitution de l'infraction"
    },
    {
      "row": 5,
      "cells": [
        "Pour qu'une infraction soit considérée comme telle, elle doit être commise intentionnellement ou par négligence grave et être prévue et punie par la loi en vigueur."
      ],
      "text": "Pour qu'une infraction soit considérée comme telle, elle doit être commise intentionnellement ou par négligence grave et être prévue et punie par la loi en vigueur."
    },
    {
      "row": 7,
      "cells": [
        "Responsabilité"
      ],
      "text": "Responsabilité"
    },
    {
      "row": 9,
      "cells": [
        "Toute personne est responsable de ses actes et doit connaître la loi. Les individus souffrant de troubles mentaux peuvent être exonérés de leur responsabilité pénale s'ils étaient incapables de comprendre ou de contrôler leurs actions au moment de l'infraction. La présentation d'un dossier médical valide et reconnu par les autorités compétentes est requise pour prouver cette incapacité."
      ],
      "text": "Toute personne est responsable de ses actes et doit connaître la loi. Les individus souffrant de troubles mentaux peuvent être exonérés de leur responsabilité pénale s'ils étaient incapables de comprendre ou de contrôler leurs actions au moment de l'infraction. La présentation d'un dossier médical valide et reconnu par les autorités compétentes est requise pour prouver cette incapacité."
    },
    {
      "row": 10,
      "cells": [
        "Les personnes agissant en légitime défense pour protéger leur personne ou leurs biens ne sont pas pénalement responsables. La défense doit être proportionnée à l'agression : par exemple, l'utilisation d'une force létale contre une menace mineure pourrait être considérée comme disproportionnée."
      ],
      "text": "Les personnes agissant en légitime défense pour protéger leur personne ou leurs biens ne sont pas pénalement responsables. La défense doit être proportionnée à l'agression : par exemple, l'utilisation d'une force létale contre une menace mineure pourrait être considérée comme disproportionnée."
    },
    {
      "row": 11,
      "cells": [
        "La possibilité de retirer un casier judiciaire peut être envisagée si un juge accepte la demande, à condition que l'infraction soit un délit mineur, que celui-ci ait été commis au moins un mois auparavant, et que l'individu n'ait pas récidivé depuis."
      ],
      "text": "La possibilité de retirer un casier judiciaire peut être envisagée si un juge accepte la demande, à condition que l'infraction soit un délit mineur, que celui-ci ait été commis au moins un mois auparavant, et que l'individu n'ait pas récidivé depuis."
    },
    {
      "row": 13,
      "cells": [
        "Culpabilité"
      ],
      "text": "Culpabilité"
    },
    {
      "row": 15,
      "cells": [
        "Tentative : La tentative d'infraction est le début de la commission d'une infraction qui échoue en raison de circonstances indépendantes de la volonté de l'auteur. La tentative est punie de manière moins sévère que l'infraction consommée, généralement à hauteur de la moitié de la peine prévue pour l'infraction principale."
      ],
      "text": "Tentative : La tentative d'infraction est le début de la commission d'une infraction qui échoue en raison de circonstances indépendantes de la volonté de l'auteur. La tentative est punie de manière moins sévère que l'infraction consommée, généralement à hauteur de la moitié de la peine prévue pour l'infraction principale."
    },
    {
      "row": 16,
      "cells": [
        "Complicité : La complicité consiste à faciliter volontairement la commission d'une infraction, soit en incitant, soit en fournissant les moyens pour la commettre. Les complices sont punis à la moitié de la peine de l'infraction principale, sauf si leur rôle est jugé équivalent à celui de l'auteur principal."
      ],
      "text": "Complicité : La complicité consiste à faciliter volontairement la commission d'une infraction, soit en incitant, soit en fournissant les moyens pour la commettre. Les complices sont punis à la moitié de la peine de l'infraction principale, sauf si leur rôle est jugé équivalent à celui de l'auteur principal."
    },
    {
      "row": 17,
      "cells": [
        "Co-auteurs et auteurs : Les co-auteurs sont ceux qui ont participé activement à la commission des éléments constitutifs de l'infraction. Les auteurs sont ceux qui ont commis l'infraction de manière directe et personnelle. Les sanctions pour co-auteurs et auteurs sont généralement équivalentes, sauf distinction par la loi."
      ],
      "text": "Co-auteurs et auteurs : Les co-auteurs sont ceux qui ont participé activement à la commission des éléments constitutifs de l'infraction. Les auteurs sont ceux qui ont commis l'infraction de manière directe et personnelle. Les sanctions pour co-auteurs et auteurs sont généralement équivalentes, sauf distinction par la loi."
    },
    {
      "row": 19,
      "cells": [
        "Travail d'intérêt général (TIG)"
      ],
      "text": "Travail d'intérêt général (TIG)"
    },
    {
      "row": 21,
      "cells": [
        "Le travail d'intérêt général est une sanction pénale consistant à effectuer un travail non rémunéré pour une association, un service public, ou une entreprise reconnue."
      ],
      "text": "Le travail d'intérêt général est une sanction pénale consistant à effectuer un travail non rémunéré pour une association, un service public, ou une entreprise reconnue."
    },
    {
      "row": 22,
      "cells": [
        "La durée du TIG ne peut excéder 5 jours et chaque jour ne doit pas dépasser 10 minutes de travail effectif. Des ajustements peuvent être faits selon l'infraction commise et les besoins de réhabilitation."
      ],
      "text": "La durée du TIG ne peut excéder 5 jours et chaque jour ne doit pas dépasser 10 minutes de travail effectif. Des ajustements peuvent être faits selon l'infraction commise et les besoins de réhabilitation."
    },
    {
      "row": 24,
      "cells": [
        "Comparution immédiate"
      ],
      "text": "Comparution immédiate"
    },
    {
      "row": 26,
      "cells": [
        "La comparution immédiate est une procédure accélérée permettant de juger une personne immédiatement après sa garde à vue."
      ],
      "text": "La comparution immédiate est une procédure accélérée permettant de juger une personne immédiatement après sa garde à vue."
    },
    {
      "row": 27,
      "cells": [
        "Cette procédure s'applique uniquement pour les délits majeurs, à condition que le prévenu ait moins de deux délits majeurs sur son casier judiciaire au moment de l'infraction."
      ],
      "text": "Cette procédure s'applique uniquement pour les délits majeurs, à condition que le prévenu ait moins de deux délits majeurs sur son casier judiciaire au moment de l'infraction."
    },
    {
      "row": 29,
      "cells": [
        "Récidive"
      ],
      "text": "Récidive"
    },
    {
      "row": 31,
      "cells": [
        "La récidive est reconnue lorsqu'une personne est condamnée trois fois ou plus pour la même infraction ou pour des infractions similaires. Un procès est alors organisé pour juger la personne sur les faits récents ainsi que sur l'ensemble des récidives."
      ],
      "text": "La récidive est reconnue lorsqu'une personne est condamnée trois fois ou plus pour la même infraction ou pour des infractions similaires. Un procès est alors organisé pour juger la personne sur les faits récents ainsi que sur l'ensemble des récidives."
    },
    {
      "row": 33,
      "cells": [
        "Procès"
      ],
      "text": "Procès"
    },
    {
      "row": 35,
      "cells": [
        "Un procès est automatiquement requis pour toute personne accusée de récidive ou de crime. Le procès permet de juger l'ensemble des faits reprochés et de déterminer les sanctions appropriées."
      ],
      "text": "Un procès est automatiquement requis pour toute personne accusée de récidive ou de crime. Le procès permet de juger l'ensemble des faits reprochés et de déterminer les sanctions appropriées."
    }
  ],
  "arrestation": [
    {
      "row": 1,
      "cells": [
        "PROCÉDURES D'ARRESTATION"
      ],
      "text": "PROCÉDURES D'ARRESTATION"
    },
    {
      "row": 3,
      "cells": [
        "L’arrestation d’un individu doit être menée dans le respect des lois et des droits constitutionnels. Voici les étapes détaillées que chaque agent de police doit suivre lors d'une arrestation :"
      ],
      "text": "L’arrestation d’un individu doit être menée dans le respect des lois et des droits constitutionnels. Voici les étapes détaillées que chaque agent de police doit suivre lors d'une arrestation :"
    },
    {
      "row": 5,
      "cells": [
        "1. Menottage du suspect :"
      ],
      "text": "1. Menottage du suspect :"
    },
    {
      "row": 7,
      "cells": [
        "Lors de l'arrestation, le suspect doit être menotté pour assurer la sécurité de tous les présents, y compris celle du suspect."
      ],
      "text": "Lors de l'arrestation, le suspect doit être menotté pour assurer la sécurité de tous les présents, y compris celle du suspect."
    },
    {
      "row": 8,
      "cells": [
        "Utiliser des menottes de manière appropriée, sans serrer excessivement pour éviter les blessures."
      ],
      "text": "Utiliser des menottes de manière appropriée, sans serrer excessivement pour éviter les blessures."
    },
    {
      "row": 9,
      "cells": [
        "Informer le suspect qu'il est en état d'arrestation et de la nécessité des menottes pour sa propre sécurité et celle des agents."
      ],
      "text": "Informer le suspect qu'il est en état d'arrestation et de la nécessité des menottes pour sa propre sécurité et celle des agents."
    },
    {
      "row": 11,
      "cells": [
        "2. Fouille initiale du suspect :"
      ],
      "text": "2. Fouille initiale du suspect :"
    },
    {
      "row": 13,
      "cells": [
        "Effectuer une fouille de sécurité rapide sur le lieu de l’arrestation pour retirer tout objet potentiellement dangereux ou permettant la communication (tels que lacets, ceintures, bijoux, radios, téléphones, armes, drogues, etc.)."
      ],
      "text": "Effectuer une fouille de sécurité rapide sur le lieu de l’arrestation pour retirer tout objet potentiellement dangereux ou permettant la communication (tels que lacets, ceintures, bijoux, radios, téléphones, armes, drogues, etc.)."
    },
    {
      "row": 14,
      "cells": [
        "Cette fouille doit être effectuée conformément aux protocoles de fouille pour respecter la dignité du suspect tout en assurant la sécurité."
      ],
      "text": "Cette fouille doit être effectuée conformément aux protocoles de fouille pour respecter la dignité du suspect tout en assurant la sécurité."
    },
    {
      "row": 16,
      "cells": [
        "3. Placement du suspect dans le véhicule de patrouille :"
      ],
      "text": "3. Placement du suspect dans le véhicule de patrouille :"
    },
    {
      "row": 18,
      "cells": [
        "Après la fouille initiale, le suspect doit être placé dans le véhicule de patrouille."
      ],
      "text": "Après la fouille initiale, le suspect doit être placé dans le véhicule de patrouille."
    },
    {
      "row": 19,
      "cells": [
        "Assurez-vous que le suspect est correctement sécurisé à l'intérieur du véhicule (ceinture de sécurité attachée, etc.)."
      ],
      "text": "Assurez-vous que le suspect est correctement sécurisé à l'intérieur du véhicule (ceinture de sécurité attachée, etc.)."
    },
    {
      "row": 20,
      "cells": [
        "Vérifiez que le véhicule est propre de tout objet dangereux avant de faire monter le suspect."
      ],
      "text": "Vérifiez que le véhicule est propre de tout objet dangereux avant de faire monter le suspect."
    },
    {
      "row": 22,
      "cells": [
        "4. Retour au poste de police :"
      ],
      "text": "4. Retour au poste de police :"
    },
    {
      "row": 24,
      "cells": [
        "Retourner au poste de police en utilisant les codes appropriés (Code 3 si une urgence nécessite l’utilisation des feux et de la sirène)."
      ],
      "text": "Retourner au poste de police en utilisant les codes appropriés (Code 3 si une urgence nécessite l’utilisation des feux et de la sirène)."
    },
    {
      "row": 25,
      "cells": [
        "Informer le central par un code radio que vous retournez au poste avec un suspect en garde à vue, en précisant l'identité du suspect si elle est connue."
      ],
      "text": "Informer le central par un code radio que vous retournez au poste avec un suspect en garde à vue, en précisant l'identité du suspect si elle est connue."
    },
    {
      "row": 27,
      "cells": [
        "5. Déménottage et identification au poste :"
      ],
      "text": "5. Déménottage et identification au poste :"
    },
    {
      "row": 29,
      "cells": [
        "À l'arrivée au poste, déménotter le suspect dans un espace sécurisé et sous surveillance pour procéder à l'identification."
      ],
      "text": "À l'arrivée au poste, déménotter le suspect dans un espace sécurisé et sous surveillance pour procéder à l'identification."
    },
    {
      "row": 30,
      "cells": [
        "Demander au suspect de présenter ses papiers d'identité (carte d'identité, permis de conduire, etc.)."
      ],
      "text": "Demander au suspect de présenter ses papiers d'identité (carte d'identité, permis de conduire, etc.)."
    },
    {
      "row": 31,
      "cells": [
        "S'il refuse ou n'est pas en mesure de présenter des documents d'identité, notez ce refus ou cette impossibilité dans le rapport d'arrestation."
      ],
      "text": "S'il refuse ou n'est pas en mesure de présenter des documents d'identité, notez ce refus ou cette impossibilité dans le rapport d'arrestation."
    },
    {
      "row": 33,
      "cells": [
        "6. Lecture des droits Miranda et des chefs d'inculpation :"
      ],
      "text": "6. Lecture des droits Miranda et des chefs d'inculpation :"
    },
    {
      "row": 35,
      "cells": [
        "Informer le suspect de ses droits Miranda, en lisant clairement chaque droit : le droit de garder le silence, le droit à un avocat, et le fait que tout ce qu'il dit pourra être utilisé contre lui en justice."
      ],
      "text": "Informer le suspect de ses droits Miranda, en lisant clairement chaque droit : le droit de garder le silence, le droit à un avocat, et le fait que tout ce qu'il dit pourra être utilisé contre lui en justice."
    },
    {
      "row": 36,
      "cells": [
        "Les droits doivent être lus jusqu'à trois fois si nécessaire pour assurer leur compréhension ; au-delà, ils seront considérés comme compris."
      ],
      "text": "Les droits doivent être lus jusqu'à trois fois si nécessaire pour assurer leur compréhension ; au-delà, ils seront considérés comme compris."
    },
    {
      "row": 37,
      "cells": [
        "Informer ensuite le suspect des chefs d'inculpation spécifiques pour lesquels il est arrêté."
      ],
      "text": "Informer ensuite le suspect des chefs d'inculpation spécifiques pour lesquels il est arrêté."
    },
    {
      "row": 39,
      "cells": [
        "7. Fouille complète et placement en cellule :"
      ],
      "text": "7. Fouille complète et placement en cellule :"
    },
    {
      "row": 41,
      "cells": [
        "Procéder à une fouille complète et approfondie du suspect une fois au poste pour garantir qu’aucun objet dangereux ou interdit n’a été introduit."
      ],
      "text": "Procéder à une fouille complète et approfondie du suspect une fois au poste pour garantir qu’aucun objet dangereux ou interdit n’a été introduit."
    },
    {
      "row": 42,
      "cells": [
        "Enlever les effets personnels restants qui ne sont pas autorisés en détention et les inventorier."
      ],
      "text": "Enlever les effets personnels restants qui ne sont pas autorisés en détention et les inventorier."
    },
    {
      "row": 43,
      "cells": [
        "Placer ensuite le suspect en cellule, en s'assurant que celle-ci est sécurisée et adaptée à sa détention (vérifier l'absence de risques pour sa sécurité)."
      ],
      "text": "Placer ensuite le suspect en cellule, en s'assurant que celle-ci est sécurisée et adaptée à sa détention (vérifier l'absence de risques pour sa sécurité)."
    },
    {
      "row": 45,
      "cells": [
        "8. Rédaction du rapport d'arrestation :"
      ],
      "text": "8. Rédaction du rapport d'arrestation :"
    },
    {
      "row": 47,
      "cells": [
        "Rédiger un rapport d'arrestation détaillé, incluant les circonstances de l’arrestation, la description de la fouille initiale et complète, les objets saisis, et les réactions du suspect (coopération, résistance, etc.)."
      ],
      "text": "Rédiger un rapport d'arrestation détaillé, incluant les circonstances de l’arrestation, la description de la fouille initiale et complète, les objets saisis, et les réactions du suspect (coopération, résistance, etc.)."
    },
    {
      "row": 48,
      "cells": [
        "Joindre des photographies du suspect et de tout élément saisi lors de la fouille, ainsi que tout document pertinent."
      ],
      "text": "Joindre des photographies du suspect et de tout élément saisi lors de la fouille, ainsi que tout document pertinent."
    },
    {
      "row": 49,
      "cells": [
        "Soumettre le rapport pour validation et archivage conformément aux procédures internes."
      ],
      "text": "Soumettre le rapport pour validation et archivage conformément aux procédures internes."
    },
    {
      "row": 51,
      "cells": [
        "Considérations supplémentaires :"
      ],
      "text": "Considérations supplémentaires :"
    },
    {
      "row": 53,
      "cells": [
        "Un agent de police peut arrêter un individu s'il a une suspicion raisonnable basée sur des éléments factuels et concrets, tels que le comportement du suspect, les informations reçues par des témoins, ou les preuves matérielles observées sur le lieu de l'infraction."
      ],
      "text": "Un agent de police peut arrêter un individu s'il a une suspicion raisonnable basée sur des éléments factuels et concrets, tels que le comportement du suspect, les informations reçues par des témoins, ou les preuves matérielles observées sur le lieu de l'infraction."
    },
    {
      "row": 54,
      "cells": [
        "La suspicion raisonnable doit être suffisamment étayée par des faits ou des observations rationnelles et objectives, et doit être documentée dans le rapport d'arrestation."
      ],
      "text": "La suspicion raisonnable doit être suffisamment étayée par des faits ou des observations rationnelles et objectives, et doit être documentée dans le rapport d'arrestation."
    },
    {
      "row": 55,
      "cells": [
        "Les agents doivent s'assurer que toutes les actions prises sont en accord avec les droits constitutionnels et la politique de l'État pour éviter toute violation des droits du suspect."
      ],
      "text": "Les agents doivent s'assurer que toutes les actions prises sont en accord avec les droits constitutionnels et la politique de l'État pour éviter toute violation des droits du suspect."
    }
  ],
  "delitMajeur": [
    {
      "row": 1,
      "cells": [
        "PROCÉDURES DELIT MAJEUR"
      ],
      "text": "PROCÉDURES DELIT MAJEUR"
    },
    {
      "row": 5,
      "cells": [
        "1",
        "- Lors d'un délit majeur, l'agent des force de l'ordre doit placer l'individu en cellule."
      ],
      "text": "1 - Lors d'un délit majeur, l'agent des force de l'ordre doit placer l'individu en cellule."
    },
    {
      "row": 6,
      "cells": [
        "2",
        "- L'agent des force de l'ordre écrit le Rapport d'arrestation et contact via téléphone ou MDT : Le juge et le procureur"
      ],
      "text": "2 - L'agent des force de l'ordre écrit le Rapport d'arrestation et contact via téléphone ou MDT : Le juge et le procureur"
    },
    {
      "row": 7,
      "cells": [
        "3",
        "- Si l'individu choisit de ne pas avoir recours à un avocat, l'agent doit indiquer que l'absence d'avocat pourrait entraîner des sanctions plus sévères de la part du juge."
      ],
      "text": "3 - Si l'individu choisit de ne pas avoir recours à un avocat, l'agent doit indiquer que l'absence d'avocat pourrait entraîner des sanctions plus sévères de la part du juge."
    },
    {
      "row": 8,
      "cells": [
        "4",
        "- Si l'individu est représenté par un avocat privé, il faut qu'il communique le nom de celui-ci."
      ],
      "text": "4 - Si l'individu est représenté par un avocat privé, il faut qu'il communique le nom de celui-ci."
    },
    {
      "row": 9,
      "cells": [
        "5",
        "- Dans le cas contraire,contacter un avocat commis d'office via MDT ou de solliciter un juge ou un procureur en vue d'en obtenir un."
      ],
      "text": "5 - Dans le cas contraire,contacter un avocat commis d'office via MDT ou de solliciter un juge ou un procureur en vue d'en obtenir un."
    },
    {
      "row": 10,
      "cells": [
        "6",
        "- L'agent des force de l'ordre place l'individu avec son avocat pour qu'il puisse discuter en privée (10min max)"
      ],
      "text": "6 - L'agent des force de l'ordre place l'individu avec son avocat pour qu'il puisse discuter en privée (10min max)"
    },
    {
      "row": 11,
      "cells": [
        "7",
        "- Pendant l'interrogatoire, l'agent des forces de l'ordre et le procureur interrogent l'individu (son avocat peut s'exprimer en son nom)."
      ],
      "text": "7 - Pendant l'interrogatoire, l'agent des forces de l'ordre et le procureur interrogent l'individu (son avocat peut s'exprimer en son nom)."
    },
    {
      "row": 12,
      "cells": [
        "8",
        "- A la fin de l'interrogatoire, le juge sollicite le procureur ainsi que l'avocat pour une discussion en privé. Les négociations démarrent à ce moment, et le juge émet ensuite son verdict."
      ],
      "text": "8 - A la fin de l'interrogatoire, le juge sollicite le procureur ainsi que l'avocat pour une discussion en privé. Les négociations démarrent à ce moment, et le juge émet ensuite son verdict."
    },
    {
      "row": 13,
      "cells": [
        "9",
        "- Le juge reviens face à l'individu et lui explique le verdict"
      ],
      "text": "9 - Le juge reviens face à l'individu et lui explique le verdict"
    },
    {
      "row": 14,
      "cells": [
        "10",
        "- Si le juge indique que l'individu doit faire des TIG (TIG = bracelet électronique obligatoire) le juge doit le marquer dans l'onglet comparution sur l'intranet 911"
      ],
      "text": "10 - Si le juge indique que l'individu doit faire des TIG (TIG = bracelet électronique obligatoire) le juge doit le marquer dans l'onglet comparution sur l'intranet 911"
    },
    {
      "row": 15,
      "cells": [
        "11",
        "- Le juge doit inscrire le nom et prénom de l'individu + son numéro de téléphone dans l'onglet de l'entreprise ainsi que la date fin et Ping le patron."
      ],
      "text": "11 - Le juge doit inscrire le nom et prénom de l'individu + son numéro de téléphone dans l'onglet de l'entreprise ainsi que la date fin et Ping le patron."
    },
    {
      "row": 16,
      "cells": [
        "12",
        "- Le juge indique à l'agent des forces de l'ordre si il doit poser un bracelet, une amende etc…"
      ],
      "text": "12 - Le juge indique à l'agent des forces de l'ordre si il doit poser un bracelet, une amende etc…"
    },
    {
      "row": 20,
      "cells": [
        "Pour un délit mineur, l'amende reste nominale. Elle peut toutefois passer à une minimal 1 ou 2 en cas de recours à un avocat (voir le calculateur de peines) (Ne pas contacter de juge ni le bureau du procureur)"
      ],
      "text": "Pour un délit mineur, l'amende reste nominale. Elle peut toutefois passer à une minimal 1 ou 2 en cas de recours à un avocat (voir le calculateur de peines) (Ne pas contacter de juge ni le bureau du procureur)"
    },
    {
      "row": 21,
      "cells": [
        "En cas d'un crime, la procédure demeure inchangée, mais après l'interrogatoire, un bracelet est posé en attente de jugement."
      ],
      "text": "En cas d'un crime, la procédure demeure inchangée, mais après l'interrogatoire, un bracelet est posé en attente de jugement."
    }
  ],
  "proces": [
    {
      "row": 1,
      "cells": [
        "DÉROULEMENT D'UN PROCÈS de A-Z"
      ],
      "text": "DÉROULEMENT D'UN PROCÈS de A-Z"
    },
    {
      "row": 6,
      "cells": [
        "L'organisation"
      ],
      "text": "L'organisation"
    },
    {
      "row": 7,
      "cells": [
        "- Lorsqu'un crime ou l'un des délits spécifiés dans la liste est commis, une plainte officielle est déposée par le Département de la Justice."
      ],
      "text": "- Lorsqu'un crime ou l'un des délits spécifiés dans la liste est commis, une plainte officielle est déposée par le Département de la Justice."
    },
    {
      "row": 8,
      "cells": [
        "- Si l'accusé(e) à un avocat privé ou commis d'office pour le défendre, il est ajouté dans le dossier et est convoqué pour s'entretenir avec l'accusé, le conseiller et le défendre."
      ],
      "text": "- Si l'accusé(e) à un avocat privé ou commis d'office pour le défendre, il est ajouté dans le dossier et est convoqué pour s'entretenir avec l'accusé, le conseiller et le défendre."
    },
    {
      "row": 9,
      "cells": [
        "- Le juge est immédiatement appelé dès qu'une accusation est déposée par le Département de la Justice afin de procéder à une comparution immédiate ou à l'organisation d'un procès."
      ],
      "text": "- Le juge est immédiatement appelé dès qu'une accusation est déposée par le Département de la Justice afin de procéder à une comparution immédiate ou à l'organisation d'un procès."
    },
    {
      "row": 11,
      "cells": [
        "COMPARUTION IMMÉDIATE"
      ],
      "text": "COMPARUTION IMMÉDIATE"
    },
    {
      "row": 13,
      "cells": [
        "- Le juge anime la comparution immédiate et demande au procureur de présenter un récapitulatif détaillé des événements entourant l'accusation."
      ],
      "text": "- Le juge anime la comparution immédiate et demande au procureur de présenter un récapitulatif détaillé des événements entourant l'accusation."
    },
    {
      "row": 14,
      "cells": [
        "- Par la suite, le juge donne la parole à l'accusé et son avocat afin de procéder à un plaidoyer en expliquant sa version des faits."
      ],
      "text": "- Par la suite, le juge donne la parole à l'accusé et son avocat afin de procéder à un plaidoyer en expliquant sa version des faits."
    },
    {
      "row": 15,
      "cells": [
        "- Le juge demande à l'accusé s'il plaide coupable. Si l'accusé plaide coupable, le juge demande au procureur de suggérer une sentence appropriée et demande l'avis de l'avocat avant de fixer une sentence."
      ],
      "text": "- Le juge demande à l'accusé s'il plaide coupable. Si l'accusé plaide coupable, le juge demande au procureur de suggérer une sentence appropriée et demande l'avis de l'avocat avant de fixer une sentence."
    },
    {
      "row": 16,
      "cells": [
        "- Si l'accusé plaide non coupable, le juge peut planifier le procès dans les 48 heures, assurant ainsi une résolution rapide de l'affaire. Le juge doit alors organiser le procès avec les deux parties."
      ],
      "text": "- Si l'accusé plaide non coupable, le juge peut planifier le procès dans les 48 heures, assurant ainsi une résolution rapide de l'affaire. Le juge doit alors organiser le procès avec les deux parties."
    },
    {
      "row": 20,
      "cells": [
        "Le Procès"
      ],
      "text": "Le Procès"
    },
    {
      "row": 21,
      "cells": [
        "-Tous les avocats accèdent à tous les rapports et dossiers de l'enquêtes dans le Mobile Data Terminal (MDT) ou auprès du Juge"
      ],
      "text": "-Tous les avocats accèdent à tous les rapports et dossiers de l'enquêtes dans le Mobile Data Terminal (MDT) ou auprès du Juge"
    },
    {
      "row": 22,
      "cells": [
        "-L'accusé(e) doit notifier au Juge (dans la section \"organisation de procès\" de l'intranet gouvernemental) le nom de son avocat 1 jour avant la date du procès."
      ],
      "text": "-L'accusé(e) doit notifier au Juge (dans la section \"organisation de procès\" de l'intranet gouvernemental) le nom de son avocat 1 jour avant la date du procès."
    },
    {
      "row": 23,
      "cells": [
        "-Une date de procès est par la suite mise en place par le Juge en concertation avec les différents parties."
      ],
      "text": "-Une date de procès est par la suite mise en place par le Juge en concertation avec les différents parties."
    },
    {
      "row": 24,
      "cells": [
        "-Les avocats doivent prévenir et notifier les témoins et les preuves maximum 1H avant le début du procès."
      ],
      "text": "-Les avocats doivent prévenir et notifier les témoins et les preuves maximum 1H avant le début du procès."
    },
    {
      "row": 27,
      "cells": [
        "-En cas de procès publique, chaque citoyen a le droit d'assister dans le silence le procès de l'accusé(et), Toute sortie est définitive dès le début du procès."
      ],
      "text": "-En cas de procès publique, chaque citoyen a le droit d'assister dans le silence le procès de l'accusé(et), Toute sortie est définitive dès le début du procès."
    },
    {
      "row": 28,
      "cells": [
        "-Le juge de la cour suprême demande à la séance de ce lever, le juge entre dans le tribunal, puis il se présente, il demande à la défense de se présenter ainsi que de présenter le nom de son client (l'accusé(e) ne parle pas), il demande à l'avocat du partie civil de se présenter."
      ],
      "text": "-Le juge de la cour suprême demande à la séance de ce lever, le juge entre dans le tribunal, puis il se présente, il demande à la défense de se présenter ainsi que de présenter le nom de son client (l'accusé(e) ne parle pas), il demande à l'avocat du partie civil de se présenter."
    },
    {
      "row": 29,
      "cells": [
        "-Le juge fédérale demande à l'avocat de la défense en citant les chefs d'inculpation si son client est Coupable ou Non coupable"
      ],
      "text": "-Le juge fédérale demande à l'avocat de la défense en citant les chefs d'inculpation si son client est Coupable ou Non coupable"
    },
    {
      "row": 30,
      "cells": [
        "-Le juge fédérale demande au bureau du procureur de présenter son plaidoirie d'introduction avec la demande de la sentence puis à l'avocat de la défense de présenter son plaidoirie d'introduction."
      ],
      "text": "-Le juge fédérale demande au bureau du procureur de présenter son plaidoirie d'introduction avec la demande de la sentence puis à l'avocat de la défense de présenter son plaidoirie d'introduction."
    },
    {
      "row": 31,
      "cells": [
        "-A la fin de chaque plaidoirie, le juge invite à l'avocat partie civil de présenter son premier témoin, chaque témoin peuvent être rappelé plusieur fois pendant le procès, puis le temoin de la defence etc..."
      ],
      "text": "-A la fin de chaque plaidoirie, le juge invite à l'avocat partie civil de présenter son premier témoin, chaque témoin peuvent être rappelé plusieur fois pendant le procès, puis le temoin de la defence etc..."
    },
    {
      "row": 32,
      "cells": [
        "-Le juge demande à chaque témoin de décliner leur identités et récite une phrase: Jurez vous SOLENNELLEMENT que le témoignage que vous donnerez sera la vérité, toute la vérité et rien que la vérité. dite je le jure !\""
      ],
      "text": "-Le juge demande à chaque témoin de décliner leur identités et récite une phrase: Jurez vous SOLENNELLEMENT que le témoignage que vous donnerez sera la vérité, toute la vérité et rien que la vérité. dite je le jure !\""
    },
    {
      "row": 33,
      "cells": [
        "-Lorsque tous les témoins sont passé, le juge demande aux avocats de faire leurs plaidoirie final qui résume le procès"
      ],
      "text": "-Lorsque tous les témoins sont passé, le juge demande aux avocats de faire leurs plaidoirie final qui résume le procès"
    },
    {
      "row": 34,
      "cells": [
        "-Lorsque le juge à écouter chaque plaidoirie, il lève la séance pour délibération"
      ],
      "text": "-Lorsque le juge à écouter chaque plaidoirie, il lève la séance pour délibération"
    },
    {
      "row": 35,
      "cells": [
        "-A la délibération le juge s'adresse à l'accusée et lui cite la ou les sentences"
      ],
      "text": "-A la délibération le juge s'adresse à l'accusée et lui cite la ou les sentences"
    }
  ],
  "roles": [
    {
      "row": 1,
      "cells": [
        "LES RÔLES"
      ],
      "text": "LES RÔLES"
    },
    {
      "row": 5,
      "cells": [
        "LE JUGE FÉDÉRAL"
      ],
      "text": "LE JUGE FÉDÉRAL"
    },
    {
      "row": 7,
      "cells": [
        "Le Juge fédéral, nommé par le Président des États Unis et confirmé par le Sénat des États-Unis. Il est le \"Juge en Chef\" du district central de San Andreas. Il est le plus haut magistrat du système judiciaire."
      ],
      "text": "Le Juge fédéral, nommé par le Président des États Unis et confirmé par le Sénat des États-Unis. Il est le \"Juge en Chef\" du district central de San Andreas. Il est le plus haut magistrat du système judiciaire."
    },
    {
      "row": 8,
      "cells": [
        "Le Juge fédéral est chargé de diriger et d'organiser la Cour de Justice de San Andreas et les procès qui y sont organisés."
      ],
      "text": "Le Juge fédéral est chargé de diriger et d'organiser la Cour de Justice de San Andreas et les procès qui y sont organisés."
    },
    {
      "row": 9,
      "cells": [
        "Le Juge est impartial et rend un verdict motivé, indépendant, inamovible et autonome bien qu'il prête serment devant Président des États-Unis."
      ],
      "text": "Le Juge est impartial et rend un verdict motivé, indépendant, inamovible et autonome bien qu'il prête serment devant Président des États-Unis."
    },
    {
      "row": 10,
      "cells": [
        "Le Juge peut mener une audience criminelle et civile, fixer les délais d'appel et sanctionner les parties qui abusent des voies de droit."
      ],
      "text": "Le Juge peut mener une audience criminelle et civile, fixer les délais d'appel et sanctionner les parties qui abusent des voies de droit."
    },
    {
      "row": 11,
      "cells": [
        "Le Juge peut prononcer un verdict final qui clôt une procédure criminelle, tenir des audiences préliminaires et assortir son verdict de diverses injonctions et compensations financières."
      ],
      "text": "Le Juge peut prononcer un verdict final qui clôt une procédure criminelle, tenir des audiences préliminaires et assortir son verdict de diverses injonctions et compensations financières."
    },
    {
      "row": 12,
      "cells": [
        "Le Juge peut émettre différents types de mandats, y compris de condamnation, d'arrêt, d'amener, d'injonction, de perquisition, de surveillance, de libération et de protection. Étant le plus haut magistrat du système judiciaire, ses mandats ne peuvent être cassés."
      ],
      "text": "Le Juge peut émettre différents types de mandats, y compris de condamnation, d'arrêt, d'amener, d'injonction, de perquisition, de surveillance, de libération et de protection. Étant le plus haut magistrat du système judiciaire, ses mandats ne peuvent être cassés."
    },
    {
      "row": 13,
      "cells": [
        "Le Juge doit s'assurer que les différents partis soit informées des développements de l'affaire et qu'elles soit traitées avec respect et dignité tout au long du processus judiciaire,"
      ],
      "text": "Le Juge doit s'assurer que les différents partis soit informées des développements de l'affaire et qu'elles soit traitées avec respect et dignité tout au long du processus judiciaire,"
    },
    {
      "row": 14,
      "cells": [
        "Le Juge peut \"casser\" un mandat de perquisition émis par le Département de la Justice dans le cadre d'une plainte émanant de la cible de ce mandat. Si le mandat du DOJ est cassé, tous les éléments en découlant seront considérés comme \"nul et non avenu\"."
      ],
      "text": "Le Juge peut \"casser\" un mandat de perquisition émis par le Département de la Justice dans le cadre d'une plainte émanant de la cible de ce mandat. Si le mandat du DOJ est cassé, tous les éléments en découlant seront considérés comme \"nul et non avenu\"."
    },
    {
      "row": 15,
      "cells": [
        "Le Juge décide de poursuivre ou de ne pas poursuivre une affaire pénale en fonction des éléments de preuve avancées par le Département de la Justice"
      ],
      "text": "Le Juge décide de poursuivre ou de ne pas poursuivre une affaire pénale en fonction des éléments de preuve avancées par le Département de la Justice"
    },
    {
      "row": 17,
      "cells": [
        "LES JUGES D'ÉTAT"
      ],
      "text": "LES JUGES D'ÉTAT"
    },
    {
      "row": 19,
      "cells": [
        "Le Juge d'État est nommé par le Gouverneur, et confirmé par le Sénat de San Andreas. Il est l'un des magistrats du système judiciaire."
      ],
      "text": "Le Juge d'État est nommé par le Gouverneur, et confirmé par le Sénat de San Andreas. Il est l'un des magistrats du système judiciaire."
    },
    {
      "row": 20,
      "cells": [
        "Le Juge est impartial et rend un verdict motivé, indépendant, inamovible et autonome bien qu'il prête serment devant devant le Gouverneur."
      ],
      "text": "Le Juge est impartial et rend un verdict motivé, indépendant, inamovible et autonome bien qu'il prête serment devant devant le Gouverneur."
    },
    {
      "row": 21,
      "cells": [
        "Le Juge peut mener une audience criminelle et civile et sanctionner les parties qui abusent des voies de droit."
      ],
      "text": "Le Juge peut mener une audience criminelle et civile et sanctionner les parties qui abusent des voies de droit."
    },
    {
      "row": 22,
      "cells": [
        "Le Juge peut prononcer un verdict final qui clôt une procédure criminelle, tenir des audiences préliminaires et assortir son verdict de diverses injonctions et compensations financières."
      ],
      "text": "Le Juge peut prononcer un verdict final qui clôt une procédure criminelle, tenir des audiences préliminaires et assortir son verdict de diverses injonctions et compensations financières."
    },
    {
      "row": 23,
      "cells": [
        "Le Juge peut émettre différents types de mandats, y compris de condamnation, d'arrêt, d'amener, d'injonction, de perquisition, de surveillance, de libération et de protection."
      ],
      "text": "Le Juge peut émettre différents types de mandats, y compris de condamnation, d'arrêt, d'amener, d'injonction, de perquisition, de surveillance, de libération et de protection."
    },
    {
      "row": 24,
      "cells": [
        "Le Juge peut \"casser\" un mandat de perquisition émis par le Département de la Justice dans le cadre d'une plainte émanant de la cible de ce mandat. Si le mandat du DOJ est cassé, tous les éléments en découlant seront considérés comme \"nul et non avenu\"."
      ],
      "text": "Le Juge peut \"casser\" un mandat de perquisition émis par le Département de la Justice dans le cadre d'une plainte émanant de la cible de ce mandat. Si le mandat du DOJ est cassé, tous les éléments en découlant seront considérés comme \"nul et non avenu\"."
    },
    {
      "row": 25,
      "cells": [
        "Le Juge doit s'assurer que les différents partis soit informées des développements de l'affaire et qu'elles soit traitées avec respect et dignité tout au long du processus judiciaire,"
      ],
      "text": "Le Juge doit s'assurer que les différents partis soit informées des développements de l'affaire et qu'elles soit traitées avec respect et dignité tout au long du processus judiciaire,"
    },
    {
      "row": 26,
      "cells": [
        "Le Juge décide de poursuivre ou de ne pas poursuivre une affaire pénale en fonction des éléments de preuve avancées par le Département de la Justice"
      ],
      "text": "Le Juge décide de poursuivre ou de ne pas poursuivre une affaire pénale en fonction des éléments de preuve avancées par le Département de la Justice"
    },
    {
      "row": 28,
      "cells": [
        "PROCUREUR GÉNÉRAL"
      ],
      "text": "PROCUREUR GÉNÉRAL"
    },
    {
      "row": 30,
      "cells": [
        "Le Procureur Général est nommé par le Gouverneur, et confirmé par le Sénat de San Andreas. Il est également le Secrétaire à la Justice."
      ],
      "text": "Le Procureur Général est nommé par le Gouverneur, et confirmé par le Sénat de San Andreas. Il est également le Secrétaire à la Justice."
    },
    {
      "row": 31,
      "cells": [
        "Il est le principal conseiller juridique du gouvernement et est chargé de l'application de la loi dans l'État. Il peut proposer à la législature de l'État de San Andreasdes réformes du système judiciaires et le vote de nouvelles lois."
      ],
      "text": "Il est le principal conseiller juridique du gouvernement et est chargé de l'application de la loi dans l'État. Il peut proposer à la législature de l'État de San Andreasdes réformes du système judiciaires et le vote de nouvelles lois."
    },
    {
      "row": 32,
      "cells": [
        "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
      ],
      "text": "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
    },
    {
      "row": 33,
      "cells": [
        "Le Procureur peut émettre différents types de mandats qu'il devra communiquer au Juge : le mandats d'arrêt, le mandat de perquisition."
      ],
      "text": "Le Procureur peut émettre différents types de mandats qu'il devra communiquer au Juge : le mandats d'arrêt, le mandat de perquisition."
    },
    {
      "row": 34,
      "cells": [
        "Le Procureur peut proposer/consentir à un accord juridique avec la partie adverse."
      ],
      "text": "Le Procureur peut proposer/consentir à un accord juridique avec la partie adverse."
    },
    {
      "row": 35,
      "cells": [
        "Le Procureur est responsable des procédures judiciaires ouvertes. Il décide donc de poursuivre ou non un individu, même si les faits sont matérialisés."
      ],
      "text": "Le Procureur est responsable des procédures judiciaires ouvertes. Il décide donc de poursuivre ou non un individu, même si les faits sont matérialisés."
    },
    {
      "row": 37,
      "cells": [
        "SUBSTITUT DU PROCUREUR"
      ],
      "text": "SUBSTITUT DU PROCUREUR"
    },
    {
      "row": 39,
      "cells": [
        "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
      ],
      "text": "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
    },
    {
      "row": 40,
      "cells": [
        "Le procureur peut émettre différents types de mandats qu'il devra communiquer au Juge : le mandats d'arrêt, le mandat de perquisition."
      ],
      "text": "Le procureur peut émettre différents types de mandats qu'il devra communiquer au Juge : le mandats d'arrêt, le mandat de perquisition."
    },
    {
      "row": 41,
      "cells": [
        "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
      ],
      "text": "Il est le représentant juridique des forces de police, du gouvernement et de ses membres (concernées par des affaires gouvernementales) lors des procès au tribunal"
    },
    {
      "row": 42,
      "cells": [
        "Le procureur est responsable des procédures judiciaires ouvertes. Il décide donc de poursuivre ou non un individu, même si les faits sont matérialisés."
      ],
      "text": "Le procureur est responsable des procédures judiciaires ouvertes. Il décide donc de poursuivre ou non un individu, même si les faits sont matérialisés."
    },
    {
      "row": 44,
      "cells": [
        "LES AVOCATS COMMIS D'OFFICE"
      ],
      "text": "LES AVOCATS COMMIS D'OFFICE"
    },
    {
      "row": 46,
      "cells": [
        "Un avocat commis d'office est missionné par la Cour de Justice, il doit défendre les personnes qui n'ont pas les moyens d'en avoir un, il ne peuvent pas avoir le choix de ses clients."
      ],
      "text": "Un avocat commis d'office est missionné par la Cour de Justice, il doit défendre les personnes qui n'ont pas les moyens d'en avoir un, il ne peuvent pas avoir le choix de ses clients."
    },
    {
      "row": 48,
      "cells": [
        "LES AVOCATS PRIVÉS"
      ],
      "text": "LES AVOCATS PRIVÉS"
    },
    {
      "row": 50,
      "cells": [
        "Un avocat privé travail pour lui même, il défend les clients qu'il a lui même prospecté et doit ouvrir une entreprise afin de pouvoir être dans le privé, il peut crée des contrats de travail, etc..."
      ],
      "text": "Un avocat privé travail pour lui même, il défend les clients qu'il a lui même prospecté et doit ouvrir une entreprise afin de pouvoir être dans le privé, il peut crée des contrats de travail, etc..."
    },
    {
      "row": 51,
      "cells": [
        "En cas d'absence d'avocats commis d'office, les avocats privés ont le devoir de prendre le relais."
      ],
      "text": "En cas d'absence d'avocats commis d'office, les avocats privés ont le devoir de prendre le relais."
    }
  ]
};
