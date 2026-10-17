import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle,
  HelpCircle,
  Scale,
  AlignLeft,
  Columns,
  ArrowRight,
  RotateCcw,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck2,
  Lightbulb,
  Copy,
  PenTool,
  Layers,
  Info,
  Target,
  Wrench,
} from 'lucide-react';
import {
  CONNECTORS_BY_ROLE,
  OEUVRES_DATA,
  OeuvreExample,
  findExamplesMatchingArgument,
  getModelArgumentsForTheme,
  ModelArgument,
} from '../data/oeuvreExamples';
import { RegionalSubject } from '../data/regionalSubjects';

interface AtelierProductionProps {
  sujet: string;
  isSubjectValidated: boolean;
  activeSubjectItem?: RegionalSubject | null;
  initialPlanType?: 'DIALECTIQUE' | 'SIMPLE' | 'ANALYTIQUE' | '';
  onInjectContent: (content: string, mode?: 'replace' | 'append' | 'insert') => void;
  onClose: () => void;
}

export type PlanType = 'DIALECTIQUE' | 'SIMPLE';
export type EtapeId = 'PLAN' | 'INTRO' | 'DEV_AXE1' | 'DEV_AXE2' | 'CONCL' | 'FINAL';

// Analyseur intelligent du sujet régional pour ancrer les reformulations à 100% sur le sujet
interface SubjectAnalysis {
  cleanSubject: string;
  themeName: string;
  these1: string;
  these2: string;
  these1Explication: string;
  these2Explication: string;
  questionCentrale: string;
  oeuvreProbable: string;
  // Spécifique pour le Plan Simple (défense résolue d'une seule thèse avec 2 arguments convergents)
  theseSimpleAvis: string;
  arg1Simple: string;
  arg1SimpleExplication: string;
  arg2Simple: string;
  arg2SimpleExplication: string;
  questionSimple: string;
  conclusionFerme: string;

  // Option alternative pour sujet à deux avis (ex: Solitude vs Compagnie)
  hasDualOptions?: boolean;
  optionAName?: string;
  optionBName?: string;
  theseSimpleAvisAlt?: string;
  arg1SimpleAlt?: string;
  arg1SimpleExplicationAlt?: string;
  arg2SimpleAlt?: string;
  arg2SimpleExplicationAlt?: string;
  questionSimpleAlt?: string;
  conclusionFermeAlt?: string;
}

