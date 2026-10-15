// Banques d'exemples précis tirés des 3 œuvres intégrales au programme de 1ère BAC
// et connecteurs logiques structurés par codes couleurs pour l'Atelier de Production.

export interface OeuvreExample {
  id: string;
  theme: string;
  argumentLie: string; // Argument clair auquel cet exemple répond
  explicationArgument: string; // Explication simple du lien avec l'argument
  keywords: string[]; // Mots-clés pour détection automatique selon l'argument du candidat
  connecteur: string;
  situation: string;
  phraseComplete: string;
  analyse: string;
  pole: 'these' | 'antithese' | 'both';
}

export interface ConnectorCategory {
  id: string;
  role: string;
  description: string;
  colorName: string;
  colorClass: string;
  badgeClass: string;
  dotClass: string;
  connecteurs: {
    label: string;
    amorce: string;
    exempleUsage: string;
  }[];
}

// 1. Les Connecteurs Logiques Structurés par Rôle et par Couleur
export const CONNECTORS_BY_ROLE: ConnectorCategory[] = [
  {
    id: 'amorce',
    role: 'Amorces & Débuts d\'axes',
    description: 'Pour débuter une partie, lancer une idée ou ouvrir un paragraphe',
    colorName: 'Bleu Azur',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
    badgeClass: 'bg-blue-600 text-white',
    dotClass: 'bg-blue-500',
    connecteurs: [
      { label: 'En premier lieu,', amorce: 'En premier lieu, ', exempleUsage: 'En premier lieu, il convient de souligner que...' },
      { label: 'D\'une part,', amorce: 'D\'une part, ', exempleUsage: 'D\'une part, la préservation des liens familiaux...' },
      { label: 'Pour commencer,', amorce: 'Pour commencer, ', exempleUsage: 'Pour commencer, force est de constater que...' },
      { label: 'Il est indéniable que', amorce: 'Il est indéniable que ', exempleUsage: 'Il est indéniable que l\'éducation forge la personnalité...' },
      { label: 'D\'abord et avant tout,', amorce: 'D\'abord et avant tout, ', exempleUsage: 'D\'abord et avant tout, la liberté de conscience...' },
      { label: 'Il convient de noter que', amorce: 'Il convient de noter que ', exempleUsage: 'Il convient de noter que ce phénomène touche toutes les générations...' },
    ],
  },
  {
    id: 'explication',
    role: 'Justification & Cause / Effet',
    description: 'Pour expliquer le « pourquoi » et prouver la validité de l\'argument',
    colorName: 'Violet Impérial',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
    badgeClass: 'bg-purple-600 text-white',
    dotClass: 'bg-purple-500',
    connecteurs: [
      { label: 'En effet,', amorce: 'En effet, ', exempleUsage: 'En effet, l\'isolement moral pousse souvent l\'individu à...' },
      { label: 'Par conséquent,', amorce: 'Par conséquent, ', exempleUsage: 'Par conséquent, toute tentative d\'imposer le silence...' },
      { label: 'C\'est pourquoi', amorce: 'C\'est pourquoi ', exempleUsage: 'C\'est pourquoi le dialogue intergénérationnel demeure...' },
      { label: 'D\'ailleurs,', amorce: 'D\'ailleurs, ', exempleUsage: 'D\'ailleurs, les faits confirment que sans repères...' },
      { label: 'Puisque', amorce: 'Puisque ', exempleUsage: 'Puisque la justice doit être garante de la dignité humaine...' },
      { label: 'Ainsi,', amorce: 'Ainsi, ', exempleUsage: 'Ainsi, l\'expérience vécue éclaire les choix futurs...' },
    ],
  },
  {
    id: 'opposition',
    role: 'Opposition, Nuance & Antithèse',
    description: 'Pour basculer vers la thèse opposée ou apporter une réserve (Plan dialectique)',
    colorName: 'Orange Ambré',
    colorClass: 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100',
    badgeClass: 'bg-amber-600 text-white',
    dotClass: 'bg-amber-500',
    connecteurs: [
      { label: 'Cependant,', amorce: 'Cependant, ', exempleUsage: 'Cependant, cette vision des choses ne fait pas l\'unanimité...' },
      { label: 'En revanche,', amorce: 'En revanche, ', exempleUsage: 'En revanche, les partisans d\'une approche moderne soutiennent que...' },
      { label: 'Toutefois,', amorce: 'Toutefois, ', exempleUsage: 'Toutefois, il serait réducteur de condamner sans examiner...' },
      { label: 'Néanmoins,', amorce: 'Néanmoins, ', exempleUsage: 'Néanmoins, d\'autres voix mettent en garde contre les dérives...' },
      { label: 'D\'autre part,', amorce: 'D\'autre part, ', exempleUsage: 'D\'autre part, la rigueur de la loi ne doit pas exclure l\'humanité...' },
      { label: 'Certes... mais', amorce: 'Certes, ', exempleUsage: 'Certes, la tradition rassure, mais elle peut freiner l\'émancipation...' },
    ],
  },
  {
    id: 'exemple',
    role: 'Illustration & Références aux Œuvres',
    description: 'Pour appuyer l\'argument sur une scène précise d\'une œuvre au programme',
    colorName: 'Vert Émeraude',
    colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    badgeClass: 'bg-emerald-600 text-white',
    dotClass: 'bg-emerald-500',
    connecteurs: [
      { label: 'À titre d\'exemple,', amorce: 'À titre d\'exemple, ', exempleUsage: 'À titre d\'exemple, le comportement d\'Antigone démontre que...' },
      { label: 'Comme en témoigne', amorce: 'Comme en témoigne ', exempleUsage: 'Comme en témoigne l\'épisode de la disparition de Zineb...' },
      { label: 'C\'est le cas notamment de', amorce: 'C\'est le cas notamment de ', exempleUsage: 'C\'est le cas notamment du narrateur enfermé à Bicêtre...' },
      { label: 'Comme l\'illustre', amorce: 'Comme l\'illustre ', exempleUsage: 'Comme l\'illustre le recours de Lalla Zoubida aux sanctuaires...' },
      { label: 'À cet égard,', amorce: 'À cet égard, ', exempleUsage: 'À cet égard, l\'attitude d\'Ismène reflète la soumission aux règles...' },
      { label: 'Cette idée se confirme dans', amorce: 'Cette idée se confirme dans ', exempleUsage: 'Cette idée se confirme dans la scène où le père perd son capital...' },
    ],
  },
  {
    id: 'conclusion',
    role: 'Synthèse, Bilan & Clôture',
    description: 'Pour récapituler les deux points de vue et formuler la conclusion finale',
    colorName: 'Rose Framboise / Corail',
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100',
    badgeClass: 'bg-rose-600 text-white',
    dotClass: 'bg-rose-500',
    connecteurs: [
      { label: 'En définitive,', amorce: 'En définitive, ', exempleUsage: 'En définitive, loin d\'être antinomiques, ces deux visions se complètent...' },
      { label: 'En somme,', amorce: 'En somme, ', exempleUsage: 'En somme, le véritable équilibre réside dans le juste milieu...' },
      { label: 'Au terme de cette réflexion,', amorce: 'Au terme de cette réflexion, ', exempleUsage: 'Au terme de cette réflexion, il apparaît clairement que...' },
      { label: 'Pour conclure,', amorce: 'Pour conclure, ', exempleUsage: 'Pour conclure, nul ne peut nier l\'importance de...' },
      { label: 'Tout compte fait,', amorce: 'Tout compte fait, ', exempleUsage: 'Tout compte fait, la société gagne à encourager l\'esprit critique...' },
    ],
  },
];

