export interface RegionalSubject {
  id: string;
  titre: string;
  oeuvre: 'La Boîte à Merveilles' | 'Antigone' | 'Le Dernier Jour d’un Condamné' | 'Sujet de Société Général';
  region: string;
  annee: string;
  session: 'Session Normale' | 'Session de Rattrapage';
  consigne: string;
  typePlanSuggere?: 'Plan Simple' | 'Plan Dialectique' | 'Plan Analytique';
  conseilsEnseignant?: string;
  dateAjout?: string;
  sourceEnseignant?: boolean;
}

export interface InkColorOption {
  id: string;
  nom: string;
  hex: string;
  description: string;
  badgeClass: string;
}

export const INK_COLORS: InkColorOption[] = [
  {
    id: 'noir',
    nom: 'Noir Carbone',
    hex: '#0f172a',
    description: 'Encre classique officielle',
    badgeClass: 'bg-slate-900 border-slate-700',
  },
  {
    id: 'bleu',
    nom: 'Bleu Royal',
    hex: '#1d4ed8',
    description: 'Stylo à bille classique',
    badgeClass: 'bg-blue-700 border-blue-600',
  },
  {
    id: 'rose',
    nom: 'Rose Framboise',
    hex: '#db2777',
    description: 'Nuance vive et raffinée',
    badgeClass: 'bg-pink-600 border-pink-500',
  },
  {
    id: 'orange',
    nom: 'Orange Mandarine',
    hex: '#ea580c',
    description: 'Ton chaud et énergique',
    badgeClass: 'bg-orange-600 border-orange-500',
  },
  {
    id: 'violet',
    nom: 'Violet Impérial',
    hex: '#7c3aed',
    description: 'Encre violette des écoliers',
    badgeClass: 'bg-purple-600 border-purple-500',
  },
  {
    id: 'marron',
    nom: 'Marron Sépia',
    hex: '#78350f',
    description: 'Plume calligraphique vintage',
    badgeClass: 'bg-amber-900 border-amber-800',
  },
  {
    id: 'vert',
    nom: 'Vert Émeraude',
    hex: '#047857',
    description: 'Encre vivifiante',
    badgeClass: 'bg-emerald-700 border-emerald-600',
  },
];

export const OFFICIAL_LOGICAL_CONNECTORS = [
  // Énumération, succession & gradation
  'En premier lieu', 'En deuxième lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
  "D'ailleurs", 'D’ailleurs', 'Par ailleurs',
  "En d'autres termes", 'En d’autres termes', 'Autrement dit',
  'En guise de conclusion', 'En définitive', 'En somme', 'En résumé', 'En conclusion', 'Pour conclure', 'Finalement',
  'Personnellement', 'Pour ma part', 'À mon avis', 'A mon avis', 'Selon moi', "D'après moi", 'D’après moi', 'En ce qui me concerne',
  'Tout d’abord', "Tout d'abord", 'D’abord', "D'abord", 'Premièrement', 'Deuxièmement', 'Troisièmement',
  'Ensuite', 'Puis', 'Enfin',
  // Concession & opposition
  'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant', 'Par contre', 'Bien loin de',
  // Cause & conséquence
  'Par conséquent', 'En conséquence', "C'est pourquoi", 'C’est pourquoi', 'Dès lors', 'Ainsi',
  'En effet', 'En réalité', 'De fait', 'En fait',
  'De plus', 'En outre', 'De surcroît', 'De surcroit',
  'D’une part', "D'une part", 'D’autre part', "D'autre part",
  "D'un côté", 'D’un côté', "D'autre côté", 'D’autre côté', "De l'autre côté", 'De l’autre côté',
  'Non seulement', 'Mais aussi', 'Mais encore',
  'Aussi donne-t-elle', 'Aussi permet-elle', 'Aussi convient-il', 'Aussi importe-t-il', 'Aussi',
  'De ce fait', "D'où", 'D’où', 'Certes', 'Sans doute', 'De même',
  'Il va de soi que', 'Il est indéniable que', 'Il est certain que'
];