function analyzeSubjectText(rawSubject: string, subjectItem?: RegionalSubject | null): SubjectAnalysis {
  const clean = (rawSubject || '')
    .replace(/^Sujet\s*:\s*/i, '')
    .replace(/^Consigne\s*:\s*/i, '')
    .trim();

  const lower = (clean + ' ' + (subjectItem?.titre || '') + ' ' + (subjectItem?.consigne || '')).toLowerCase();

  // Détection fidèle de l'œuvre associée
  let oeuvre = 'La Boîte à Merveilles';
  if (subjectItem?.oeuvre && subjectItem.oeuvre !== 'Sujet de Société Général' && OEUVRES_DATA[subjectItem.oeuvre]) {
    oeuvre = subjectItem.oeuvre;
  } else if (
    lower.includes('antigone') ||
    lower.includes('créon') ||
    lower.includes('creon') ||
    lower.includes('anouilh') ||
    lower.includes('ismène') ||
    lower.includes('ismene') ||
    lower.includes('polynice') ||
    lower.includes('thèbes')
  ) {
    oeuvre = 'Antigone';
  } else if (
    lower.includes('condamné') ||
    lower.includes('condamne') ||
    lower.includes('peine de mort') ||
    lower.includes('hugo') ||
    lower.includes('bicêtre') ||
    lower.includes('bicetre') ||
    lower.includes('guillotine') ||
    lower.includes('échafaud')
  ) {
    oeuvre = 'Le Dernier Jour d’un Condamné';
  } else if (
    lower.includes('boîte') ||
    lower.includes('boite') ||
    lower.includes('sefrioui') ||
    lower.includes('chouafa') ||
    lower.includes('zoubida') ||
    lower.includes('sidi mohammed') ||
    lower.includes('dar chouafa') ||
    lower.includes('maâlem') ||
    lower.includes('abdeslem')
  ) {
    oeuvre = 'La Boîte à Merveilles';
  } else if (subjectItem?.oeuvre && OEUVRES_DATA[subjectItem.oeuvre]) {
    oeuvre = subjectItem.oeuvre;
  } else {
    oeuvre = 'La Boîte à Merveilles';
  }

  // Extraction thématique précise avec arguments clairs et explications simples
  let themeName = 'cette question majeure de société';
  let these1 = 'cette idée comporte une part indéniable de vérité';
  let these1Explication = 'En effet, cela permet de préserver des repères essentiels et d\'assurer la stabilité collective.';
  let these2 = 'cette vision mérite d\'être nuancée et complétée par d\'autres réalités';
  let these2Explication = 'En effet, une application trop rigide risque de restreindre la liberté individuelle et d\'ignorer la diversité des situations.';
  let questionCentrale = 'dans quelle mesure peut-on considérer cette affirmation comme légitime';
  let theseSimpleAvis = 'cette conviction se révèle pleinement fondée et légitime';
  let arg1Simple = 'elle répond à une exigence éthique et humaine fondamentale';
  let arg1SimpleExplication = 'En effet, elle permet à l\'individu de rester fidèle à ses valeurs et de protéger sa dignité.';
  let arg2Simple = 'elle favorise la cohésion et le respect mutuel au sein de la société';
  let arg2SimpleExplication = 'En effet, une communauté qui s\'appuie sur ce principe garantit la paix et l\'épanouissement partagé.';
  let questionSimple = 'en quoi cette prise de position constitue-t-elle une évidence incontestable';
  let conclusionFerme = 'ce principe s\'impose avec force comme une vérité fondamentale à préserver';

  let hasDualOptions = false;
  let optionAName = '';
  let optionBName = '';
  let theseSimpleAvisAlt = '';
  let arg1SimpleAlt = '';
  let arg1SimpleExplicationAlt = '';
  let arg2SimpleAlt = '';
  let arg2SimpleExplicationAlt = '';
  let questionSimpleAlt = '';
  let conclusionFermeAlt = '';

  // 1. CAS PARTICULIER FONDAMENTAL : LA SOLITUDE FACE AU BESOIN DE COMPAGNIE ET D'AMITIÉ
  if (
    (lower.includes('compagnie') && (lower.includes('seul') || lower.includes('solitude'))) ||
    lower.includes('solitude versus compagnie') ||
    (lower.includes('rester seule') && lower.includes('ami'))
  ) {
    themeName = 'le choix entre la solitude et la recherche de compagnie';
    these1 = 'certaines personnes aiment rester seules pour goûter au calme, affirmer leur autonomie et stimuler leur imagination';
    these1Explication = 'En effet, le recueillement solitaire offre un havre protecteur pour rêver et réfléchir en profondeur sans subir le bruit ou la futilité du monde extérieur, comme Sidi Mohammed dans son monde intérieur.';
    these2 = 'd\'autres, au contraire, ont un besoin impérieux d\'avoir de la compagnie et de s\'entourer d\'amis pour partager les joies de la vie et briser l\'isolement';
    these2Explication = 'En effet, l\'être humain est un être éminemment social qui a un besoin vital de dialogue sincère, de tendresse et de solidarité pour s\'épanouir harmonieusement au milieu des siens.';
    questionCentrale = 'convient-il de rechercher la tranquillité bienfaisante de la solitude ou de privilégier la chaleur vivifiante de la compagnie et de l\'amitié';

    // Option A : Préférer avoir de la compagnie (défense de la sociabilité et des amis)
    hasDualOptions = true;
    optionAName = 'Préférer avoir de la compagnie (les amis, la sociabilité)';
    optionBName = 'Préférer rester seul(e) (le calme, l\'autonomie, l\'imagination)';

    theseSimpleAvis = 'la recherche de la compagnie et de l\'amitié sincère constitue le plus précieux des épanouissements humains face aux dangers de l\'isolement';
    arg1Simple = 's\'entourer d\'amis et de proches apporte un réconfort moral inestimable et brise la solitude pesante';
    arg1SimpleExplication = 'En effet, partager ses émotions et ses joies avec des personnes de confiance réchauffe le cœur et rend l\'individu bien plus fort face aux épreuves.';
    arg2Simple = 'la compagnie et la vie sociale favorisent l\'ouverture d\'esprit, la générosité et l\'apprentissage du vivre-ensemble';
    arg2SimpleExplication = 'En effet, nul ne peut s\'épanouir dans le repli stérile sur soi : c\'est par le contact bienveillant d\'autrui que se forgent la tolérance et la vraie maturité.';
    questionSimple = 'en quoi le choix de la compagnie et des liens d\'amitié s\'impose-t-il comme le garant suprême d\'une vie accomplie';
    conclusionFerme = 'la chaleur de la compagnie et la sincérité des liens amicaux constituent le trésor inestimable qui illumine et donne tout son sens à l\'existence';

    // Option B : Préférer rester seul(e)
    theseSimpleAvisAlt = 'la solitude choisie et le recueillement personnel constituent le sanctuaire indispensable de l\'autonomie et de la créativité';
    arg1SimpleAlt = 'la solitude choisie offre un havre indispensable pour stimuler l\'imagination et féconder la création artistique';
    arg1SimpleExplicationAlt = 'En effet, loin du tumulte extérieur et de la banalité des bavardages, l\'esprit s\'évade et invente un univers féerique et protecteur.';
    arg2SimpleAlt = 'l\'isolement volontaire permet de prendre du recul sur soi-même et de forger une véritable indépendance d\'esprit';
    arg2SimpleExplicationAlt = 'En effet, apprendre à vivre sereinement avec soi-même apprend à assumer ses choix sans dépendre constamment du regard d\'autrui.';
    questionSimpleAlt = 'en quoi la solitude choisie constitue-t-elle un espace privilégié de réflexion, d\'autonomie et de réalisation de soi';
    conclusionFermeAlt = 'la solitude choisie constitue le sanctuaire fécond de l\'autonomie, de la méditation et de la création artistique';
  } else if (lower.includes('solitude') || lower.includes('seul')) {
    themeName = 'la solitude et son impact sur l\'individu';
    these1 = 'la solitude choisie permet à l\'individu de se recueillir, d\'affirmer son autonomie et de stimuler son imagination';
    these1Explication = 'En effet, loin du bruit et du regard des autres, l\'esprit trouve le calme nécessaire pour réfléchir et créer son propre monde.';
    these2 = 'la solitude subie isole la personne et lui fait éprouver une souffrance morale pesante';
    these2Explication = 'En effet, l\'être humain a un besoin vital de dialogue et d\'affection fraternelle pour se sentir compris et aimé.';
    questionCentrale = 'doit-on percevoir la solitude comme un refuge fécond ou comme une douloureuse épreuve';
    theseSimpleAvis = 'la solitude constitue le lieu privilégié de la réflexion, de l\'autonomie et de la création artistique';
    arg1Simple = 'la solitude choisie offre un refuge indispensable pour stimuler l\'imagination et féconder la création artistique';
    arg1SimpleExplication = 'En effet, loin du tumulte extérieur et de la banalité des conversations, l\'esprit s\'évade et invente un univers féerique et protecteur.';
    arg2Simple = 'l\'isolement volontaire permet de prendre du recul sur soi-même et de forger une véritable indépendance d\'esprit';
    arg2SimpleExplication = 'En effet, apprendre à vivre sereinement avec soi-même apprend à assumer ses choix sans dépendre constamment du regard d\'autrui.';
    questionSimple = 'en quoi la solitude choisie constitue-t-elle un espace privilégié de réflexion, d\'autonomie et de réalisation de soi';
    conclusionFerme = 'la solitude choisie constitue le sanctuaire fécond de l\'autonomie, de la méditation et de la création artistique';
  } else if (lower.includes('peine de mort') || lower.includes('condamn') || lower.includes('guillotine')) {
    themeName = 'la peine de mort et la justice humaine';
    these1 = 'la justice des hommes n\'a moralement pas le droit d\'ôter la vie et doit abolir la peine de mort';
    these1Explication = 'En effet, la justice humaine n\'étant pas infaillible, le risque d\'exécuter un innocent est irréparable, et le châtiment suprême supprime toute chance de rédemption.';
    these2 = 'certains partisans de l\'ordre estiment que la sévérité absolue est indispensable pour dissuader les crimes';
    these2Explication = 'En effet, ils considèrent que la peur de mourir protège les innocents et offre une punition exemplaire proportionnée à la gravité de l\'acte.';
    questionCentrale = 'la société a-t-elle le droit moral d\'ôter la vie à un condamné ou doit-elle plutôt privilégier la dignité humaine';
    theseSimpleAvis = 'l\'abolition définitive de la peine de mort est un impératif moral absolu pour toute société civilisée';
    arg1Simple = 'la vie humaine est inviolable et la loi ne peut imiter le crime qu\'elle prétend châtier';
    arg1SimpleExplication = 'En effet, exécuter un être humain froidement au nom de la loi constitue un meurtre d\'État indigne de la dignité humaine.';
    arg2Simple = 'la justice des hommes n\'étant jamais infaillible, le risque de guillotiner un innocent est une faute irréparable';
    arg2SimpleExplication = 'En effet, lorsqu\'une tête tombe, aucun repentir ni aucun témoignage tardif ne peut lui redonner la vie.';
    questionSimple = 'en quoi l\'abolition de la peine de mort demeure-t-elle une exigence morale indiscutable';
    conclusionFerme = 'l\'abolition de la peine de mort s\'impose comme un devoir sacré au nom de l\'inviolabilité de la vie humaine';
  } else if (lower.includes('superstition') || lower.includes('voyante') || lower.includes('chouafa') || lower.includes('marabout') || lower.includes('saints')) {
    themeName = 'le recours aux superstitions et aux croyances traditionnelles';
    these1 = 'le recours aux marabouts procure aux personnes angoissées un réconfort moral passager';
    these1Explication = 'En effet, face à la douleur et à la précarité, ces pratiques rassurent les esprits fragiles en leur redonnant un sentiment d\'espoir immédiat.';
    these2 = 'la superstition enferme les esprits dans l\'ignorance et retarde les solutions médicales rationnelles';
    these2Explication = 'En effet, allumer des cierges ou consulter des charlatans ne soigne aucune maladie et appauvrit ceux qui souffrent au lieu de les guérir.';
    questionCentrale = 'le recours aux marabouts constitue-t-il un remède réconfortant ou une dangereuse illusion';
    theseSimpleAvis = 'les superstitions et les pratiques maraboutiques représentent une dangereuse illusion qui aliène les esprits';
    arg1Simple = 'ces pratiques exploitent la crédulité et la détresse financière des familles vulnérables';
    arg1SimpleExplication = 'En effet, des voyantes et des charlatans s\'enrichissent sur le dos des souffrants sans jamais apporter la moindre guérison.';
    arg2Simple = 'elles détournent les malades des remèdes scientifiques et de la médecine moderne';
    arg2SimpleExplication = 'En effet, préférer les talismans aux consultations médicales aggrave l\'état de santé et met des vies en péril.';
    questionSimple = 'en quoi la lutte contre la superstition est-elle indispensable pour l\'émancipation et le progrès social';
    conclusionFerme = 'la raison et la science doivent triompher des superstitions archaïques qui freinent l\'épanouissement de la société';
  } else if (lower.includes('parent') || lower.includes('génération') || lower.includes('jeune') || lower.includes('tradition') || lower.includes('famille')) {
    themeName = 'l\'autorité des parents et le dialogue avec la jeunesse';
    these1 = 'l\'expérience et les conseils des parents constituent un guide précieux pour protéger les jeunes';
    these1Explication = 'En effet, les aînés ont vécu les épreuves de l\'existence et transmettent des valeurs solides pour éviter les faux pas.';
    these2 = 'la jeunesse a un besoin légitime d\'autonomie et d\'écoute pour forger ses propres convictions';
    these2Explication = 'En effet, une autorité trop rigide étouffe la créativité et empêche les jeunes d\'apprendre par leurs propres expériences.';
    questionCentrale = 'convient-il de se conformer strictement aux directives des aînés ou de revendiquer son autonomie';
    theseSimpleAvis = 'le dialogue bienveillant et l\'écoute mutuelle entre parents et jeunes sont indispensables pour forger des adultes épanouis';
    arg1Simple = 'les conseils paternels et maternels transmettent une boussole morale indispensable face aux dérives du monde';
    arg1SimpleExplication = 'En effet, l\'amour des parents et leur expérience vécue évitent aux enfants de commettre des erreurs fatales.';
    arg2Simple = 'accorder une liberté progressive aux enfants développe leur sens des responsabilités et leur maturité';
    arg2SimpleExplication = 'En effet, l\'autonomie ne s\'apprend pas dans l\'obéissance aveugle, mais dans la confiance et le respect réciproque.';
    questionSimple = 'en quoi l\'écoute et le respect filial permettent-ils d\'harmoniser les relations entre générations';
    conclusionFerme = 'le dialogue familial fondé sur l\'amour et la confiance mutuelle constitue le garant suprême de l\'équilibre individuel';
  } else if (lower.includes('réseau') || lower.includes('virtuel') || lower.includes('écran') || lower.includes('téléphone') || lower.includes('internet')) {
    themeName = 'l\'impact du monde virtuel et des réseaux sociaux';
    these1 = 'les outils numériques offrent des opportunités exceptionnelles d\'apprentissage et de communication instantanée';
    these1Explication = 'En effet, ils permettent d\'accéder facilement à la connaissance et de maintenir le contact par-delà les frontières géographiques.';
    these2 = 'l\'abus des écrans affaiblit les véritables relations humaines et accentue l\'isolement individuel';
    these2Explication = 'En effet, accumuler des amis virtuels ne remplace jamais les échanges chaleureux dans la réalité et peut enfermer dans l\'anxiété du regard d\'autrui.';
    questionCentrale = 'le monde virtuel favorise-t-il l\'ouverture sur autrui ou conduit-il à un nouvel isolement moderne';
    theseSimpleAvis = 'l\'invasion du virtuel menace l\'authenticité des liens humains et précipite l\'isolement affectif';
    arg1Simple = 'les relations virtuelles sont superficielles et ne remplaceront jamais la présence chaleureuse d\'autrui';
    arg1SimpleExplication = 'En effet, les écrans masquent la réalité des émotions et créent une illusion trompeuse de popularité.';
    arg2Simple = 'la dépendance aux réseaux sociaux fragilise la concentration et nuit à la santé psychologique des jeunes';
    arg2SimpleExplication = 'En effet, la course aux likes et la comparaison permanente engendrent du stress et une sensation de vide intérieur.';
    questionSimple = 'en quoi l\'addiction aux mondes virtuels affaiblit-elle la sociabilité véritable et le bien-être individuel';
    conclusionFerme = 'le retour à des échanges humains réels et sincères est une nécessité urgente face à l\'illusion du tout-virtuel';
  } else if (lower.includes('argent') || lower.includes('riche') || lower.includes('bonheur')) {
    themeName = 'la place de l\'argent dans la quête du bonheur';
    these1 = 'l\'argent est indispensable pour répondre aux besoins fondamentaux et assurer la sécurité de sa famille';
    these1Explication = 'En effet, avoir de quoi se loger, se soigner et se nourrir décemment évite l\'angoisse de la misère au quotidien.';
    these2 = 'la richesse financière ne suffit pas à elle seule pour être heureux et trouver la paix de l\'esprit';
    these2Explication = 'En effet, la santé, l\'amour sincère, l\'amitié et la dignité humaine ne peuvent s\'acheter avec de l\'argent.';
    questionCentrale = 'l\'argent constitue-t-il la véritable clé du bonheur ou une simple condition matérielle d\'existence';
    theseSimpleAvis = 'le véritable bonheur réside dans la richesse du cœur, l\'amitié et la sérénité morale bien plus que dans l\'argent';
    arg1Simple = 'les biens matériels ne peuvent combler le besoin de tendresse, de paix intérieure et d\'amour';
    arg1SimpleExplication = 'En effet, la fortune accumulée n\'achète ni une santé de fer, ni une amitié fidèle, ni la délivrance des remords.';
    arg2Simple = 'l\'obsession de s\'enrichir engendre la cupidité, la méfiance et la division entre les proches';
    arg2SimpleExplication = 'En effet, vivre dans la quête perpétuelle de l\'argent empoisonne les relations humaines et détruit le sens du partage.';
    questionSimple = 'en quoi les richesses spirituelles et affectives surpassent-elles infiniment la fortune matérielle';
    conclusionFerme = 'le bonheur authentique ne se mesure jamais à l\'abondance des richesses matérielles, mais à la pureté des relations humaines';
  } else if (lower.includes('solidarité') || lower.includes('entraide') || lower.includes('voisin')) {
    themeName = 'l\'importance de la solidarité et de l\'entraide sociale';
    these1 = 'l\'entraide et la bienveillance entre concitoyens constituent le ciment indispensable d\'une société apaisée';
    these1Explication = 'En effet, se soutenir mutuellement dans les moments de deuil ou d\'épreuve rend la collectivité plus humaine et plus forte.';
    these2 = 'l\'individualisme croissant et la méfiance tendent parfois à fragiliser ces élans fraternels';
    these2Explication = 'En effet, la recherche du profit personnel ou la peur du jugement d\'autrui poussent souvent les individus à se replier sur eux-mêmes.';
    questionCentrale = 'dans quelle mesure la solidarité demeure-t-elle un devoir fondamental pour préserver le vivre-ensemble';
    theseSimpleAvis = 'la solidarité fraternelle constitue la colonne vertébrale indispensable à toute société digne et fraternelle';
    arg1Simple = 'l\'entraide mutuelle protège les plus faibles contre les aléas cruels de l\'existence';
    arg1SimpleExplication = 'En effet, face à la maladie ou à la misère, le soutien des voisins transforme le malheur individuel en courage partagé.';
    arg2Simple = 'elle combat l\'égoïsme et instaure un climat de confiance et de fraternité durable';
    arg2SimpleExplication = 'En effet, partager son pain et ses peines renforce la concorde civile et élève moralement la communauté.';
    questionSimple = 'en quoi la solidarité active s\'impose-t-elle comme le rempart essentiel contre l\'isolement et la détresse';
    conclusionFerme = 'la solidarité entre les hommes demeure le trésor inaltérable qui donne tout son sens à la vie en société';
  } else if (lower.includes('désobé') || lower.includes('desobe') || lower.includes('loi') || lower.includes('révolte') || lower.includes('revolte') || lower.includes('devoir moral') || lower.includes('créon') || lower.includes('creon')) {
    themeName = 'le devoir de désobéissance morale face à une loi injuste';
    these1 = 'la fidélité à sa conscience et aux devoirs sacrés autorise à refuser les lois tyranniques des hommes';
    these1Explication = 'En effet, la dignité morale exige de s\'insurger contre les ordres arbitraires, quitte à en payer le prix fort.';
    these2 = 'le respect de la loi et de l\'ordre public est indispensable pour préserver la paix civile et éviter l\'anarchie';
    these2Explication = 'En effet, si chaque citoyen décidait d\'obéir uniquement à ses propres règles, la vie en société deviendrait impossible.';
    questionCentrale = 'doit-on privilégier la fidélité absolue à sa conscience ou la soumission aux règles de la cité';
    theseSimpleAvis = 'la conscience morale et la fidélité aux valeurs sacrées surpassent impérativement l\'obéissance aveugle aux lois humaines';
    arg1Simple = 'la dignité d\'un être libre se mesure à sa capacité de refuser l\'injustice et l\'oppression d\'État';
    arg1SimpleExplication = 'En effet, dire « non » face à l\'arbitraire permet de sauvegarder l\'honneur de l\'esprit humain.';
    arg2Simple = 'l\'histoire humaine progresse grâce aux actes de courage qui dénoncent les dérives de l\'autorité';
    arg2SimpleExplication = 'En effet, l\'obéissance passive légitime la tyrannie, alors que l\'insoumission morale réveille les consciences endormies.';
    questionSimple = 'en quoi le refus de la soumission servile constitue-t-il la plus haute preuve de grandeur morale';
    conclusionFerme = 'la voix sacrée de la conscience morale doit toujours prévaloir sur les décrets arbitraires du pouvoir';
  } else if (lower.includes('enfance') || lower.includes('souvenir') || lower.includes('adulte') || lower.includes('nostalgie')) {
    themeName = 'l\'enfance et la nostalgie de l\'innocence perdue';
    these1 = 'l\'enfance représente le paradis de l\'innocence, de la liberté d\'imaginer et de l\'émerveillement spontané';
    these1Explication = 'En effet, l\'enfant n\'est pas encore aliéné par les calculs, les hypocrisies et les soucis matériels qui accablent les adultes.';
    these2 = 'l\'enfance comporte aussi sa part de fragilité, de peurs irrationnelles et de dépendance douloureuse face au monde des grands';
    these2Explication = 'En effet, l\'enfant souffre souvent de ne pas être compris et subit des angoisses qu\'il ne parvient pas toujours à verbaliser.';
    questionCentrale = 'l\'enfance constitue-t-elle l\'âge d\'or de l\'existence ou une étape jalonnée de vulnérabilités méconnues';
    theseSimpleAvis = 'l\'enfance demeure le sanctuaire sacré de l\'innocence et la plus pure période de la vie humaine';
    arg1Simple = 'le regard poétique de l\'enfant enchante le réel et le préserve de la mesquinerie des adultes';
    arg1SimpleExplication = 'En effet, la capacité d\'émerveillement de l\'enfance transforme le moindre objet en trésor et rend le quotidien magique.';
    arg2Simple = 'les souvenirs lumineux forgés durant l\'enfance constituent le socle inaltérable qui réconforte l\'adulte à jamais';
    arg2SimpleExplication = 'En effet, puiser dans la tendresse de ses premières années apporte une force morale indispensable pour affronter les épreuves futures.';
    questionSimple = 'en quoi l\'enfance s\'impose-t-elle comme le refuge le plus précieux de notre mémoire affective';
    conclusionFerme = 'l\'innocence de l\'enfance demeure la boussole lumineuse qui préserve l\'humanité dans le cœur de chaque adulte';
  } else if (lower.includes('campagne') || lower.includes('village') || lower.includes('ville') || lower.includes('nature') || lower.includes('rural')) {
    themeName = 'le choix entre la quiétude de la campagne et les opportunités de la ville';
    these1 = 'la campagne offre une vie saine, paisible et harmonieuse, loin de la pollution et du stress moderne';
    these1Explication = 'En effet, le contact direct avec la nature et la simplicité des rapports humains procurent une véritable sérénité d\'esprit.';
    these2 = 'la grande ville offre des infrastructures médicales, éducatives et culturelles indispensables au progrès individuel';
    these2Explication = 'En effet, l\'accès aux universités, aux emplois qualifiés et aux services publics s\'avère bien plus aisé en milieu urbain.';
    questionCentrale = 'vaut-il mieux privilégier la tranquillité rurale ou s\'orienter vers le dynamisme citadin';
    theseSimpleAvis = 'la vie en milieu naturel et rural offre les conditions les plus favorables à un bonheur authentique et durable';
    arg1Simple = 'le calme de la nature préserve la santé physique et libère l\'esprit des agressions du monde urbain';
    arg1SimpleExplication = 'En effet, respirer un air pur et vivre à un rythme humain évite les angoisses et les maladies générées par la vie citadine.';
    arg2Simple = 'la proximité fraternelle et la solidarité sont bien plus vivantes dans un village que dans l\'anonymat urbain';
    arg2SimpleExplication = 'En effet, les liens de voisinage ruraux reposent sur la sincérité et l\'entraide, loin de l\'individualisme des métropoles.';
    questionSimple = 'en quoi le retour à la terre et à la simplicité rurale constitue-t-il la réponse la plus sage au mal-être contemporain';
    conclusionFerme = 'la sérénité de la vie simple au contact de la nature surpasse de loin les mirages artificiels des grandes villes';
  } else if (lower.includes('travail') || lower.includes('métier') || lower.includes('effort') || lower.includes('dignité') || lower.includes('pauvret')) {
    themeName = 'la dignité par le travail et le refus de la déchéance morale';
    these1 = 'le travail honnête et acharné est le seul moyen de préserver son honneur et son indépendance financière';
    these1Explication = 'En effet, gagner sa subsistance à la sueur de son front protège l\'homme de la mendicité et lui confère le respect de ses pairs.';
    these2 = 'la dureté du labeur manuel peut parfois user prématurément le corps et priver l\'être de loisirs essentiels';
    these2Explication = 'En effet, des conditions de travail pénibles ou mal rémunérées peuvent engendrer une fatigue épuisante qui pèse sur l\'épanouissement personnel.';
    questionCentrale = 'le travail manuel doit-il être envisagé comme la source suprême de la dignité ou comme un fardeau aliénant';
    theseSimpleAvis = 'le travail honnête constitue le pilier fondamental de la fierté individuelle et de l\'honneur familial';
    arg1Simple = 'l\'effort personnel et le métier traditionnel garantissent l\'autonomie morale sans dépendre de quiconque';
    arg1SimpleExplication = 'En effet, refuser la facilité et travailler dignement préserve la famille de la honte de l\'endettement.';
    arg2Simple = 'le labeur confère à l\'homme une stature morale respectable au sein de sa communauté';
    arg2SimpleExplication = 'En effet, celui qui gagne sa vie honnêtement s\'attire l\'estime sincère de ses semblables et transmet un exemple lumineux à ses enfants.';
    questionSimple = 'en quoi l\'attachement au travail digne demeure-t-il le plus sûr rempart contre la déchéance et l\'humiliation';
    conclusionFerme = 'la dignité acquise par l\'effort honnête et le travail courageux reste la plus inaliénable des richesses';
  } else if (lower.includes('pardon') || lower.includes('vengeance') || lower.includes('haine') || lower.includes('rancune')) {
    themeName = 'le pardon face à la soif de vengeance et de haine';
    these1 = 'le pardon et la réconciliation permettent d\'apaiser les cœurs et de briser le cycle infini de la violence';
    these1Explication = 'En effet, pardonner n\'est pas un signe de faiblesse, mais une force morale supérieure qui libère l\'être de l\'amertume destructrice.';
    these2 = 'le sentiment de justice blessée exige parfois une sanction exemplaire pour réparer le tort subi';
    these2Explication = 'En effet, laisser un affront impuni peut encourager la récidive et créer une frustration légitime chez la victime.';
    questionCentrale = 'le pardon constitue-t-il la plus haute preuve de grandeur d\'âme ou une faiblesse face à l\'injustice';
    theseSimpleAvis = 'la noblesse du pardon et le refus de la haine surpassent infiniment les dérives amères de la vengeance';
    arg1Simple = 'la vengeance détruit celui qui l\'exerce en l\'enfermant dans une spirale d\'animosité stérile';
    arg1SimpleExplication = 'En effet, céder à la rancune ronge la paix intérieure et n\'efface jamais la douleur du mal déjà commis.';
    arg2Simple = 'le pardon élève la conscience humaine et restaure la fraternité indispensable à la vie collective';
    arg2SimpleExplication = 'En effet, savoir pardonner désamorce les conflits et ouvre la voie à une réconciliation durable et digne.';
    questionSimple = 'en quoi le choix du pardon s\'impose-t-il comme le chemin le plus lumineux vers la paix de l\'esprit';
    conclusionFerme = 'la grandeur de l\'âme humaine réside dans sa capacité souveraine à préférer le pardon à la vengeance aveugle';
  } else if (lower.includes('femme') || lower.includes('mariage') || lower.includes('épous') || lower.includes('fille')) {
    themeName = 'la condition de la femme et la liberté du choix matrimonial';
    these1 = 'la femme a le droit inaliénable de décider de son destin et de consentir librement à son mariage';
    these1Explication = 'En effet, imposer une union sans amour ni consentement mutuel viole la dignité de la personne et hypothèque son bonheur futur.';
    these2 = 'le respect des coutumes familiales et des alliances traditionnelles vise souvent à préserver la réputation du clan';
    these2Explication = 'En effet, les aînés cherchent fréquemment à assurer la sécurité financière de leur fille selon les codes ancestraux.';
    questionCentrale = 'faut-il subordonner le mariage aux intérêts de la famille ou consacrer le libre choix de la femme';
    theseSimpleAvis = 'l\'émancipation de la femme et son plein droit au libre choix constituent un impératif éthique et social indiscutable';
    arg1Simple = 'le consentement sincère des époux est le seul fondement solide d\'un foyer harmonieux et épanoui';
    arg1SimpleExplication = 'En effet, un mariage forcé engendre l\'amertume, la solitude morale et la dislocation progressive de la famille.';
    arg2Simple = 'l\'épanouissement de toute société moderne exige la reconnaissance de la pleine dignité féminine';
    arg2SimpleExplication = 'En effet, une communauté qui prive ses femmes d\'autonomie et d\'éducation se condamne à la stagnation et à l\'injustice.';
    questionSimple = 'en quoi le respect des droits de la femme est-il indispensable pour bâtir une société équitable et moderne';
    conclusionFerme = 'la liberté de conscience et l\'autonomie des femmes représentent le pilier inviolable du progrès et de la justice humaine';
  } else if (lower.includes('fête') || lower.includes('achoura') || lower.includes('joie') || lower.includes('célébr')) {
    themeName = 'la célébration des fêtes traditionnelles et la joie partagée';
    these1 = 'les fêtes comme l\'Achoura illuminent le quotidien modeste et renforcent les liens fraternels et familiaux';
    these1Explication = 'En effet, les préparatifs joyeux, les cadeaux offerts et les chants dissipent les soucis ordinaires et réchauffent les foyers.';
    these2 = 'les dépenses occasionnées par ces festivités peuvent parfois fragiliser le budget des familles démunies';
    these2Explication = 'En effet, la pression sociale pousse certains parents à s\'endetter lourdement pour sauver les apparences au détriment de l\'essentiel.';
    questionCentrale = 'les fêtes traditionnelles représentent-elles une source pure de bonheur collectif ou une charge financière pesante';
    theseSimpleAvis = 'les moments de fête et de partage constituent un trésor inestimable qui transcende les difficultés de l\'existence';
    arg1Simple = 'la joie des fêtes insuffle un élan d\'espoir et d\'émerveillement indispensable à l\'équilibre moral des enfants';
    arg1SimpleExplication = 'En effet, les souvenirs lumineux d\'une fête réussie illuminent la mémoire et forgent un attachement affectif ineffaçable.';
    arg2Simple = 'ces célébrations raniment les traditions de générosité, de pardon mutuel et d\'entraide chaleureuse';
    arg2SimpleExplication = 'En effet, partager des douceurs et visiter ses proches abolit les rancunes et resserre la communauté humaine.';
    questionSimple = 'en quoi la ferveur des fêtes traditionnelles revitalise-t-elle le lien social et la mémoire affective';
    conclusionFerme = 'la magie des fêtes collectives demeure le refuge le plus précieux de notre patrimoine culturel et émotionnel';
  } else if (lower.includes('amitié') || lower.includes('ami') || lower.includes('trahison') || lower.includes('confiance')) {
    themeName = 'la valeur de l\'amitié véritable et l\'épreuve de la confiance';
    these1 = 'une amitié sincère et désintéressée est le plus précieux des réconforts face aux épreuves de la vie';
    these1Explication = 'En effet, pouvoir confier ses doutes et ses joies à un ami fidèle brise la solitude et double le courage.';
    these2 = 'la déception amicale ou la trahison peut causer des blessures affectives plus cruelles que l\'hostilité déclarée';
    these2Explication = 'En effet, voir sa confiance trahie par un proche ébranle durablement la foi en l\'humanité et incite au repli sur soi.';
    questionCentrale = 'l\'amitié authentique est-elle le refuge le plus sûr ou expose-t-elle à des déceptions douloureuses';
    theseSimpleAvis = 'l\'amitié véritable et la loyauté morale représentent le plus noble des trésors de l\'existence humaine';
    arg1Simple = 'un véritable ami offre un soutien moral inconditionnel qui transcende les vicissitudes matérielles';
    arg1SimpleExplication = 'En effet, dans la maladie ou le revers de fortune, la présence loyale d\'un ami fidèle vaut tous les biens du monde.';
    arg2Simple = 'la sincérité partagée permet de s\'élever mutuellement par des conseils lucides et bienveillants';
    arg2SimpleExplication = 'En effet, un ami authentique n\'hésite pas à dire la vérité avec tendresse pour aider l\'autre à progresser.';
    questionSimple = 'en quoi la fidélité en amitié constitue-t-elle le rempart le plus solide contre l\'isolement moral';
    conclusionFerme = 'la loyauté et l\'amour fraternel en amitié demeurent le sommet de la noblesse d\'âme et de l\'éthique humaine';
  } else if (clean.length > 5) {
    // Extraction dynamique ultra-précise de la consigne pour éviter tout "Hors-Sujet"
    const quoteMatch = clean.match(/«([^»]+)»/) || clean.match(/"([^"]+)"/);
    const explicitQuote = quoteMatch ? quoteMatch[1].trim() : '';

    const cleanedTopic = explicitQuote || clean
      .replace(/^sujet\s*:\s*/i, '')
      .replace(/^consigne\s*:\s*/i, '')
      .replace(/partagez-vous (ce|cet) (point de vue|avis)\s*\??/gi, '')
      .replace(/qu['’]en pensez-vous\s*\??/gi, '')
      .replace(/êtes-vous d['’]accord avec cette affirmation\s*\??/gi, '')
      .replace(/dans quelle mesure\s*\??/gi, '')
      .replace(/rédigez un texte argumentatif[^\n.]*?[.:?]/gi, '')
      .replace(/à l['’]aide d['’]arguments pertinents[^\n.]*?[.:?]/gi, '')
      .trim();

    const shortExcerpt = cleanedTopic.length > 12 ? cleanedTopic : clean;
    const coreClaim = shortExcerpt.replace(/[.?!\s]+$/, '').trim();

    themeName = `la question de savoir si « ${coreClaim} »`;
    these1 = `l'affirmation selon laquelle « ${coreClaim} » repose sur des fondements solides et légitimes`;
    these1Explication = `En effet, souscrire à cette idée permet d'éclairer nos choix quotidiens et de préserver un cap moral en parfaite adéquation avec le sujet imposé.`;
    these2 = `concernant la réflexion sur « ${coreClaim} », il convient de nuancer ce jugement face à d'autres réalités complémentaires`;
    these2Explication = `En effet, ériger cette seule vision en vérité exclusive sans examiner ses limites concrètes risque d'occulter des aspects déterminants du problème.`;
    questionCentrale = `dans quelle mesure l'affirmation selon laquelle « ${coreClaim} » s'impose-t-elle comme une vérité indiscutable`;
    theseSimpleAvis = `l'affirmation affirmant que « ${coreClaim} » constitue une certitude inébranlable et salutaire`;
    arg1Simple = `défendre résolument que « ${coreClaim} » répond à une exigence éthique et humaine fondamentale directement ancrée dans le sujet`;
    arg1SimpleExplication = `En effet, rester fidèle à ce principe protège la dignité de l'individu et donne un sens rigoureux à son engagement personnel.`;
    arg2Simple = `en outre, considérer que « ${coreClaim} » favorise l'harmonie et l'équilibre individuel face aux pressions extérieures`;
    arg2SimpleExplication = `En effet, une telle conviction prémunit contre les compromissions faciles et consolide l'autonomie morale de chacun.`;
    questionSimple = `en quoi soutenir avec force que « ${coreClaim} » s'impose-t-il comme une évidence méthodologique et morale`;
    conclusionFerme = `l'idée selon laquelle « ${coreClaim} » triomphe avec éclat et doit guider nos convictions avec une détermination sans faille`;
  }

  return {
    cleanSubject: clean,
    themeName,
    these1,
    these2,
    these1Explication,
    these2Explication,
    questionCentrale,
    oeuvreProbable: oeuvre,
    theseSimpleAvis,
    arg1Simple,
    arg1SimpleExplication,
    arg2Simple,
    arg2SimpleExplication,
    questionSimple,
    conclusionFerme,
  };
}

export const AtelierProduction: React.FC<AtelierProductionProps> = ({
  sujet,
  isSubjectValidated,
  activeSubjectItem,
  initialPlanType,
  onInjectContent,
  onClose,
}) => {
  // Analyse sémantique continue du sujet
  const subjectAnalysis = useMemo(() => analyzeSubjectText(sujet, activeSubjectItem), [sujet, activeSubjectItem]);

  const [selectedOeuvre, setSelectedOeuvre] = useState<string>(() => {
    if (activeSubjectItem?.oeuvre && OEUVRES_DATA[activeSubjectItem.oeuvre]) {
      return activeSubjectItem.oeuvre;
    }
    return subjectAnalysis.oeuvreProbable;
  });

  const [currentStep, setCurrentStep] = useState<EtapeId>('PLAN');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(() => {
    return (activeSubjectItem?.typePlanSuggere === 'Plan Simple' || initialPlanType === 'SIMPLE')
      ? 'SIMPLE'
      : 'DIALECTIQUE';
  });

  const [selectedStance, setSelectedStance] = useState<'A' | 'B'>('A');

  // Champs de l'Introduction (avec les 4 étapes exactes demandées pour le plan dialectique)
  // 1. Accroche / Sujet amené
  const [introAccroche, setIntroAccroche] = useState('');
  // 2. Confrontation des thèses : "Certains... d'autres en revanche estiment..."
  const [introTheses, setIntroTheses] = useState('');
  // 3. Problématique / Sujet posé
  const [introProblematique, setIntroProblematique] = useState('');
  // 4. Annonce du Plan / Sujet divisé
  const [introAnnoncePlan, setIntroAnnoncePlan] = useState('');
  const [introValidatedText, setIntroValidatedText] = useState('');

  // Champs du Développement Axe 1
  const [dev1Amorce, setDev1Amorce] = useState('En premier lieu, ');
  const [dev1Argument, setDev1Argument] = useState('');
  const [dev1Explication, setDev1Explication] = useState('En effet, ');
  const [dev1Exemple, setDev1Exemple] = useState('');
  const [dev1ValidatedText, setDev1ValidatedText] = useState('');

  // Champs du Développement Axe 2
  const [dev2Amorce, setDev2Amorce] = useState(
    selectedPlan === 'DIALECTIQUE' ? 'Cependant, en revanche, ' : 'D\'autre part, en second lieu, '
  );
  const [dev2Argument, setDev2Argument] = useState('');
  const [dev2Explication, setDev2Explication] = useState('En effet, ');
  const [dev2Exemple, setDev2Exemple] = useState('');
  const [dev2ValidatedText, setDev2ValidatedText] = useState('');

  // Champs de la Conclusion
  const [conclBilan, setConclBilan] = useState('En définitive, ');
  const [conclPointDeVue, setConclPointDeVue] = useState('');
  const [conclOuverture, setConclOuverture] = useState('');
  const [conclValidatedText, setConclValidatedText] = useState('');

  // Synchronisation dynamique dès que le sujet ou ses métadonnées changent
  useEffect(() => {
    if (activeSubjectItem?.oeuvre && OEUVRES_DATA[activeSubjectItem.oeuvre]) {
      setSelectedOeuvre(activeSubjectItem.oeuvre);
    } else if (subjectAnalysis.oeuvreProbable && OEUVRES_DATA[subjectAnalysis.oeuvreProbable]) {
      setSelectedOeuvre(subjectAnalysis.oeuvreProbable);
    }

    const planToSet: PlanType = (activeSubjectItem?.typePlanSuggere === 'Plan Simple' || initialPlanType === 'SIMPLE')
      ? 'SIMPLE'
      : 'DIALECTIQUE';
    setSelectedPlan(planToSet);

    if (planToSet === 'SIMPLE') {
      setDev2Amorce("D'autre part, en second lieu, ");
      setConclBilan("D'après ce qui précède, je confirme tenacement que ");
    } else {
      setDev2Amorce("Cependant, en revanche, ");
      setConclBilan("En définitive, ");
    }

    // Réinitialiser les champs pour suivre à 100% le nouveau sujet chargé
    setIntroAccroche('');
    setIntroTheses('');
    setIntroProblematique('');
    setIntroAnnoncePlan('');
    setDev1Argument('');
    setDev1Explication('En effet, ');
    setDev1Exemple('');
    setDev2Argument('');
    setDev2Explication('En effet, ');
    setDev2Exemple('');
    setConclPointDeVue('');
    setConclOuverture('');
    setShowReformulations(false);
    setSelectedStance('A');
  }, [sujet, activeSubjectItem, initialPlanType]);

  // Valeurs de Plan Simple selon le choix de position de l'élève (Option A ou Option B)
  const currentSimpleAvis = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.theseSimpleAvisAlt) {
      return subjectAnalysis.theseSimpleAvisAlt;
    }
    return subjectAnalysis.theseSimpleAvis;
  }, [selectedStance, subjectAnalysis]);

  const currentArg1Simple = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.arg1SimpleAlt) {
      return subjectAnalysis.arg1SimpleAlt;
    }
    return subjectAnalysis.arg1Simple;
  }, [selectedStance, subjectAnalysis]);

  const currentArg1SimpleExplication = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.arg1SimpleExplicationAlt) {
      return subjectAnalysis.arg1SimpleExplicationAlt;
    }
    return subjectAnalysis.arg1SimpleExplication;
  }, [selectedStance, subjectAnalysis]);

  const currentArg2Simple = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.arg2SimpleAlt) {
      return subjectAnalysis.arg2SimpleAlt;
    }
    return subjectAnalysis.arg2Simple;
  }, [selectedStance, subjectAnalysis]);

  const currentArg2SimpleExplication = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.arg2SimpleExplicationAlt) {
      return subjectAnalysis.arg2SimpleExplicationAlt;
    }
    return subjectAnalysis.arg2SimpleExplication;
  }, [selectedStance, subjectAnalysis]);

  const currentQuestionSimple = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.questionSimpleAlt) {
      return subjectAnalysis.questionSimpleAlt;
    }
    return subjectAnalysis.questionSimple;
  }, [selectedStance, subjectAnalysis]);

  const currentConclusionFerme = useMemo(() => {
    if (selectedStance === 'B' && subjectAnalysis.hasDualOptions && subjectAnalysis.conclusionFermeAlt) {
      return subjectAnalysis.conclusionFermeAlt;
    }
    return subjectAnalysis.conclusionFerme;
  }, [selectedStance, subjectAnalysis]);

  const oeuvreIntroPhrase = useMemo(() => {
    if (selectedOeuvre === 'La Boîte à Merveilles') {
      return `Dans l'œuvre « La Boîte à Merveilles » d'Ahmed Sefrioui`;
    } else if (selectedOeuvre === 'Antigone') {
      return `Dans la pièce tragique « Antigone » de Jean Anouilh`;
    } else if (selectedOeuvre === 'Le Dernier Jour d’un Condamné') {
      return `Dans l'œuvre engagée « Le Dernier Jour d’un Condamné » de Victor Hugo`;
    }
    return `Dans la littérature comme au sein des débats de société`;
  }, [selectedOeuvre]);

  // État des 2 variantes de reformulation
  const [showReformulations, setShowReformulations] = useState<boolean>(false);
  const [reformulationStep, setReformulationStep] = useState<EtapeId | null>(null);
  const [varianteA, setVarianteA] = useState('');
  const [varianteB, setVarianteB] = useState('');
  const [selectedVariante, setSelectedVariante] = useState<'A' | 'B' | null>(null);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Détection dynamique des exemples adaptés à l'argument du candidat pour l'Axe 1
  const matchingAxe1 = useMemo(() => {
    return findExamplesMatchingArgument(
      dev1Argument || (selectedPlan === 'SIMPLE' ? currentArg1Simple : subjectAnalysis.these1),
      selectedOeuvre,
      'these'
    );
  }, [dev1Argument, selectedOeuvre, selectedPlan, currentArg1Simple, subjectAnalysis.these1]);

  // 2. Détection dynamique des exemples adaptés à l'argument du candidat pour l'Axe 2
  const matchingAxe2 = useMemo(() => {
    return findExamplesMatchingArgument(
      dev2Argument || (selectedPlan === 'SIMPLE' ? currentArg2Simple : subjectAnalysis.these2),
      selectedOeuvre,
      selectedPlan === 'DIALECTIQUE' ? 'antithese' : 'these'
    );
  }, [dev2Argument, selectedOeuvre, selectedPlan, currentArg2Simple, subjectAnalysis.these2]);

  // Modèles d'arguments clairs et bien expliqués en langage simple pour l'Axe 1 et l'Axe 2
  const modelArgsAxe1 = useMemo(() => {
    return getModelArgumentsForTheme(
      subjectAnalysis.themeName,
      selectedOeuvre,
      'these',
      selectedPlan,
      selectedStance
    );
  }, [subjectAnalysis.themeName, selectedOeuvre, selectedPlan, selectedStance]);

  const modelArgsAxe2 = useMemo(() => {
    return getModelArgumentsForTheme(
      subjectAnalysis.themeName,
      selectedOeuvre,
      selectedPlan === 'DIALECTIQUE' ? 'antithese' : 'these',
      selectedPlan,
      selectedStance
    );
  }, [subjectAnalysis.themeName, selectedOeuvre, selectedPlan, selectedStance]);

  // Insertion d'un modèle d'argument complet et clair en un clic
  const handleApplyModelArgument = (model: ModelArgument, axe: 1 | 2) => {
    if (axe === 1) {
      setDev1Argument(model.argumentClair);
      setDev1Explication(model.explicationSimple);
      setDev1Exemple(model.exempleAssocie);
      showToast('Argument modèle clair, explication et exemple insérés dans l\'Axe 1 !');
    } else {
      setDev2Argument(model.argumentClair);
      setDev2Explication(model.explicationSimple);
      setDev2Exemple(model.exempleAssocie);
      showToast(
        selectedPlan === 'SIMPLE'
          ? '2ème Argument clair, explication et exemple insérés dans l\'Axe 2 !'
          : 'Contre-argument clair, explication et exemple insérés dans l\'Axe 2 !'
      );
    }
  };

  // Insertion directe d'un connecteur ou d'une étiquette dans le champ actif
  const handleInsertTag = (tagText: string) => {
    if (currentStep === 'INTRO') {
      if (!introAccroche) setIntroAccroche((prev) => prev + tagText);
      else if (!introTheses) setIntroTheses((prev) => prev + tagText);
      else if (!introProblematique) setIntroProblematique((prev) => prev + tagText);
      else setIntroAnnoncePlan((prev) => prev + tagText);
    } else if (currentStep === 'DEV_AXE1') {
      if (!dev1Argument) setDev1Argument((prev) => prev + tagText);
      else if (!dev1Exemple) setDev1Exemple((prev) => prev + tagText);
      else setDev1Explication((prev) => prev + tagText);
    } else if (currentStep === 'DEV_AXE2') {
      if (!dev2Argument) setDev2Argument((prev) => prev + tagText);
      else if (!dev2Exemple) setDev2Exemple((prev) => prev + tagText);
      else setDev2Explication((prev) => prev + tagText);
    } else if (currentStep === 'CONCL') {
      if (!conclPointDeVue) setConclPointDeVue((prev) => prev + tagText);
      else setConclOuverture((prev) => prev + tagText);
    } else {
      onInjectContent(' ' + tagText + ' ', 'insert');
    }
    showToast(`« ${tagText.slice(0, 28)}... » inséré avec succès !`);
  };

  // Construction du texte brut de l'introduction
  const buildCurrentIntroText = () => {
    const parts = [
      introAccroche.trim(),
      introTheses.trim(),
      introProblematique.trim(),
      introAnnoncePlan.trim(),
    ].filter(Boolean);
    return parts.join(' ');
  };

  // Génération des 2 variantes de reformulation 100% fidèles au sujet,
  // avec des arguments clairs, bien expliqués et formulés dans un langage simple et fort.
  const generateTwoVariants = (step: EtapeId) => {
    setReformulationStep(step);
    setShowReformulations(true);
    setSelectedVariante(null);

    const theme = subjectAnalysis.themeName;
    const t1 = subjectAnalysis.these1;
    const t1Exp = subjectAnalysis.these1Explication;
    const t2 = subjectAnalysis.these2;
    const t2Exp = subjectAnalysis.these2Explication;
    const qCentral = subjectAnalysis.questionCentrale;

    if (step === 'INTRO') {
      if (selectedPlan === 'DIALECTIQUE') {
        // Variante 1 : Clarté & Simplicité Directe (Vocabulaire accessible, arguments nets et bien expliqués)
        setVarianteA(
          `De nos jours, ${theme} occupe une place centrale dans les débats actuels. Si certains affirment avec conviction que ${t1}, d'autres en revanche estiment au contraire que ${t2}. Dès lors, ${qCentral} ? Afin de répondre clairement à cette question, nous examinerons d'abord les raisons qui soutiennent la première idée, avant d'aborder dans un second temps les nuances et les réserves nécessaires.`
        );

        // Variante 2 : Élégance & Nuance Académique (50% soutenu / 50% simple et fort, structure officielle)
        setVarianteB(
          `Force est de constater que la problématique inhérente à ${theme} interpelle profondément notre société contemporaine. Tandis qu'une partie de l'opinion défend l'idée selon laquelle ${t1}, une analyse plus attentive conduit d'autres observateurs à soutenir en revanche que ${t2}. Il importe dès lors de s'interroger : ${qCentral} ? Pour éclairer cette réflexion, nous mettrons en lumière dans un premier temps le bien-fondé de cette position, avant d'en mesurer dans un second temps les limites légitimes.`
        );
      } else {
        // Plan Simple : Plaidoyer et défense résolue du point de vue personnel ancré dans l'œuvre avec annonce des 2 arguments
        const avis = currentSimpleAvis;
        const arg1 = dev1Argument.trim() || currentArg1Simple;
        const arg2 = dev2Argument.trim() || currentArg2Simple;
        const qSimple = currentQuestionSimple;

        // Variante 1 : Clarté & Simplicité Directe
        setVarianteA(
          `${oeuvreIntroPhrase}, la réflexion autour de ${theme} occupe une place prépondérante. Pour ma part, je partage pleinement ce point de vue et je soutiens fermement que ${avis}. Dès lors, ${qSimple} ? Afin de justifier cette conviction avec méthode, nous démontrerons d'abord que ${arg1}, avant d'expliquer dans un second temps que ${arg2}.`
        );

        // Variante 2 : Élégance Équilibrée 50/50
        setVarianteB(
          `${oeuvreIntroPhrase}, la problématique relative à ${theme} interpelle notre réflexion avec une remarquable acuité. Loin de toute hésitation, j'adhère sans réserve à la thèse affirmant que ${avis}. Il convient dès lors de poser la question essentielle : par quelles raisons cette conception s'impose-t-elle comme une certitude ? Pour éclairer cette réflexion, nous mettrons d'abord en lumière le fait que ${arg1}, puis nous soulignerons combien ${arg2}.`
        );
      }
    } else if (step === 'DEV_AXE1') {
      // Nettoyage et explicitation claire de l'argument du candidat
      const rawArg = dev1Argument.trim();
      const rawExpl = dev1Explication.trim();
      const rawEx = dev1Exemple.trim();

      const finalArg = rawArg || (selectedPlan === 'SIMPLE' ? currentArg1Simple : t1);
      const finalExpl = rawExpl && rawExpl !== 'En effet,' && rawExpl !== 'En effet, '
        ? rawExpl
        : (selectedPlan === 'SIMPLE' ? currentArg1SimpleExplication : t1Exp);

      // Exemple suivant l'argument : si l'élève n'a pas encore saisi d'exemple, on prend le meilleur exemple détecté
      const finalEx = rawEx || (matchingAxe1.bestMatch ? matchingAxe1.bestMatch.phraseComplete : `Comme l'illustre un épisode marquant de « ${selectedOeuvre} »`);

      // Variante 1 : Clarté & Simplicité directe (Langage simple, argument limpide, explication causale concrète)
      setVarianteA(
        `${dev1Amorce}il apparaît indéniable que ${finalArg}. ${finalExpl} ${finalEx}, ce qui prouve avec clarté la justesse de cette idée.`
      );

      // Variante 2 : Élégance équilibrée 50/50 (Tournure soignée, registre académique accessible, explication approfondie)
      setVarianteB(
        `${dev1Amorce}force est de reconnaître la pertinence de l'argument selon lequel ${finalArg}. ${finalExpl} C'est précisément ce que confirme ${finalEx}, attestant que cette vérité transcende les époques et consolide notre réflexion.`
      );
    } else if (step === 'DEV_AXE2') {
      const rawArg = dev2Argument.trim();
      const rawExpl = dev2Explication.trim();
      const rawEx = dev2Exemple.trim();

      if (selectedPlan === 'DIALECTIQUE') {
        const finalArg = rawArg || t2;
        const finalExpl = rawExpl && rawExpl !== 'En effet,' && rawExpl !== 'En effet, '
          ? rawExpl
          : t2Exp;
        const finalEx = rawEx || (matchingAxe2.bestMatch ? matchingAxe2.bestMatch.phraseComplete : `À cet égard, une scène éloquente de « ${selectedOeuvre} »`);

        // Variante 1 : Clarté & Simplicité (Antithèse)
        setVarianteA(
          `${dev2Amorce}il convient de souligner que ${finalArg}. ${finalExpl} ${finalEx}, montrant ainsi que cette réalité ne doit pas être jugée de manière unilatérale.`
        );

        // Variante 2 : Élégance académique 50/50 (Antithèse)
        setVarianteB(
          `${dev2Amorce}il serait réducteur d'occulter le fait que ${finalArg}. ${finalExpl} ${finalEx}, prouvant avec éloquence que la lucidité exige de mesurer les contrepoids indispensables à tout jugement équilibré.`
        );
      } else {
        // Plan Simple : 2ème argument complémentaire qui fortifie la même thèse (aucune antithèse)
        const finalArg = rawArg || currentArg2Simple;
        const finalExpl = rawExpl && rawExpl !== 'En effet,' && rawExpl !== 'En effet, '
          ? rawExpl
          : currentArg2SimpleExplication;
        const finalEx = rawEx || (matchingAxe2.bestMatch ? matchingAxe2.bestMatch.phraseComplete : `À ce propos, un exemple significatif de « ${selectedOeuvre} »`);

        // Variante 1 : Clarté & Simplicité (Progression)
        setVarianteA(
          `${dev2Amorce}il convient d'ajouter que ${finalArg}. ${finalExpl} ${finalEx}, ce qui consolide notre démonstration en lui apportant un second fondement solide.`
        );

        // Variante 2 : Élégance 50/50 (Progression)
        setVarianteB(
          `${dev2Amorce}cette première analyse trouve un prolongement décisif dans le fait que ${finalArg}. ${finalExpl} C'est précisément ce que confirme ${finalEx}, attestant avec éclat la solidité de notre point de vue.`
        );
      }
    } else if (step === 'CONCL') {
      // Nettoyage rigoureux pour éviter toute répétition de formules (ex: "je confirme" ou "d'après ce qui précède")
      const cleanPointDeVue = (raw: string) => {
        return raw
          .trim()
          .replace(/^d['’]après ce qui précède,?\s*/i, '')
          .replace(/^au terme de (cette réflexion|notre analyse|notre réflexion),?\s*/i, '')
          .replace(/^en définitive,?\s*/i, '')
          .replace(/^en somme,?\s*/i, '')
          .replace(/^pour conclure,?\s*/i, '')
          .replace(/^à la lumière de (la démonstration|ce) qui précède,?\s*/i, '')
          .replace(/^je confirme tenacement (que\s*)?/i, '')
          .replace(/^je confirme (que\s*)?/i, '')
          .replace(/^je soutiens fermement (que\s*)?/i, '')
          .replace(/^je soutiens sans réserve (que\s*)?/i, '')
          .replace(/^il apparaît incontestable (que\s*)?/i, '')
          .replace(/^il est indéniable (que\s*)?/i, '')
          .replace(/^pour ma part,?\s*/i, '')
          .replace(/^en ce qui me concerne,?\s*/i, '')
          .replace(/^j['’]estime (que\s*)?/i, '')
          .replace(/^je demeure convaincu (que\s*)?/i, '')
          .replace(/^que\s+/i, '')
          .trim();
      };

      const rawPvdDialectique = conclPointDeVue.trim() || `le juste équilibre entre respect des principes et discernement personnel doit guider notre jugement sur ${theme}`;
      const rawPvdSimple = conclPointDeVue.trim() || currentConclusionFerme;
      const cleanPvdDialectique = cleanPointDeVue(rawPvdDialectique);
      const cleanPvdSimple = cleanPointDeVue(rawPvdSimple);

      const ouv = conclOuverture.trim() || (selectedPlan === 'SIMPLE'
        ? 'Dès lors, comment encourager chaque individu à cultiver cette autonomie face aux pressions extérieures ?'
        : 'Dès lors, comment les générations futures sauront-elles concilier ces exigences face aux nouveaux défis contemporains ?');

      if (selectedPlan === 'SIMPLE') {
        // Plan Simple : Zéro nuance ! Réaffirmation catégorique et tenace du point de vue personnel défendu
        // Variante 1 : « Clarté & Fermeté Directe » (formulation unique et limpide, sans AUCUNE répétition de "je confirme")
        setVarianteA(
          `D'après ce qui précède, je confirme tenacement que ${cleanPvdSimple}. L'ensemble des arguments développés et les illustrations de « ${selectedOeuvre} » prouvent sans l'ombre d'un doute la justesse de cette prise de position. ${ouv}`
        );

        // Variante 2 : « Élégance & Conviction Inébranlable 50/50 »
        setVarianteB(
          `En définitive, à la lumière de la démonstration rigoureuse qui précède, il apparaît incontestable que ${cleanPvdSimple}. Dès lors, je soutiens avec une conviction inébranlable et sans la moindre réserve la validité de ce point de vue personnel. Une perspective stimulante demeure toutefois ouverte : ${ouv}`
        );
      } else {
        // Plan Dialectique : Synthèse équilibrée
        setVarianteA(
          `En définitive, au terme de notre réflexion sur ${theme}, il apparaît clairement que ces deux points de vue se complètent et s'éclairent mutuellement. Pour ma part, j'estime que ${cleanPvdDialectique}. ${ouv}`
        );
        setVarianteB(
          `Au terme de cette réflexion, l'examen attentif de cette problématique permet de dégager une synthèse équilibrée et féconde. En ce qui me concerne, je demeure convaincu que ${cleanPvdDialectique}. Dès lors, une question essentielle demeure ouverte : ${ouv}`
        );
      }
    }
  };

  // Validation d'une variante choisie et passage à l'étape suivante
  const handleApplyVariant = (chosenText: string) => {
    if (reformulationStep === 'INTRO') {
      setIntroValidatedText(chosenText);
      onInjectContent(chosenText + '\n\n', 'append');
      setCurrentStep('DEV_AXE1');
    } else if (reformulationStep === 'DEV_AXE1') {
      setDev1ValidatedText(chosenText);
      onInjectContent('  ' + chosenText + '\n\n', 'append');
      setCurrentStep('DEV_AXE2');
    } else if (reformulationStep === 'DEV_AXE2') {
      setDev2ValidatedText(chosenText);
      onInjectContent('  ' + chosenText + '\n\n', 'append');
      setCurrentStep('CONCL');
    } else if (reformulationStep === 'CONCL') {
      setConclValidatedText(chosenText);
      onInjectContent(chosenText, 'append');
      setCurrentStep('FINAL');
    }
    setShowReformulations(false);
    showToast('Étape validée et transférée dans votre manuscrit !');
  };

  const oeuvreActiveData = OEUVRES_DATA[selectedOeuvre] || OEUVRES_DATA['La Boîte à Merveilles'];

  return (
    <div className="mb-6 bg-white border-2 border-rose-300 rounded-2xl text-slate-800 shadow-xl overflow-hidden transition-all animate-fade-in font-sans">
      {/* ======================================================== */}
      {/* 1. BARRE DE TITRE SUPÉRIEURE (COULEUR ROSE AVEC SYMBOLE D'ATELIER) */}
      {/* ======================================================== */}
      <div className="p-3.5 sm:p-4 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-3 text-rose-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800 shadow-2xs">
            <Wrench className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-rose-950 font-outfit tracking-tight">
                Atelier de Production Écrite
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-950 border border-rose-300">
                1ère BAC Régional
              </span>
            </div>
            <p className="text-xs text-rose-900/80 font-medium">
              Méthodologie officielle pas à pas • Arguments clairs et expliqués • Exemples adaptés à l'argument
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sélection de l'œuvre intégrale pour le sujet */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">Œuvre liée :</span>
            <select
              value={selectedOeuvre}
              onChange={(e) => setSelectedOeuvre(e.target.value)}
              className="font-bold text-blue-900 bg-transparent outline-none cursor-pointer"
            >
              {Object.keys(OEUVRES_DATA).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Masquer l'Atelier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toast de confirmation / insertion */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between font-semibold shadow-inner animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Rappel du Sujet analysé */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 max-w-2xl">
          <span className="font-bold text-slate-800 shrink-0">Sujet actif :</span>
          <span className="text-slate-700 italic truncate" title={subjectAnalysis.cleanSubject}>
            « {subjectAnalysis.cleanSubject || 'Aucun sujet saisi — rédigez ou collez votre consigne ci-dessus.'} »
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeSubjectItem?.typePlanSuggere && (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {activeSubjectItem.typePlanSuggere}
            </span>
          )}
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Thème : {subjectAnalysis.themeName}
          </span>
        </div>
      </div>

      {activeSubjectItem?.conseilsEnseignant && (
        <div className="px-4 py-1.5 bg-amber-50/90 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-950 font-medium">
          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-bold text-amber-900 shrink-0">Conseil enseignant :</span>
          <span className="truncate" title={activeSubjectItem.conseilsEnseignant}>{activeSubjectItem.conseilsEnseignant}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BARRE D'ÉTAPES DU PARCOURS PÉDAGOGIQUE                */}
      {/* ======================================================== */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[700px]">
          {[
            { id: 'PLAN', label: '1. Plan', num: '1', desc: selectedPlan === 'DIALECTIQUE' ? 'Dialectique (Nuances)' : 'Simple (Thèse ferme)' },
            { id: 'INTRO', label: '2. Introduction', num: '2', desc: selectedPlan === 'DIALECTIQUE' ? '4 étapes (Débat)' : '4 étapes (Thèse affirmée)' },
            { id: 'DEV_AXE1', label: selectedPlan === 'DIALECTIQUE' ? '3. Axe 1 (Thèse)' : '3. Axe 1 (1er Argument)', num: '3', desc: selectedPlan === 'DIALECTIQUE' ? 'Thèse + Exemple lié' : '1er Argument + Exemple lié' },
            { id: 'DEV_AXE2', label: selectedPlan === 'DIALECTIQUE' ? '4. Axe 2 (Antithèse)' : '4. Axe 2 (2ème Argument)', num: '4', desc: selectedPlan === 'DIALECTIQUE' ? 'Nuance + Exemple lié' : '2ème Argument + Exemple lié' },
            { id: 'CONCL', label: '5. Conclusion', num: '5', desc: selectedPlan === 'DIALECTIQUE' ? 'Bilan + Point de vue' : 'Confirmation tenace (Sans nuance)' },
          ].map((step, idx) => {
            const isCurrent = currentStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id as EtapeId)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition cursor-pointer border ${
                    isCurrent
                      ? 'bg-blue-50/80 border-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {step.num}
                  </div>
                  <div className="truncate">
                    <div className={`text-xs font-bold leading-tight ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">{step.desc}</div>
                  </div>
                </button>
                {idx < 4 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BANDEAU DE CONNECTEURS COLORÉS PAR RÔLE STRUCTUREL     */}
      {/* ======================================================== */}
      <div className="p-3 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Connecteurs Logiques Structurés par Rôle (Cliquez pour insérer) :</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            Chaque structure possède son code couleur distinctif
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {CONNECTORS_BY_ROLE.map((cat) => (
            <div key={cat.id} className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.dotClass}`}></span>
                <span className="text-[11px] font-bold text-slate-800 truncate" title={cat.role}>
                  {cat.role}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cat.connecteurs.slice(0, 3).map((conn) => (
                  <button
                    key={conn.label}
                    type="button"
                    onClick={() => handleInsertTag(conn.amorce)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition cursor-pointer truncate max-w-full ${cat.colorClass}`}
                    title={conn.exempleUsage}
                  >
                    {conn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. CORPS PRINCIPAL DE L'ÉTAPE ACTIVE                     */}
      {/* ======================================================== */}
      <div className="p-5 bg-white">
        {/* ======================================================== */}
        {/* ÉTAPE 1 : CHOIX DU PLAN                                  */}
        {/* ======================================================== */}
        {currentStep === 'PLAN' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>Étape 1 : Choix du Plan de Rédaction</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Selon la consigne de votre sujet régional, sélectionnez le plan le plus adapté :
              </p>
            </div>

            {/* Conseil de l'enseignant ou recommandation de l'examen */}
            {activeSubjectItem?.conseilsEnseignant && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>Conseil pédagogique officiel de l'enseignant :</span>
                    {activeSubjectItem.typePlanSuggere && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 font-bold">
                        Plan préconisé : {activeSubjectItem.typePlanSuggere}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {activeSubjectItem.conseilsEnseignant}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Plan Dialectique */}
              <div
                onClick={() => {
                  setSelectedPlan('DIALECTIQUE');
                  setDev2Amorce('Cependant, en revanche, ');
                  setConclBilan('En définitive, ');
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer relative ${
                  selectedPlan === 'DIALECTIQUE'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                {activeSubjectItem?.typePlanSuggere === 'Plan Dialectique' && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    ★ Recommandé pour ce sujet
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-blue-950 font-outfit">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>Plan Dialectique (Controverse / Thèse & Antithèse)</span>
                  </div>
                  {selectedPlan === 'DIALECTIQUE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Sélectionné
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                  Idéal pour confronter deux points de vue opposés (« Certains pensent... d'autres estiment... »).
                  Vous examinez la thèse (Axe 1), puis l'antithèse (Axe 2), avant de dégager une synthèse équilibrée en conclusion.
                </p>
                <div className="text-[11px] font-semibold text-blue-900 bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                  Structure : Accroche ➔ Débat (« Certains... d'autres en revanche... ») ➔ Problématique ➔ Thèse (Axe 1) ➔ Antithèse (Axe 2) ➔ Synthèse nuancée.
                </div>
              </div>

              {/* Option Plan Simple */}
              <div
                onClick={() => {
                  setSelectedPlan('SIMPLE');
                  setDev2Amorce('D\'autre part, ');
                  setConclBilan('D\'après ce qui précède, je confirme tenacement que ');
                }}
                className={`p-4 rounded-xl border-2 transition cursor-pointer relative ${
                  selectedPlan === 'SIMPLE'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                {activeSubjectItem?.typePlanSuggere === 'Plan Simple' && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                    ★ Recommandé pour ce sujet
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-outfit">
                    <AlignLeft className="w-4 h-4 text-indigo-600" />
                    <span>Plan Simple (Plaidoyer & Thèse Unique Sans Nuance)</span>
                  </div>
                  {selectedPlan === 'SIMPLE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Sélectionné
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                  Recommandé pour défendre fermement un seul avis (ex : approuver l'un des deux avis du sujet).
                  Vous développez deux arguments complémentaires (Axe 1 = 1er Argument, Axe 2 = 2ème Argument) sans contradiction, suivis d'une conclusion tenace sans nuance.
                </p>
                <div className="text-[11px] font-semibold text-indigo-900 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                  Structure : Accroche ➔ Prise de position claire ➔ Problématique ➔ 1er Argument (Axe 1) ➔ 2ème Argument (Axe 2) ➔ Bilan & Confirmation tenace sans nuance.
                </div>
              </div>
            </div>

            {/* Sélecteur de position pour le Plan Simple (Option A ou Option B) */}
            {selectedPlan === 'SIMPLE' && (
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span>Prise de position de l'élève pour le Plan Simple :</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                    Avis sélectionné : {selectedStance === 'A' ? 'Position 1' : 'Position 2'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                  Le Plan Simple impose de soutenir résolument un seul parti pris. Choisissez ci-dessous la position que vous souhaitez développer :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => {
                      setSelectedStance('A');
                      setDev1Argument('');
                      setDev2Argument('');
                      setDev1Exemple('');
                      setDev2Exemple('');
                    }}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                      selectedStance === 'A'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white/70 hover:bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      selectedStance === 'A' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400 bg-white'
                    }`}>
                      {selectedStance === 'A' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-indigo-950">
                        {subjectAnalysis.optionAName || 'Position 1 : Premier point de vue'}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {subjectAnalysis.theseSimpleAvis}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedStance('B');
                      setDev1Argument('');
                      setDev2Argument('');
                      setDev1Exemple('');
                      setDev2Exemple('');
                    }}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                      selectedStance === 'B'
                        ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white/70 hover:bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                      selectedStance === 'B' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400 bg-white'
                    }`}>
                      {selectedStance === 'B' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-indigo-950">
                        {subjectAnalysis.optionBName || 'Position 2 : Second point de vue'}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {subjectAnalysis.theseSimpleAvisAlt || subjectAnalysis.these2}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('INTRO')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <span>Valider le Plan & Passer à l'Introduction</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 2 : INTRODUCTION DÉCOUPÉE SELON LES 4 ÉTAPES       */}
        {/* ======================================================== */}
        {currentStep === 'INTRO' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>
                    Étape 2 : L'Introduction {selectedPlan === 'DIALECTIQUE' ? '(Les 4 Étapes Officielles)' : '(Plan Simple)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Remplissez chaque étape avec vos propres mots ou utilisez les amorces proposées pour un résultat irréprochable.
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('INTRO')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Introduction)</span>
              </button>
            </div>

            {/* 1. ACCROCHE / SUJET AMENÉ */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>1. Accroche / Sujet amené (Généralité ou constat de société)</span>
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIntroAccroche(`De nos jours, ${subjectAnalysis.themeName} occupe une place prépondérante dans les débats actuels. `)}
                    className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition font-medium cursor-pointer"
                  >
                    + Constat actuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroAccroche(`Depuis toujours, la question de ${subjectAnalysis.themeName} interpelle la conscience humaine. `)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium cursor-pointer"
                  >
                    + Généralité intemporelle
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={introAccroche}
                onChange={(e) => setIntroAccroche(e.target.value)}
                placeholder="Exemple : De nos jours, la question de la solidarité suscite de nombreux débats au sein de notre société..."
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            {/* 2. CONFRONTATION DES THÈSES OU PRISE DE POSITION FERME */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>
                    {selectedPlan === 'DIALECTIQUE'
                      ? '2. Confrontation des thèses : « Certains... d\'autres en revanche estiment... »'
                      : '2. Prise de position claire dès l\'introduction (Thèse défendue)'}
                  </span>
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedPlan === 'DIALECTIQUE' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIntroTheses(`Certains affirment avec conviction que ${subjectAnalysis.these1}, tandis que d'autres en revanche estiment que ${subjectAnalysis.these2}. `)}
                        className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 transition font-medium cursor-pointer"
                      >
                        + « Certains... d'autres en revanche estiment... »
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntroTheses(`Si une partie de l'opinion soutient que ${subjectAnalysis.these1}, d'autres voix en revanche font valoir que ${subjectAnalysis.these2}. `)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium cursor-pointer"
                      >
                        + Variante d'opposition
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIntroTheses(`Pour ma part, je soutiens fermement que ${currentSimpleAvis}. `)}
                        className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 transition font-medium cursor-pointer"
                      >
                        + Soutenir ma position choisie
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntroTheses(`À mes yeux, il apparaît incontestable que ${currentSimpleAvis}. `)}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium cursor-pointer"
                      >
                        + Affirmation directe
                      </button>
                    </>
                  )}
                </div>
              </div>
              <textarea
                rows={2}
                value={introTheses}
                onChange={(e) => setIntroTheses(e.target.value)}
                placeholder={
                  selectedPlan === 'DIALECTIQUE'
                    ? "Certains soutiennent que... tandis que d'autres en revanche estiment au contraire que..."
                    : `Pour ma part, je soutiens fermement que ${currentSimpleAvis}...`
                }
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none transition"
              />
            </div>

            {/* 3. PROBLÉMATIQUE / SUJET POSÉ */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span>3. Problématique / Sujet posé (La question centrale reformulée)</span>
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIntroProblematique(`Dès lors, ${selectedPlan === 'SIMPLE' ? currentQuestionSimple : subjectAnalysis.questionCentrale} ? `)}
                    className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 transition font-medium cursor-pointer"
                  >
                    + Formule interrogative adaptée
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroProblematique(
                      selectedPlan === 'SIMPLE'
                        ? 'Par quels arguments cette conviction s\'impose-t-elle comme une certitude inébranlable ? '
                        : 'Face à ce dilemme, convient-il d\'adhérer pleinement à ce point de vue ou doit-on plutôt en mesurer les nuances ? '
                    )}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition font-medium cursor-pointer"
                  >
                    + Question classique
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={introProblematique}
                onChange={(e) => setIntroProblematique(e.target.value)}
                placeholder={
                  selectedPlan === 'DIALECTIQUE'
                    ? `Exemple : Dès lors, ${subjectAnalysis.questionCentrale} ?`
                    : `Exemple : Dès lors, ${currentQuestionSimple} ?`
                }
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition"
              />
            </div>

            {/* 4. ANNONCE DU PLAN / SUJET DIVISÉ */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>4. Annonce du Plan (Selon le plan : {selectedPlan === 'DIALECTIQUE' ? 'Dialectique' : 'Simple'})</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan === 'DIALECTIQUE') {
                      setIntroAnnoncePlan('Dans un premier temps, nous mettrons en lumière les arguments qui corroborent cette idée, avant d\'examiner dans un second temps les nuances et les réserves qui s\'imposent.');
                    } else {
                      setIntroAnnoncePlan(`Dans un premier temps, nous démontrerons que ${currentArg1Simple}, avant d'expliquer dans un second temps que ${currentArg2Simple}.`);
                    }
                  }}
                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 transition font-medium cursor-pointer"
                >
                  + Remplir annonce automatique
                </button>
              </div>
              <textarea
                rows={2}
                value={introAnnoncePlan}
                onChange={(e) => setIntroAnnoncePlan(e.target.value)}
                placeholder={
                  selectedPlan === 'DIALECTIQUE'
                    ? "Exemple : Dans un premier temps, nous analyserons les arguments favorables, avant d'aborder les réserves légitimes..."
                    : "Exemple : Dans un premier temps, nous démontrerons que la solitude stimule la créativité, avant d'expliquer comment elle forge l'autonomie..."
                }
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('PLAN')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Revenir au plan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const full = buildCurrentIntroText();
                    if (!full) {
                      showToast('Veuillez compléter au moins une phrase avant de valider.');
                      return;
                    }
                    handleApplyVariant(full);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Valider mon introduction & passer au Développement</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 3 : DÉVELOPPEMENT AXE 1                            */}
        {/* ======================================================== */}
        {currentStep === 'DEV_AXE1' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Columns className="w-4 h-4 text-indigo-600" />
                  <span>
                    Étape 3 : Développement — Axe 1 {selectedPlan === 'DIALECTIQUE' ? '(Thèse : Premier point de vue)' : '(1er Argument pour votre thèse)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Règle d'or : Amorce (🔵) ➔ 1er Argument clair (Pourquoi/Comment) ➔ Justification (🟣) ➔ Exemple adapté tiré de l'œuvre (🟢).
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('DEV_AXE1')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Axe 1)</span>
              </button>
            </div>

            {/* Suggestions d'arguments clairs et bien expliqués en langage simple */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>
                    {selectedPlan === 'DIALECTIQUE'
                      ? 'Modèles d\'Arguments Clairs (Thèse, Langage Simple) :'
                      : 'Modèles du 1er Argument pour votre Thèse (Langage Simple) :'}
                  </span>
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">Cliquer pour adopter un modèle</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modelArgsAxe1.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => handleApplyModelArgument(mod, 1)}
                    className="p-2.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 transition cursor-pointer text-xs group shadow-2xs"
                  >
                    <div className="font-bold text-slate-900 group-hover:text-amber-900 flex items-center justify-between">
                      <span>{mod.titreCourt}</span>
                      <span className="text-[10px] text-amber-700 font-semibold underline">Choisir cet argument →</span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1 line-clamp-2">
                      <span className="font-semibold text-slate-900">Argument :</span> {mod.argumentClair}
                    </p>
                    <p className="text-[10px] text-purple-700 mt-0.5 line-clamp-1 italic">
                      {mod.explicationSimple}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Colonne gauche : Saisie structurée de l'Axe 1 */}
              <div className="space-y-3">
                {/* 1. Amorce */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>1. Connecteur d'ouverture (Bleu Azur)</span>
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {['En premier lieu, ', 'D\'une part, ', 'Pour commencer, ', 'Il est indéniable que '].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDev1Amorce(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                          dev1Amorce === c ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c.trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Argument de l'élève */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800">
                      {selectedPlan === 'DIALECTIQUE' ? '2. Votre Thèse (Argument clair)' : '2. Votre 1er Argument (Clair et bien expliqué)'}
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedPlan === 'DIALECTIQUE' ? 'Thèse (Axe 1)' : '1er Argument'}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={dev1Argument}
                    onChange={(e) => setDev1Argument(e.target.value)}
                    placeholder={`Exemple : ${selectedPlan === 'DIALECTIQUE' ? subjectAnalysis.these1 : currentArg1Simple}...`}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Astuce : Les exemples de l'œuvre ci-contre s'actualisent automatiquement pour suivre votre argument !
                  </p>
                </div>

                {/* 3. Explication / Justification */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>3. Justification & Explication du « Pourquoi » (Violet Impérial)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={dev1Explication}
                    onChange={(e) => setDev1Explication(e.target.value)}
                    placeholder={`Exemple : ${selectedPlan === 'DIALECTIQUE' ? subjectAnalysis.these1Explication : currentArg1SimpleExplication}`}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Colonne droite : Banque d'Exemples SUIVANT L'ARGUMENT de l'élève (Vert) */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>Exemples adaptés à votre argument ({selectedOeuvre})</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Cliquer pour insérer
                  </span>
                </div>

                {/* Badge d'accord direct avec l'argument */}
                {dev1Argument.trim().length > 3 && (
                  <div className="text-[11px] font-semibold text-emerald-900 bg-white p-2 rounded-lg border border-emerald-300 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Exemples classés pour suivre l'argument : <strong className="text-emerald-800">« {dev1Argument.slice(0, 40)}... »</strong>
                    </span>
                  </div>
                )}

                {/* Liste des exemples adaptés */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {matchingAxe1.exactMatches.map((ex, idx) => (
                    <div
                      key={ex.id}
                      onClick={() => setDev1Exemple(ex.phraseComplete)}
                      className={`p-3 rounded-lg bg-white border transition cursor-pointer text-xs group shadow-2xs ${
                        dev1Exemple === ex.phraseComplete
                          ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300'
                          : 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950 mb-1">
                        <span className="flex items-center gap-1.5">
                          {idx === 0 && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              Recommandé
                            </span>
                          )}
                          <span>{ex.theme}</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 group-hover:underline font-semibold">
                          Insérer cet exemple →
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-600 mb-1 font-medium bg-slate-50 p-1.5 rounded border border-slate-100">
                        <strong className="text-emerald-800">Lien avec l'argument :</strong> {ex.argumentLie}
                      </div>

                      <p className="text-[11px] text-slate-800 leading-relaxed font-newsreader italic">
                        « {ex.phraseComplete} »
                      </p>
                    </div>
                  ))}

                  {/* Autres exemples de l'œuvre disponibles */}
                  {matchingAxe1.otherExamples.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Autres exemples de l'œuvre :
                      </div>
                      {matchingAxe1.otherExamples.map((ex) => (
                        <div
                          key={ex.id}
                          onClick={() => setDev1Exemple(ex.phraseComplete)}
                          className="p-2 mb-1.5 rounded-lg bg-white/70 border border-slate-200 hover:border-emerald-300 hover:bg-white transition cursor-pointer text-xs"
                        >
                          <div className="text-[10px] font-semibold text-slate-700">{ex.theme}</div>
                          <p className="text-[10px] text-slate-600 italic truncate">« {ex.phraseComplete} »</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Champ texte de l'exemple retenu */}
                <div className="mt-auto pt-2">
                  <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                    Exemple sélectionné pour l'Axe 1 :
                  </label>
                  <textarea
                    rows={2}
                    value={dev1Exemple}
                    onChange={(e) => setDev1Exemple(e.target.value)}
                    placeholder="Cliquez sur un exemple recommandé ci-dessus ou rédigez votre propre référence à l'œuvre..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-950 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('INTRO')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Revenir à l'Introduction
              </button>

              <button
                type="button"
                onClick={() => {
                  const full = `${dev1Amorce}${dev1Argument} ${dev1Explication} ${dev1Exemple}`.trim();
                  if (!dev1Argument.trim()) {
                    showToast('Veuillez préciser votre argument avant de valider l\'Axe 1.');
                    return;
                  }
                  handleApplyVariant(full);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Valider l'Axe 1 & passer à l'Axe 2</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 4 : DÉVELOPPEMENT AXE 2                            */}
        {/* ======================================================== */}
        {currentStep === 'DEV_AXE2' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Columns className="w-4 h-4 text-amber-600" />
                  <span>
                    Étape 4 : Développement — Axe 2 {selectedPlan === 'DIALECTIQUE' ? '(Antithèse : Nuance / Contre-point)' : '(2ème Argument pour consolider votre thèse)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {selectedPlan === 'DIALECTIQUE'
                    ? 'Opposition / Nuance (🟠) ➔ Contre-argument clair et expliqué ➔ Justification (🟣) ➔ Exemple de l\'œuvre (🟢).'
                    : 'Progression & Addition (🔵) ➔ 2ème Argument renforçant la même thèse ➔ Justification (🟣) ➔ Exemple de l\'œuvre (🟢).'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('DEV_AXE2')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Axe 2)</span>
              </button>
            </div>

            {/* Suggestions de contre-arguments ou de 2èmes arguments */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>
                    {selectedPlan === 'DIALECTIQUE'
                      ? 'Modèles de Contre-Arguments Clairs (Antithèse, Langage Simple) :'
                      : 'Modèles du 2ème Argument pour consolider votre Thèse (Langage Simple) :'}
                  </span>
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">Cliquer pour adopter un modèle</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modelArgsAxe2.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => handleApplyModelArgument(mod, 2)}
                    className="p-2.5 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 transition cursor-pointer text-xs group shadow-2xs"
                  >
                    <div className="font-bold text-slate-900 group-hover:text-amber-900 flex items-center justify-between">
                      <span>{mod.titreCourt}</span>
                      <span className="text-[10px] text-amber-700 font-semibold underline">Choisir cet argument →</span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1 line-clamp-2">
                      <span className="font-semibold text-slate-900">Argument :</span> {mod.argumentClair}
                    </p>
                    <p className="text-[10px] text-purple-700 mt-0.5 line-clamp-1 italic">
                      {mod.explicationSimple}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Colonne gauche : Saisie structurée de l'Axe 2 */}
              <div className="space-y-3">
                {/* 1. Amorce Axe 2 */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>
                      {selectedPlan === 'DIALECTIQUE'
                        ? '1. Connecteur de nuance / opposition (Orange Ambré)'
                        : '1. Connecteur de progression / addition (Bleu Azur)'}
                    </span>
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(selectedPlan === 'DIALECTIQUE'
                      ? ['Cependant, ', 'En revanche, ', 'Toutefois, ', 'Néanmoins, ', 'D\'autre part, ']
                      : ['D\'autre part, ', 'En second lieu, ', 'Par ailleurs, ', 'De surcroît, ', 'De plus, ']
                    ).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDev2Amorce(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                          dev2Amorce === c ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c.trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Argument Axe 2 */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800">
                      {selectedPlan === 'DIALECTIQUE'
                        ? '2. Votre Contre-Argument (Antithèse claire)'
                        : '2. Votre 2ème Argument (Complémentaire, pour renforcer votre thèse)'}
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                      {selectedPlan === 'DIALECTIQUE' ? 'Antithèse / Réserve' : '2ème Argument'}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={dev2Argument}
                    onChange={(e) => setDev2Argument(e.target.value)}
                    placeholder={`Exemple : ${selectedPlan === 'DIALECTIQUE' ? subjectAnalysis.these2 : currentArg2Simple}...`}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Astuce : Les exemples de l'œuvre ci-contre suivent automatiquement votre argument !
                  </p>
                </div>

                {/* 3. Justification */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>3. Justification & Explication du « Pourquoi » (Violet Impérial)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={dev2Explication}
                    onChange={(e) => setDev2Explication(e.target.value)}
                    placeholder={`Exemple : ${selectedPlan === 'DIALECTIQUE' ? subjectAnalysis.these2Explication : currentArg2SimpleExplication}`}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Colonne droite : Banque d'Exemples SUIVANT L'ARGUMENT de l'Axe 2 */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span>Exemples adaptés à l'Axe 2 ({selectedOeuvre})</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Cliquer pour insérer
                  </span>
                </div>

                {dev2Argument.trim().length > 3 && (
                  <div className="text-[11px] font-semibold text-emerald-900 bg-white p-2 rounded-lg border border-emerald-300 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Exemples classés pour suivre l'argument : <strong className="text-emerald-800">« {dev2Argument.slice(0, 40)}... »</strong>
                    </span>
                  </div>
                )}

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {matchingAxe2.exactMatches.map((ex, idx) => (
                    <div
                      key={ex.id}
                      onClick={() => setDev2Exemple(ex.phraseComplete)}
                      className={`p-3 rounded-lg bg-white border transition cursor-pointer text-xs group shadow-2xs ${
                        dev2Exemple === ex.phraseComplete
                          ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300'
                          : 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950 mb-1">
                        <span className="flex items-center gap-1.5">
                          {idx === 0 && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              Recommandé
                            </span>
                          )}
                          <span>{ex.theme}</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 group-hover:underline font-semibold">
                          Insérer cet exemple →
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-600 mb-1 font-medium bg-slate-50 p-1.5 rounded border border-slate-100">
                        <strong className="text-emerald-800">Lien avec l'argument :</strong> {ex.argumentLie}
                      </div>

                      <p className="text-[11px] text-slate-800 leading-relaxed font-newsreader italic">
                        « {ex.phraseComplete} »
                      </p>
                    </div>
                  ))}

                  {matchingAxe2.otherExamples.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Autres exemples de l'œuvre :
                      </div>
                      {matchingAxe2.otherExamples.map((ex) => (
                        <div
                          key={ex.id}
                          onClick={() => setDev2Exemple(ex.phraseComplete)}
                          className="p-2 mb-1.5 rounded-lg bg-white/70 border border-slate-200 hover:border-emerald-300 hover:bg-white transition cursor-pointer text-xs"
                        >
                          <div className="text-[10px] font-semibold text-slate-700">{ex.theme}</div>
                          <p className="text-[10px] text-slate-600 italic truncate">« {ex.phraseComplete} »</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-2">
                  <label className="text-[11px] font-bold text-emerald-950 block mb-1">
                    Exemple sélectionné pour l'Axe 2 :
                  </label>
                  <textarea
                    rows={2}
                    value={dev2Exemple}
                    onChange={(e) => setDev2Exemple(e.target.value)}
                    placeholder="Cliquez sur un exemple recommandé ci-dessus ou rédigez votre propre illustration..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-950 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('DEV_AXE1')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Revenir à l'Axe 1
              </button>

              <button
                type="button"
                onClick={() => {
                  const full = `${dev2Amorce}${dev2Argument} ${dev2Explication} ${dev2Exemple}`.trim();
                  if (!dev2Argument.trim()) {
                    showToast('Veuillez préciser votre argument avant de valider l\'Axe 2.');
                    return;
                  }
                  handleApplyVariant(full);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Valider l'Axe 2 & passer à la Conclusion</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE 5 : CONCLUSION GUIDÉE                              */}
        {/* ======================================================== */}
        {currentStep === 'CONCL' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-rose-600" />
                  <span>
                    Étape 5 : La Conclusion {selectedPlan === 'DIALECTIQUE' ? '(Bilan Synthétique & Prise de Position Nuancée)' : '(Bilan Ferme & Confirmation Tenace du Point de Vue)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {selectedPlan === 'DIALECTIQUE'
                    ? 'La conclusion scelle votre note. Elle résume les deux axes sans contradiction et formule une synthèse équilibrée en langage clair.'
                    : 'Dans un plan simple, la conclusion ne nuance pas : elle dresse un bilan catégorique des 2 arguments et réaffirme avec ténacité votre position personnelle sans compromis.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('CONCL')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <PenTool className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Conclusion)</span>
              </button>
            </div>

            {/* 1. Connecteur de clôture */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span>1. Connecteur de Bilan / Clôture (Rose Framboise)</span>
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {(selectedPlan === 'SIMPLE'
                  ? ['D\'après ce qui précède, je confirme tenacement que ', 'En définitive, ', 'Au terme de cette réflexion, ', 'En somme, ']
                  : ['En définitive, ', 'En somme, ', 'Au terme de cette réflexion, ', 'Pour conclure, ']
                ).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConclBilan(c)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold transition cursor-pointer ${
                      conclBilan === c ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c.trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Point de vue personnel argumenté */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <label className="text-xs font-bold text-slate-800">
                {selectedPlan === 'DIALECTIQUE'
                  ? '2. Synthèse & Prise de position personnelle nuancée (Langage simple)'
                  : '2. Réaffirmation ferme et tenace de votre point de vue (Sans nuance)'}
              </label>
              <textarea
                rows={2}
                value={conclPointDeVue}
                onChange={(e) => setConclPointDeVue(e.target.value)}
                placeholder={
                  selectedPlan === 'DIALECTIQUE'
                    ? "Exemple : pour ma part, j'estime que le juste équilibre entre liberté individuelle et respect des règles communes doit prévaloir..."
                    : `Exemple : ${currentConclusionFerme}...`
                }
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>

            {/* 3. Ouverture */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <label className="text-xs font-bold text-amber-900">
                3. Éventuelle Ouverture (Question ou perspective d'avenir)
              </label>
              <textarea
                rows={2}
                value={conclOuverture}
                onChange={(e) => setConclOuverture(e.target.value)}
                placeholder="Exemple : Dès lors, comment éduquer les futures générations pour concilier tradition et modernité ?"
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('DEV_AXE2')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Revenir au Dév. Axe 2
              </button>

              <button
                type="button"
                onClick={() => {
                  const rawPvd = conclPointDeVue.trim() || (selectedPlan === 'SIMPLE' ? subjectAnalysis.conclusionFerme : `le juste équilibre entre les différentes exigences doit guider notre jugement`);
                  const cleanPvd = rawPvd
                    .replace(/^d['’]après ce qui précède,?\s*/i, '')
                    .replace(/^je confirme tenacement (que\s*)?/i, '')
                    .replace(/^je confirme (que\s*)?/i, '')
                    .replace(/^que\s+/i, '')
                    .trim();

                  let prefix = conclBilan.trim();
                  if (prefix.endsWith('que')) {
                    prefix += ' ';
                  } else if (!prefix.endsWith(',') && !prefix.endsWith('.')) {
                    prefix += ', ';
                  } else {
                    prefix += ' ';
                  }

                  const endPunct = cleanPvd.endsWith('.') ? '' : '.';
                  const full = `${prefix}${cleanPvd}${endPunct} ${conclOuverture.trim()}`.trim();
                  handleApplyVariant(full);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Valider la Conclusion & Finaliser</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ÉTAPE FINALE : SYNTHÈSE & RETOUR AU MANUSCRIT           */}
        {/* ======================================================== */}
        {currentStep === 'FINAL' && (
          <div className="space-y-4 animate-fade-in text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 font-outfit">
              Félicitations ! Votre production écrite est entièrement structurée
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto font-medium">
              Toutes les étapes (Introduction en 4 étapes, Axe 1, Axe 2 et Conclusion) sont validées et transférées dans votre zone de rédaction manuscrite avec des arguments clairs, des explications simples et des exemples fidèles à chaque étape.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <PenTool className="w-4 h-4" />
                <span>Poursuivre la rédaction / Relecture dans le manuscrit</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('PLAN')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recommencer un nouveau cycle</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODALE LUMINEUSE DES 2 VARIANTES DE REFORMULATION        */}
        {/* ======================================================== */}
        {showReformulations && (
          <div className="mt-5 p-5 rounded-2xl bg-white border-2 border-amber-400 shadow-2xl animate-fade-in space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <PenTool className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-outfit">
                    Choisissez votre Variante de Reformulation (Arguments Clairs & Bien Expliqués)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Chaque formule explique clairement le « pourquoi » avec un langage simple, sans jargon pompeux.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReformulations(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                ✕ Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VARIANTE 1 */}
              <div
                onClick={() => setSelectedVariante('A')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  selectedVariante === 'A'
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-400/40'
                    : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Variante 1 : « Clarté & Simplicité Directe »</span>
                  </span>
                  {selectedVariante === 'A' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">Choisie</span>
                  )}
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-newsreader italic mb-3">
                  « {varianteA} »
                </p>
                <div className="text-[10px] text-slate-500 font-medium">
                  Style limpide, argument direct et bien expliqué, vocabulaire simple et fort.
                </div>
              </div>

              {/* VARIANTE 2 */}
              <div
                onClick={() => setSelectedVariante('B')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  selectedVariante === 'B'
                    ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-400/40'
                    : 'border-slate-200 bg-slate-50/60 hover:border-amber-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Variante 2 : « Élégance Équilibrée 50/50 »</span>
                  </span>
                  {selectedVariante === 'B' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">Choisie</span>
                  )}
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-newsreader italic mb-3">
                  « {varianteB} »
                </p>
                <div className="text-[10px] text-slate-500 font-medium">
                  50% soutenu / 50% simple et fort : tournures soignées, sans lourdeur inutile.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReformulations(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Garder mon texte tel quel
              </button>

              <button
                type="button"
                disabled={!selectedVariante}
                onClick={() => {
                  if (selectedVariante === 'A') handleApplyVariant(varianteA);
                  else if (selectedVariante === 'B') handleApplyVariant(varianteB);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Valider cette variante et l'insérer dans le manuscrit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