// 2. Banques d'Exemples Contextualisés pour chaque Œuvre Intégrale
export const OEUVRES_DATA: Record<
  string,
  {
    nom: string;
    auteur: string;
    genre: string;
    themesCles: string[];
    exemples: OeuvreExample[];
  }
> = {
  'La Boîte à Merveilles': {
    nom: 'La Boîte à Merveilles',
    auteur: 'Ahmed Sefrioui',
    genre: 'Roman autobiographique',
    themesCles: [
      'La solitude et l\'imagination',
      'La solidarité et le voisinage',
      'La superstition et les marabouts',
      'La dignité dans le travail et la pauvreté',
      'L\'autorité parentale et l\'éducation traditionnelle',
      'Le mariage et la condition féminine',
    ],
    exemples: [
      {
        id: 'bm-solitude-imagination',
        theme: 'La solitude & Le refuge imaginaire',
        argumentLie: 'La solitude n\'est pas toujours néfaste : elle stimule l\'imagination et permet de se créer un monde intérieur apaisant.',
        explicationArgument: 'L\'enfant transforme des objets sans valeur en trésors magiques pour s\'évader de la dureté du monde réel.',
        keywords: ['solitude', 'seul', 'imagination', 'boîte', 'enfance', 'isolement', 'rêve', 'enfant', 'refuge'],
        connecteur: 'Comme en témoigne',
        situation: 'la solitude de Sidi Mohammed dans Dar Chouafa et sa boîte à merveilles',
        phraseComplete: 'Comme en témoigne la solitude éprouvée par le jeune Sidi Mohammed à Dar Chouafa, qui trouve refuge dans sa boîte à merveilles pour transformer des objets modestes en un univers féerique et échapper à la monotonie du monde des adultes.',
        analyse: 'Montre comment l\'imagination enfantine permet de surmonter la solitude affective.',
        pole: 'these',
      },
      {
        id: 'bm-solitude-souffrance',
        theme: 'La solitude pesante et douloureuse',
        argumentLie: 'La solitude imposée isole l\'individu et le prive de communication avec ses semblables.',
        explicationArgument: 'L\'incompréhension des adultes fait souffrir l\'enfant qui se sent étranger au milieu des siens.',
        keywords: ['solitude', 'souffrance', 'tristesse', 'incompréhension', 'silence', 'seul', 'peine'],
        connecteur: 'Comme l\'illustre',
        situation: 'le sentiment d\'étrangeté du narrateur face aux adultes',
        phraseComplete: 'Comme l\'illustre le cri du cœur du narrateur qui avoue dès l\'ouverture du roman : « J\'étais seul, plus seul que jamais », montrant que l\'absence d\'écoute plonge l\'être humain dans un isolement angoissant.',
        analyse: 'Prouve que la solitude subie est une épreuve douloureuse pour l\'équilibre moral.',
        pole: 'antithese',
      },
      {
        id: 'bm-solidarite',
        theme: 'La solidarité et l\'entraide face à l\'épreuve',
        argumentLie: 'La solidarité humaine et le bon voisinage sont indispensables pour surmonter les coups durs de l\'existence.',
        explicationArgument: 'Face à un drame, les rancunes personnelles s\'effacent immédiatement devant le devoir d\'entraide.',
        keywords: ['solidarité', 'entraide', 'voisin', 'aide', 'générosité', 'secours', 'disparition', 'communauté'],
        connecteur: 'À titre d\'illustration,',
        situation: 'la disparition de la petite Zineb et la réconciliation spontanée',
        phraseComplete: 'À titre d\'illustration, lors de la disparition de la petite Zineb au sanctuaire, toutes les femmes de Dar Chouafa, y compris Lalla Zoubida qui s\'était pourtant violemment disputée avec Rahma, s\'unissent spontanément dans la compassion et la recherche de l\'enfant.',
        analyse: 'Démontre que la solidarité fraternelle l\'emporte sur les conflits quotidiens en période de malheur.',
        pole: 'these',
      },
      {
        id: 'bm-superstition-critique',
        theme: 'La superstition et le charlatanisme',
        argumentLie: 'Le recours aveugle aux superstitions et aux sanctuaires égare l\'esprit et retarde les solutions rationnelles.',
        explicationArgument: 'L\'ignorance et la peur poussent les personnes vulnérables à chercher des remèdes illusoires auprès de charlatans.',
        keywords: ['superstition', 'marabout', 'voyante', 'chouafa', 'charlatan', 'sanctuaire', 'croyance', 'ignorance'],
        connecteur: 'C\'est le cas notamment de',
        situation: 'la visite au sanctuaire de Sidi Ali Boughaleb',
        phraseComplete: 'C\'est le cas notamment de la visite de Lalla Zoubida et Lalla Aïcha au sanctuaire de Sidi Ali Boughaleb, où elles espèrent guérir l\'enfant par de l\'eau croupie et des bénédictions mystiques au lieu de consulter un médecin compétent.',
        analyse: 'Met en garde contre l\'illusion des pratiques superstitieuses qui profitent de la détresse humaine.',
        pole: 'antithese',
      },
      {
        id: 'bm-dignite-travail',
        theme: 'La dignité par le travail et l\'honneur paternel',
        argumentLie: 'L\'argent ne définit pas la valeur d\'un individu : la dignité et l\'honnêteté restent les plus précieux trésors.',
        explicationArgument: 'Le courage de travailler dur permet de préserver son honneur familial sans jamais mendier.',
        keywords: ['argent', 'richesse', 'pauvreté', 'dignité', 'travail', 'honneur', 'père', 'courage', 'dette'],
        connecteur: 'Comme en atteste',
        situation: 'le départ courageux de Maâlem Abdeslem comme moissonneur',
        phraseComplete: 'Comme en atteste l\'attitude exemplaire de Maâlem Abdeslem qui, après avoir perdu tout son capital au souk, refuse de s\'endetter ou d\'humilier sa famille et part travailler durement aux champs comme moissonneur pour racheter ses outils.',
        analyse: 'Montre que l\'intégrité morale et le labeur honnête valent infiniment plus que la fortune facile.',
        pole: 'both',
      },
      {
        id: 'bm-autorite-education',
        theme: 'L\'autorité parentale et les traditions',
        argumentLie: 'L\'autorité bienveillante des parents apporte sécurité et repères indispensables aux enfants.',
        explicationArgument: 'Le père incarne la protection, la sagesse et la sérénité au sein du foyer.',
        keywords: ['parent', 'père', 'mère', 'autorité', 'éducation', 'respect', 'tradition', 'famille', 'aînés'],
        connecteur: 'À cet égard,',
        situation: 'le rôle rassurant et silencieux du père au foyer',
        phraseComplete: 'À cet égard, la présence rassurante de Maâlem Abdeslem chaque soir apporte paix et confiance à sa femme et son fils, prouvant que l\'autorité parentale n\'est pas une tyrannie mais un rempart contre l\'insécurité du monde extérieur.',
        analyse: 'Souligne la force protectrice des liens familiaux fondés sur le respect mutuel.',
        pole: 'these',
      },
      {
        id: 'bm-polygamie-mariage',
        theme: 'Le mariage forcé et la polygamie',
        argumentLie: 'Les mariages motivés par la seule convention ou l\'apparence sociale se soldent souvent par la déception et l\'injustice.',
        explicationArgument: 'Trahir la confiance d\'une première épouse dévouée engendre le désordre et la ruine morale.',
        keywords: ['mariage', 'femme', 'polygamie', 'épouse', 'amour', 'trahison', 'apparence'],
        connecteur: 'Comme le met en relief',
        situation: 'le second mariage malheureux de Moulay Larbi',
        phraseComplete: 'Comme le met en relief le second mariage de Moulay Larbi avec la fille du coiffeur, qui tourne au calvaire à cause des caprices de la jeune femme, poussant le mari repentant à reconnaître la noblesse de sa première épouse Lalla Aïcha.',
        analyse: 'Démontre que le respect des engagements sincères surpasse les illusions d\'un nouveau mariage d\'intérêt.',
        pole: 'antithese',
      },
    ],
  },
  'Antigone': {
    nom: 'Antigone',
    auteur: 'Jean Anouilh',
    genre: 'Tragédie moderne',
    themesCles: [
      'Le refus des compromis et la pureté morale',
      'Le devoir moral face à la loi des hommes',
      'La solitude du pouvoir et la raison d\'État',
      'La lâcheté et la peur du châtiment',
      'La révolte de la jeunesse face au monde adulte',
      'L\'indifférence des exécutants',
    ],
    exemples: [
      {
        id: 'ant-revolte-purete',
        theme: 'Le refus du compromis et la pureté de la conscience',
        argumentLie: 'Il est des situations où la conscience morale et la dignité humaine exigent de refuser les compromis lâches.',
        explicationArgument: 'Accepter un bonheur bâti sur le mensonge ou le renoncement dégrade l\'homme au lieu de l\'élever.',
        keywords: ['révolte', 'refus', 'compromis', 'bonheur', 'dignité', 'pureté', 'courage', 'vérité', 'idéal'],
        connecteur: 'Comme en témoigne',
        situation: 'le face-à-face tragique entre Antigone et Créon',
        phraseComplete: 'Comme en témoigne le cri révolté d\'Antigone face à Créon : elle refuse catégoriquement un « petit bonheur » fait de concessions et d\'hypocrisie, préférant mourir fidèle à son idéal de justice et de pureté plutôt que de trahir ses valeurs.',
        analyse: 'Incarne l\'héroïsme intransigeant de celui qui place ses principes moraux au-dessus de sa propre survie.',
        pole: 'these',
      },
      {
        id: 'ant-devoir-fraternel',
        theme: 'Le devoir moral supérieur aux lois politiques',
        argumentLie: 'La loi des hommes ne doit jamais bafouer les droits naturels fondamentaux et le respect des morts.',
        explicationArgument: 'L\'amour pour un frère et les lois divines commandent d\'offrir une sépulture digne à chaque être humain.',
        keywords: ['loi', 'justice', 'devoir', 'frère', 'famille', 'ordre', 'décret', 'obéissance', 'morale'],
        connecteur: 'À titre d\'illustration,',
        situation: 'l\'acte héroïque d\'Antigone enterrant Polynice',
        phraseComplete: 'À titre d\'illustration, Antigone brave sciemment le décret royal sous peine de mort pour recouvrir de terre le cadavre de son frère Polynice, affirmant que la loi du cœur et le respect des défunts dépassent les ordres arbitraires d\'un souverain.',
        analyse: 'Démontre que la fidélité à l\'amour fraternel et à la justice divine l\'emporte sur la peur des sanctions légales.',
        pole: 'these',
      },
      {
        id: 'ant-raison-etat-creon',
        theme: 'La responsabilité du pouvoir et la raison d\'État',
        argumentLie: 'L\'exercice du gouvernement exige parfois d\'imposer des règles sévères pour éviter l\'anarchie et préserver la paix publique.',
        explicationArgument: 'Un dirigeant ne peut pas gouverner selon ses seuls sentiments : l\'ordre collectif impose des décisions impopulaires.',
        keywords: ['pouvoir', 'loi', 'ordre', 'créon', 'responsabilité', 'roi', 'règles', 'gouverner', 'autorité'],
        connecteur: 'C\'est le cas notamment de',
        situation: 'Créon assumant son rôle ingrat de chef d\'État',
        phraseComplete: 'C\'est le cas notamment du roi Créon qui, malgré son affection pour sa nièce, se compare à un ouvrier qui doit faire le travail ingrat de maintenir l\'ordre dans Thèbes en guerre civile, rappelant que l\'anarchie menacerait la cité tout entière.',
        analyse: 'Révèle le dilemme tragique de l\'autorité politique contrainte de privilégier la stabilité sur les sentiments personnels.',
        pole: 'antithese',
      },
      {
        id: 'ant-ismene-peur',
        theme: 'La lâcheté ordinaire et la peur de la foule',
        argumentLie: 'La peur de la punition et le conformisme social conduisent souvent les individus à accepter l\'injustice en silence.',
        explicationArgument: 'Il est plus facile de se résigner et d\'obéir que de s\'opposer à la majorité ou au chef.',
        keywords: ['peur', 'lâcheté', 'soumission', 'silence', 'foule', 'obéir', 'faiblesse', 'résignation', 'ismène'],
        connecteur: 'À cet égard,',
        situation: 'l\'hésitation craintive d\'Ismène au début de la pièce',
        phraseComplete: 'À cet égard, les supplications d\'Ismène qui tente de dissuader sa sœur en lui rappelant qu\'elles ne sont « que des femmes » et qu\'elles ne peuvent défier le roi symbolisent la majorité silencieuse prête à renoncer à la justice par peur des conséquences.',
        analyse: 'Oppose la lucidité courageuse de la révoltée à la résignation confortable des conformistes.',
        pole: 'antithese',
      },
      {
        id: 'ant-gardes-indifference',
        theme: 'L\'indifférence aveugle et la déshumanisation',
        argumentLie: 'L\'absence d\'esprit critique transforme les exécutants en simples machines insensibles à la souffrance humaine.',
        explicationArgument: 'Quand l\'homme ne pense qu\'à son intérêt immédiat, il perd tout sens de l\'empathie envers son prochain.',
        keywords: ['indifférence', 'garde', 'obéissance aveugle', 'insensibilité', 'égoïsme', 'déshumanisation', 'violence'],
        connecteur: 'Comme le souligne',
        situation: 'les gardes qui jouent aux cartes à côté d\'Antigone condamnée',
        phraseComplete: 'Comme le souligne l\'attitude déconcertante des gardes, qui ne parlent que de leur solde, de vin et d\'avancement pendant qu\'Antigone rédige sa dernière lettre avant d\'être emmurée vivante, illustrant l\'insensibilité glaçante des exécutants aveugles.',
        analyse: 'Dénonce la déshumanisation causée par l\'obéissance mécanique et le manque total de conscience morale.',
        pole: 'both',
      },
    ],
  },
  'Le Dernier Jour d’un Condamné': {
    nom: 'Le Dernier Jour d’un Condamné',
    auteur: 'Victor Hugo',
    genre: 'Roman à thèse',
    themesCles: [
      'L\'abolition de la peine de mort',
      'La torture morale de l\'attente de l\'échafaud',
      'Les victimes innocentes et la douleur des proches',
      'La misère sociale poussant au délit',
      'La déshumanisation et la cruauté du spectacle pénal',
      'La réhabilitation contre la vengeance aveugle',
    ],
    exemples: [
      {
        id: 'condamne-torture-mentale',
        theme: 'La torture psychologique de l\'attente',
        argumentLie: 'La peine capitale est une cruauté inouïe : elle torture l\'esprit de l\'homme avant de lui trancher la tête.',
        explicationArgument: 'Savoir à l\'avance l\'heure exacte de sa mort transforme chaque minute en une agonie insupportable.',
        keywords: ['peine de mort', 'mort', 'torture', 'attente', 'échafaud', 'guillotine', 'souffrance', 'esprit', 'peur'],
        connecteur: 'Comme en atteste',
        situation: 'le supplice de l\'idée fixe qui hante le condamné à Bicêtre',
        phraseComplete: 'Comme en atteste le journal intime du condamné à Bicêtre, obsédé jour et nuit par l\'idée fixe de la mort qui l\'étouffe et le torture psychologiquement bien plus que la lame d\'acier de la guillotine.',
        analyse: 'Prouve que la peine de mort constitue une barbarie morale infligée à un être vivant sans défense.',
        pole: 'these',
      },
      {
        id: 'condamne-orpheline-marie',
        theme: 'Les ravages infligés aux proches innocents',
        argumentLie: 'En exécutant un condamné, la justice frappe injustement des êtres innocents qui n\'ont commis aucune faute.',
        explicationArgument: 'L\'enfant du coupable se retrouve orpheline, déshonorée et condamnée à la misère par la société.',
        keywords: ['innocent', 'famille', 'enfant', 'fille', 'orphelin', 'injustice', 'conséquence', 'société', 'marie'],
        connecteur: 'À titre d\'illustration,',
        situation: 'la visite déchirante de la petite Marie qui ne reconnaît plus son père',
        phraseComplete: 'À titre d\'illustration, la scène poignante où la petite Marie, âgée de trois ans, ne reconnaît plus son père et lui annonce que « son papa est mort » démontre que l\'exécution capitale brise d\'abord le cœur d\'enfants innocents livrés à l\'abandon.',
        analyse: 'Souligne l\'injustice monstrueuse d\'une sentence qui punit des innocents pour le crime d\'un autre.',
        pole: 'these',
      },
      {
        id: 'condamne-friauche-misere',
        theme: 'La misère sociale qui engendre le crime',
        argumentLie: 'La société engendre souvent elle-même le crime par la misère et l\'abandon avant de prétendre punir le criminel.',
        explicationArgument: 'Un jeune sans éducation ni pain est poussé au vol pour survivre : la société a le devoir d\'éduquer plutôt que d\'exécuter.',
        keywords: ['misère', 'pauvreté', 'crime', 'vol', 'société', 'éducation', 'réinsertion', 'faim', 'responsabilité', 'friauche'],
        connecteur: 'Comme le met en lumière',
        situation: 'la rencontre avec le jeune friauche poussé au vol par la faim',
        phraseComplete: 'Comme le met en lumière le parcours du friauche rencontré à Bicêtre, qui raconte être passé de la faim à la mendicité puis au crime faute d\'instruction et de pain, prouvant que la société devrait guérir la misère au lieu de couper des têtes.',
        analyse: 'Affirme que la véritable prévention de la délinquance réside dans la justice sociale et l\'instruction publique.',
        pole: 'both',
      },
      {
        id: 'condamne-spectacle-forçats',
        theme: 'La barbarie du spectacle pénal et la déshumanisation',
        argumentLie: 'Transformer la justice en spectacle cruel et sanguinaire abrutit le peuple au lieu de l\'élever moralement.',
        explicationArgument: 'La foule qui vient assister à une mise à mort cherche le sensationnel et perd tout sentiment de fraternité.',
        keywords: ['spectacle', 'foule', 'cruauté', 'barbarie', 'forçats', 'haine', 'sang', 'châtiment', 'vengeance'],
        connecteur: 'C\'est le cas frappant de',
        situation: 'la cérémonie du ferrage des forçats sous les rires de la foule',
        phraseComplete: 'C\'est le cas frappant du ferrage des forçats puis de la foule en délire massée sur la place de Grève pour réclamer du sang, révélant qu\'une justice vengeresse excite les bas instincts populaires au lieu de promouvoir le respect de la vie.',
        analyse: 'Dénonce la dérive d\'une justice punitive qui alimente la cruauté collective.',
        pole: 'antithese',
      },
      {
        id: 'condamne-dissuasion-nuance',
        theme: 'L\'inefficacité de la peine de mort comme dissuasion',
        argumentLie: 'La sévérité extrême du châtiment n\'a jamais fait reculer la criminalité : seul le respect de la vie éduque les citoyens.',
        explicationArgument: 'Les crimes sont souvent commis sous le coup de la passion ou de la folie, où la peur du châtiment n\'intervient pas.',
        keywords: ['dissuasion', 'peine', 'loi', 'criminel', 'peur', 'châtiment', 'prévention', 'ordre'],
        connecteur: 'À cet égard,',
        situation: 'l\'argument central du plaidoyer hugolien contre la guillotine',
        phraseComplete: 'À cet égard, le plaidoyer de Victor Hugo démontre avec rigueur que la peine de mort n\'a jamais dissuadé les forfaits passionnels, et qu\'en versant le sang d\'un citoyen, l\'État commet lui-même un meurtre légalisé indigne d\'une nation civilisée.',
        analyse: 'Fonde l\'argument abolitionniste sur l\'éthique humaniste et l\'inviolabilité de la vie humaine.',
        pole: 'these',
      },
    ],
  },
  'Sujet de Société Général': {
    nom: 'Sujet de Société Général',
    auteur: 'Culture générale & Citoyenneté',
    genre: 'Essai argumentatif',
    themesCles: [
      'Les réseaux sociaux et la communication virtuelle',
      'L\'émancipation par la lecture et le savoir',
      'La tolérance et le respect de la différence',
      'L\'argent et le bonheur',
      'Le dialogue parents-enfants et l\'autonomie des jeunes',
      'L\'esprit critique face aux fausses informations',
    ],
    exemples: [
      {
        id: 'soc-reseaux-isolement',
        theme: 'Les nouvelles technologies et la solitude moderne',
        argumentLie: 'L\'illusion de l\'hyperconnexion sur les réseaux sociaux éloigne l\'individu des véritables échanges humains.',
        explicationArgument: 'Accumuler des amis virtuels ou des mentions « j\'aime » ne remplace jamais une présence sincère et chaleureuse.',
        keywords: ['réseau', 'virtuel', 'écran', 'téléphone', 'internet', 'communication', 'solitude', 'amis', 'connexion'],
        connecteur: 'À titre d\'exemple,',
        situation: 'le paradoxe des jeunes hyperconnectés mais isolés dans leur chambre',
        phraseComplete: 'À titre d\'exemple, bien que les réseaux sociaux permettent d\'échanger instantanément avec le monde entier, de nombreux adolescents passent des heures devant leurs écrans tout en éprouvant un profond sentiment d\'isolement affectif au quotidien.',
        analyse: 'Souligne la différence essentielle entre connexion technique superficielle et véritable lien humain.',
        pole: 'antithese',
      },
      {
        id: 'soc-reseaux-apprentissage',
        theme: 'Le numérique comme outil de savoir et d\'ouverture',
        argumentLie: 'Bien utilisées, les technologies numériques offrent un accès démocratique au savoir et aux opportunités de formation.',
        explicationArgument: 'Chaque jeune peut désormais consulter des cours gratuits, apprendre des langues et découvrir le monde depuis chez lui.',
        keywords: ['réseau', 'numérique', 'internet', 'technologie', 'apprentissage', 'savoir', 'progrès', 'formation'],
        connecteur: 'Comme en témoigne',
        situation: 'l\'accès instantané aux ressources éducatives mondiales',
        phraseComplete: 'Comme en témoigne l\'essor des plateformes d\'apprentissage en ligne et des bibliothèques numériques, qui permettent aux élèves de tous milieux d\'accéder gratuitement aux plus grandes connaissances et de se former en toute autonomie.',
        analyse: 'Prouve que l\'outil technologique devient une chance formidable lorsqu\'il sert l\'émancipation intellectuelle.',
        pole: 'these',
      },
      {
        id: 'soc-lecture-esprit-critique',
        theme: 'L\'émancipation par la lecture et les livres',
        argumentLie: 'La lecture régulière des livres reste le meilleur rempart contre la manipulation et les préjugés.',
        explicationArgument: 'Découvrir d\'autres récits ouvre l\'esprit, enrichit le vocabulaire et apprend à penser par soi-même avec nuance.',
        keywords: ['lecture', 'livre', 'savoir', 'culture', 'esprit critique', 'pensée', 'préjugé', 'école', 'instruction'],
        connecteur: 'C\'est le cas notamment de',
        situation: 'l\'impact de la culture littéraire sur l\'esprit critique',
        phraseComplete: 'C\'est le cas notamment des grands lecteurs qui, en se confrontant à des visions variées du monde dans les romans et les essais, développent un esprit critique aiguisé qui les protège des jugements hâtifs et des fausses rumeurs.',
        analyse: 'Montre que la lecture forme des citoyens éclairés, libres et tolérants.',
        pole: 'these',
      },
      {
        id: 'soc-argent-limites',
        theme: 'L\'argent face aux vraies valeurs de la vie',
        argumentLie: 'Si l\'argent assure le confort matériel nécessaire, il ne peut à lui seul garantir le bonheur ni l\'amour authentique.',
        explicationArgument: 'La paix intérieure, la bonne santé et l\'affection familiale ne s\'achètent dans aucun magasin.',
        keywords: ['argent', 'richesse', 'bonheur', 'matériel', 'consommation', 'paix', 'famille', 'valeur'],
        connecteur: 'Comme l\'illustre',
        situation: 'le désarroi des personnes fortunées mais privées d\'affection sincère',
        phraseComplete: 'Comme l\'illustre le quotidien de nombreuses personnes très aisées qui, malgré leur fortune et leurs biens luxueux, souffrent de dépression et d\'incompréhension, prouvant que la richesse financière ne comble jamais un vide spirituel ou affectif.',
        analyse: 'Rappelle que le bonheur véritable repose sur la qualité des relations humaines et la sérénité du cœur.',
        pole: 'both',
      },
      {
        id: 'soc-dialogue-generation',
        theme: 'Le dialogue intergénérationnel et le respect mutuel',
        argumentLie: 'L\'entente familiale nécessite un équilibre harmonieux entre l\'expérience des aînés et le besoin d\'autonomie des jeunes.',
        explicationArgument: 'Les parents doivent savoir écouter avec bienveillance et les jeunes doivent savoir reconnaître la valeur des conseils reçus.',
        keywords: ['parent', 'jeune', 'génération', 'dialogue', 'famille', 'écoute', 'respect', 'autonomie', 'conseil'],
        connecteur: 'À cet égard,',
        situation: 'l\'harmonie des familles où règne la discussion ouverte',
        phraseComplete: 'À cet égard, les familles où parents et adolescents instaurent un dialogue régulier et constructif surmontent bien mieux les crises d\'adolescence, car chacun se sent respecté dans son identité et ses aspirations futures.',
        analyse: 'Démontre que la concertation fraternelle et la confiance mutuelle désamorcent les conflits de générations.',
        pole: 'these',
      },
      {
        id: 'soc-tolerance-diversite',
        theme: 'La tolérance et le vivre-ensemble',
        argumentLie: 'Le respect des différences d\'opinion et de culture est la condition sine qua non de toute paix civile.',
        explicationArgument: 'Accepter que l\'autre pense différemment enrichit la communauté et prévient les violences injustifiées.',
        keywords: ['tolérance', 'respect', 'différence', 'paix', 'diversité', 'vivre-ensemble', 'altérité'],
        connecteur: 'Comme le prouve',
        situation: 'la force des sociétés plurielles et bienveillantes',
        phraseComplete: 'Comme le prouve l\'exemple des communautés solidaires où la diversité des origines et des croyances est vécue comme une richesse commune, évitant les dérives destructrices de la haine et du rejet de l\'autre.',
        analyse: 'Établit la tolérance comme le pilier fondamental de toute société démocratique moderne.',
        pole: 'these',
      },
    ],
  },
};