export const DEFAULT_REGIONAL_SUBJECTS: RegionalSubject[] = [
  {
    id: 'reg-boite-parents-2023',
    titre: "L'autorité parentale et l'autonomie des jeunes dans leurs choix de vie",
    oeuvre: 'La Boîte à Merveilles',
    region: 'Rabat-Salé-Kénitra',
    annee: '2023',
    session: 'Session Normale',
    consigne: `« Il est temps que les parents arrêtent de décider à la place de leurs jeunes enfants », déclare un éducateur.

Partagez-vous cette idée ?

Dans un texte argumentatif d’une vingtaine de lignes, vous présenterez votre point de vue sur ce que devrait être le rapport parents/jeunes, en l’appuyant d’arguments pertinents et d’exemples précis.`,
    typePlanSuggere: 'Plan Simple',
    conseilsEnseignant: "Mobilisez la bienveillance protectrice du Maâlem Abdeslem ou les tensions d'émancipation pour illustrer la transition vers la maturité.",
  },
  {
    id: 'reg-boite-solitude-2022',
    titre: "La solitude : enfermement douloureux ou source de maturité et de créativité ?",
    oeuvre: 'La Boîte à Merveilles',
    region: 'Fès-Meknès',
    annee: '2022',
    session: 'Session Normale',
    consigne: `Dans La Boîte à Merveilles d'Ahmed Sefrioui, la solitude et l'épanouissement de l'individu occupent une place centrale.

Certains considèrent la solitude comme une épreuve douloureuse qui marginalise l'individu, tandis que d'autres y voient le lieu privilégié de la réflexion, de l'autonomie et de la création artistique.

Partagez-vous ce second avis ? Développez votre réflexion dans un texte argumentatif bien structuré d'une vingtaine de lignes.`,
    typePlanSuggere: 'Plan Dialectique',
    conseilsEnseignant: "Confrontez la souffrance de l'isolement d'enfant aux trésors poétiques de la boîte à merveilles et à la méditation personnelle.",
  },
  {
    id: 'reg-boite-superstition-2021',
    titre: "Le recours aux marabouts et aux guérisseurs traditionnels face à la médecine moderne",
    oeuvre: 'La Boîte à Merveilles',
    region: 'Casablanca-Settat',
    annee: '2021',
    session: 'Session Normale',
    consigne: `Dans La Boîte à Merveilles, Lalla Zoubida emmène Sidi Mohammed malade au mausolée de Sidi Ali Boughaleb et consulte des voyantes comme Chouafa pour conjurer le mauvais sort.

De nos jours encore, certaines personnes continuent de privilégier les marabouts et guérisseurs traditionnels au détriment de la consultation médicale.

Partagez-vous cette attitude ? Présentez votre point de vue dans un texte argumentatif étayé d'arguments solides et d'exemples précis.`,
    typePlanSuggere: 'Plan Simple',
    conseilsEnseignant: "Mettez en avant le danger des illusions magiques et le triomphe de la médecine scientifique et du discernement rationnel.",
  },
  {
    id: 'reg-antigone-revolte-2023',
    titre: "La rébellion de la jeunesse face aux règles et ordres des adultes",
    oeuvre: 'Antigone',
    region: 'Tanger-Tétouan-Al Hoceïma',
    annee: '2023',
    session: 'Session Normale',
    consigne: `À l'instar d'Antigone bravant la loi royale de Créon par fidélité à son frère et à sa conscience, certains jeunes refusent catégoriquement de se soumettre aux ordres des adultes, estimant que la désobéissance est indispensable pour affirmer leur personnalité.

Pensez-vous que les jeunes doivent toujours obéir aveuglément aux adultes, ou ont-ils le devoir moral de contester ce qui leur paraît injuste ?

Rédigez un texte argumentatif d'une vingtaine de lignes illustré d'arguments et d'exemples pertinents.`,
    typePlanSuggere: 'Plan Dialectique',
    conseilsEnseignant: "Analysez le conflit tragique : nécessité de l'ordre social d'un côté, noblesse de l'idéal et refus de la compromission de l'autre.",
  },
  {
    id: 'reg-antigone-bonheur-2022',
    titre: "Le compromis pragmatique face à l'exigence d'un idéal absolu de bonheur",
    oeuvre: 'Antigone',
    region: 'Marrakech-Safi',
    annee: '2022',
    session: 'Session Normale',
    consigne: `Dans Antigone de Jean Anouilh, Créon fait l'éloge du « petit bonheur » quotidien fait de concessions et de résignation, tandis qu'Antigone préfère mourir plutôt que de renoncer à son exigence de pureté.

Quelle est votre propre conception du bonheur ? Privilégiez-vous la sagesse des compromis réalistes ou l'intégrité sans faille des idéaux ?

Exposez votre point de vue dans un texte argumentatif d'environ vingt lignes.`,
    typePlanSuggere: 'Plan Dialectique',
    conseilsEnseignant: "Opposez l'attitude accommodante d'Ismène et Créon à l'intransigeance sublime d'Antigone pour bâtir votre synthèse.",
  },
  {
    id: 'reg-condamne-peine-mort-2023',
    titre: "La peine de mort et la dignité humaine : punition exemplaire ou barbarie légale ?",
    oeuvre: 'Le Dernier Jour d’un Condamné',
    region: 'Souss-Massa',
    annee: '2023',
    session: 'Session Normale',
    consigne: `Dans Le Dernier Jour d'un Condamné, Victor Hugo clame avec véhémence son horreur de l'échafaud et affirme que la justice humaine ne doit pas ôter ce qu'elle ne peut rendre : la vie.

Partagez-vous ce réquisitoire contre la peine capitale ? Estimez-vous que la société moderne doive abolir définitivement la peine de mort au profit de sanctions réparatrices ?

Présentez votre point de vue dans un texte argumentatif cohérent d'une vingtaine de lignes.`,
    typePlanSuggere: 'Plan Simple',
    conseilsEnseignant: "Citez le traumatisme des innocents (la petite Marie), le risque irréversible de l'erreur judiciaire et le principe universel d'humanité.",
  },
  {
    id: 'reg-condamne-prison-2022',
    titre: "L'institution pénitentiaire : châtiment vindicatif ou lieu de réinsertion sociale ?",
    oeuvre: 'Le Dernier Jour d’un Condamné',
    region: 'Casablanca-Settat',
    annee: '2022',
    session: 'Session Normale',
    consigne: `Pour certains, la prison a pour mission essentielle de faire expier la faute commise et d'intimider les criminels potentiels par la sévérité. Pour d'autres, elle doit avant tout offrir un cadre de rééducation, d'apprentissage et de réinsertion dans la communauté.

Quelle vision de la justice pénale soutenez-vous ? Développez vos arguments dans un texte argumentatif structuré d'environ vingt lignes.`,
    typePlanSuggere: 'Plan Dialectique',
    conseilsEnseignant: "Évoquez l'enfer dégradant de Bicêtre et le ferrage des forçats pour plaider pour une prison digne et reconstructrice.",
  },
  {
    id: 'reg-boite-solidarite-2021',
    titre: "La solidarité de voisinage traditionnelle à l'épreuve de l'individualisme contemporain",
    oeuvre: 'La Boîte à Merveilles',
    region: 'Fès-Meknès',
    annee: '2021',
    session: 'Session de Rattrapage',
    consigne: `Dans La Boîte à Merveilles, la disparition de la petite Zineb ou le départ du père après sa ruine financière réveillent une solidarité et une compassion spontanées chez toutes les familles de Dar Chouafa.

Pensez-vous que cette chaleur de l'entraide de quartier existe encore aujourd'hui ou a-t-elle été étouffée par l'individualisme des métropoles modernes ?

Justifiez votre position par des arguments concrets et des exemples vécus dans un texte argumentatif.`,
    typePlanSuggere: 'Plan Dialectique',
    conseilsEnseignant: "Prenez Dar Chouafa comme miroir d'une fraternité marocaine ancestrale et confrontez-la aux réalités urbaines actuelles.",
  },
  {
    id: 'reg-societe-ecrans-2023',
    titre: "L'omniprésence des réseaux sociaux et le dialogue intergénérationnel en famille",
    oeuvre: 'Sujet de Société Général',
    region: 'Oriental',
    annee: '2023',
    session: 'Session de Rattrapage',
    consigne: `À notre époque, les écrans connectés et les réseaux sociaux occupent une place prépondérante dans le quotidien des adolescents, créant parfois un fossé d'incompréhension et un silence pesant à la table familiale.

Partagez-vous ce constat ? Rédigez un texte argumentatif d’une vingtaine de lignes où vous présenterez votre analyse ainsi que des solutions concrètes pour réconcilier technologie et communication familiale.`,
    typePlanSuggere: 'Plan Analytique',
    conseilsEnseignant: "Développez la progression analytique : causes (hyperconnexion), impacts (rupture relationnelle) et solutions (moments d'échange partagés).",
  },
];