// 3. FONCTION DE CORRESPONDANCE DYNAMIQUE : TROUVE LES EXEMPLES QUI SUIVENT L'ARGUMENT DU CANDIDAT
export interface MatchingResult {
  exactMatches: OeuvreExample[];
  otherExamples: OeuvreExample[];
  bestMatch?: OeuvreExample;
  detectedKeyword?: string;
  customSuggestion?: string;
}

export function findExamplesMatchingArgument(
  argumentText: string,
  oeuvreName: string,
  pole: 'these' | 'antithese' | 'both' = 'both'
): MatchingResult {
  const oeuvre = OEUVRES_DATA[oeuvreName] || OEUVRES_DATA['La Boîte à Merveilles'];
  const allExamples = oeuvre.exemples;

  if (!argumentText || argumentText.trim().length < 3) {
    // Si aucun argument n'est encore saisi, filtrer légèrement selon le pôle ou retourner tout
    const poleMatches = allExamples.filter((ex) => pole === 'both' || ex.pole === 'both' || ex.pole === pole);
    return {
      exactMatches: poleMatches.length > 0 ? poleMatches : allExamples,
      otherExamples: [],
      bestMatch: poleMatches[0] || allExamples[0],
    };
  }

  // Normalisation du texte de l'argument du candidat
  const rawArg = argumentText.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const scored = allExamples.map((ex) => {
    let score = 0;
    let matchedWord = '';

    // Vérification des mots-clés spécifiques de l'exemple
    for (const kw of ex.keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (rawArg.includes(normKw)) {
        score += 8;
        if (!matchedWord) matchedWord = kw;
      }
    }

    // Vérification des termes du thème et de la phrase d'argument
    const normTheme = ex.theme.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normArgLie = ex.argumentLie.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const words = rawArg.split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (normTheme.includes(word)) score += 3;
      if (normArgLie.includes(word)) score += 4;
    }

    // Bonus de pôle (thèse ou antithèse)
    if (pole !== 'both' && (ex.pole === pole || ex.pole === 'both')) {
      score += 2;
    }

    return { ex, score, matchedWord };
  });

  // Trier par score décroissant
  scored.sort((a, b) => b.score - a.score);

  const matched = scored.filter((s) => s.score >= 5).map((s) => s.ex);
  const others = scored.filter((s) => s.score < 5).map((s) => s.ex);

  const bestMatch = scored[0]?.score > 0 ? scored[0].ex : undefined;
  const detectedKeyword = scored[0]?.matchedWord || (matched.length > 0 ? matched[0].keywords[0] : undefined);

  // Synthèse d'une phrase d'exemple sur mesure si le candidat a formulé un argument spécifique
  let customSuggestion: string | undefined = undefined;
  if (argumentText.trim().length > 10 && bestMatch) {
    const cleanArgSnippet = argumentText.trim()
      .replace(/^(d'une part|d'autre part|en premier lieu|en second lieu|cependant|en revanche|néanmoins|toutefois)[,\s]*/i, '')
      .replace(/^(il apparaît indéniable que|il est indéniable que|il convient de noter que)[,\s]*/i, '')
      .trim();

    customSuggestion = `${bestMatch.connecteur} ${bestMatch.situation}, qui corrobore parfaitement l'idée selon laquelle ${cleanArgSnippet}.`;
  }

  return {
    exactMatches: matched.length > 0 ? matched : allExamples.slice(0, 3),
    otherExamples: matched.length > 0 ? others : allExamples.slice(3),
    bestMatch,
    detectedKeyword,
    customSuggestion,
  };
}

// 4. ARGUMENTS MODÈLES CLAIRS & BIEN EXPLIQUÉS (LANGAGE SIMPLE & FORT)
export interface ModelArgument {
  id: string;
  titreCourt: string;
  argumentClair: string;
  explicationSimple: string;
  exempleAssocie: string;
}

export function getModelArgumentsForTheme(
  themeName: string,
  oeuvreName: string,
  axe: 'these' | 'antithese'
): ModelArgument[] {
  const norm = (themeName + ' ' + oeuvreName).toLowerCase();

  if (norm.includes('solitude') || norm.includes('seul')) {
    if (axe === 'these') {
      return [
        {
          id: 'sol-1',
          titreCourt: 'La solitude stimule l\'imagination',
          argumentClair: 'La solitude n\'est pas nécessairement un fardeau : elle permet à l\'individu de se recueillir et de stimuler sa créativité.',
          explicationSimple: 'En effet, loin du vacarme du monde extérieur et du jugement des autres, l\'esprit trouve le calme indispensable pour rêver, imaginer et inventer son propre refuge.',
          exempleAssocie: 'Comme en témoigne le jeune Sidi Mohammed dans La Boîte à Merveilles, qui transforme de simples objets futiles en créatures féeriques pour éclairer sa solitude.',
        },
        {
          id: 'sol-2',
          titreCourt: 'Prendre du recul sur soi-même',
          argumentClair: 'L\'isolement temporaire aide la personne à mieux comprendre ses aspirations et à forger son esprit critique.',
          explicationSimple: 'En effet, la solitude offre un moment d\'introspection où l\'on apprend à être autonome sans dépendre de l\'approbation constante d\'autrui.',
          exempleAssocie: 'Comme l\'illustre l\'expérience de grands penseurs qui ont conçu leurs plus beaux idéaux dans le silence et le calme intérieur.',
        },
      ];
    } else {
      return [
        {
          id: 'sol-anti-1',
          titreCourt: 'La solitude brise le moral',
          argumentClair: 'La solitude prolongée plonge l\'être humain dans la tristesse et fragilise son équilibre mental.',
          explicationSimple: 'En effet, l\'être humain est un être social qui a un besoin vital de dialoguer, de partager ses joies et de trouver du réconfort auprès de ses semblables.',
          exempleAssocie: 'Comme en atteste le monologue poignant du condamné à mort dans Le Dernier Jour d’un Condamné, rongé par son idée fixe dans la cellule glaciale de Bicêtre.',
        },
        {
          id: 'sol-anti-2',
          titreCourt: 'L\'incompréhension des proches',
          argumentClair: 'Se sentir incompris et marginalisé au sein de sa propre communauté provoque une profonde souffrance affective.',
          explicationSimple: 'En effet, lorsque les autres ne partagent pas nos sentiments, la solitude devient une prison morale difficile à surmonter.',
          exempleAssocie: 'Comme en témoigne l\'incompréhension douloureuse qui sépare Antigone de sa sœur Ismène et de la foule de Thèbes.',
        },
      ];
    }
  }

  if (norm.includes('peine de mort') || norm.includes('condamn') || norm.includes('justice')) {
    if (axe === 'these') {
      return [
        {
          id: 'pdm-these-1',
          titreCourt: 'L\'inviolabilité de la vie humaine',
          argumentClair: 'La justice des hommes n\'a moralement pas le droit d\'ôter la vie à un être humain, quelle que soit la faute commise.',
          explicationSimple: 'En effet, tuer pour punir un meurtre revient à reproduire la même violence sanguinaire sous le couvert de la loi.',
          exempleAssocie: 'Comme en témoigne le réquisitoire passionné de Victor Hugo dans Le Dernier Jour d’un Condamné, dénonçant un meurtre légalisé indigne d\'une civilisation éclairée.',
        },
        {
          id: 'pdm-these-2',
          titreCourt: 'Le risque irréparable de l\'erreur judiciaire',
          argumentClair: 'La justice humaine étant faillible, toute peine de mort risque de sacrifier un citoyen innocent.',
          explicationSimple: 'En effet, un innocent emprisonné peut toujours être libéré et réhabilité, alors qu\'une tête coupée ne peut jamais être recollée.',
          exempleAssocie: 'Comme le rappelle l\'angoisse perpétuelle des magistrats conscients que le doute doit toujours profiter à l\'accusé pour éviter l\'irréversible.',
        },
      ];
    } else {
      return [
        {
          id: 'pdm-anti-1',
          titreCourt: 'La protection de la société',
          argumentClair: 'Pour les partisans de la sévérité, l\'élimination des criminels dangereux garantit la sécurité des citoyens innocents.',
          explicationSimple: 'En effet, ils estiment que la peur d\'un châtiment sans retour dissuade ceux qui seraient tentés de commettre des actes odieux.',
          exempleAssocie: 'Comme le proclamaient les partisans de l\'ordre public à l\'époque de Victor Hugo, convaincus que la guillotine protégeait la paix collective.',
        },
        {
          id: 'pdm-anti-2',
          titreCourt: 'La réparation pour les victimes',
          argumentClair: 'Certains estiment que la gravité absolue du crime exige une punition équivalente pour apaiser la douleur des familles éprouvées.',
          explicationSimple: 'En effet, ils considèrent que la souffrance des victimes innocentes doit primer sur le sort du coupable.',
          exempleAssocie: 'Comme en témoigne la réaction spontanée de la foule qui réclame souvent vengeance face aux crimes les plus cruels.',
        },
      ];
    }
  }

  if (norm.includes('superstition') || norm.includes('marabout') || norm.includes('chouafa')) {
    if (axe === 'these') {
      return [
        {
          id: 'sup-these-1',
          titreCourt: 'L\'illusion d\'un réconfort immédiat',
          argumentClair: 'Face au désespoir et à la maladie, le recours aux marabouts procure aux personnes simples un apaisement psychologique temporaire.',
          explicationSimple: 'En effet, ces rituels et ces visites donnent le sentiment de ne pas rester les bras croisés et raniment l\'espoir d\'une guérison.',
          exempleAssocie: 'Comme en témoigne la ferveur de Lalla Zoubida au sanctuaire de Sidi Ali Boughaleb, cherchant la paix pour son fils Sidi Mohammed malade.',
        },
      ];
    } else {
      return [
        {
          id: 'sup-anti-1',
          titreCourt: 'L\'exploitation de la misère par les charlatans',
          argumentClair: 'La superstition enferme les esprits dans l\'ignorance et enrichit des charlatans sans jamais résoudre le véritable problème.',
          explicationSimple: 'En effet, boire de l\'eau souillée ou allumer des cierges ne guérit pas les maladies et retarde les soins médicaux indispensables.',
          exempleAssocie: 'Comme l\'illustre le rituel mystique des voyantes et marabouts dans La Boîte à Merveilles, qui soulage la bourse des fidèles sans changer leur triste condition.',
        },
      ];
    }
  }

  if (norm.includes('parent') || norm.includes('generation') || norm.includes('famille') || norm.includes('jeune')) {
    if (axe === 'these') {
      return [
        {
          id: 'par-these-1',
          titreCourt: 'L\'expérience et la protection des aînés',
          argumentClair: 'L\'autorité et les conseils des parents constituent un repère indispensable pour protéger les jeunes des erreurs graves.',
          explicationSimple: 'En effet, les aînés ont traversé les difficultés de la vie et transmettent une expérience précieuse pour guider leurs enfants avec amour.',
          exempleAssocie: 'Comme en atteste l\'affection protectrice de Maâlem Abdeslem dans La Boîte à Merveilles, veillant jour et nuit sur la dignité de son foyer.',
        },
      ];
    } else {
      return [
        {
          id: 'par-anti-1',
          titreCourt: 'Le besoin légitime d\'autonomie',
          argumentClair: 'Une autorité parentale excessive étouffe la personnalité des jeunes et les empêche de devenir autonomes.',
          explicationSimple: 'En effet, chaque génération a le droit de choisir sa voie, d\'apprendre de ses propres erreurs et de s\'adapter à son époque.',
          exempleAssocie: 'Comme en témoigne la détermination d\'Antigone face à son oncle Créon, refusant de renoncer à son devoir au nom de son droit imprescriptible à la vérité.',
        },
      ];
    }
  }

  // Modèles généraux valables pour tout sujet d'opinion
  if (axe === 'these') {
    return [
      {
        id: 'gen-these-1',
        titreCourt: 'La valeur fondamentale de cette position',
        argumentClair: `Cette position repose sur une vérité indiscutable : elle répond aux exigences fondamentales de justice et d'épanouissement moral.`,
        explicationSimple: 'En effet, lorsque l\'on respecte ce principe avec loyauté, l\'individu consolide ses repères et gagne en estime personnelle.',
        exempleAssocie: `Comme l'illustre un épisode marquant de ${oeuvreName}, où le respect scrupuleux de ses devoirs confère à l'être humain une grandeur morale inébranlable.`,
      },
      {
        id: 'gen-these-2',
        titreCourt: 'L\'utilité pour la paix sociale',
        argumentClair: `D'une part, adopter ce comportement favorise la cohésion sociale et renforce les liens d'entraide entre les citoyens.`,
        explicationSimple: 'En effet, une société où chacun se soucie du bien commun prévient l\'égoïsme et assure un climat de confiance partagée.',
        exempleAssocie: `Comme le démontre la solidarité spontanée entre les habitants face à l'adversité dans ${oeuvreName}.`,
      },
    ];
  } else {
    return [
      {
        id: 'gen-anti-1',
        titreCourt: 'Les limites et les risques d\'une application aveugle',
        argumentClair: `Cependant, appliquer ce principe de manière rigide et sans discernement comporte de sérieux risques pour la liberté individuelle.`,
        explicationSimple: 'En effet, tout excès nuit : ignorer la diversité des situations réelles conduit à des injustices regrettables.',
        exempleAssocie: `Comme en atteste le conflit entre Créon et Antigone, où l'obstination sans nuance mène directement à la catastrophe.`,
      },
      {
        id: 'gen-anti-2',
        titreCourt: 'La nécessité d\'un équilibre moderne',
        argumentClair: `En revanche, les exigences du monde contemporain demandent d'adapter ces principes avec souplesse et ouverture d'esprit.`,
        explicationSimple: 'En effet, le progrès exige de savoir remettre en question les certitudes acquises pour inventer de nouvelles solutions.',
        exempleAssocie: `Comme le prouve l'évolution des mœurs et des idées qui enrichit les générations successives sans détruire les valeurs saines.`,
      },
    ];
  }
}
