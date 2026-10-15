import React, { useState, useMemo } from 'react';
import {
  Sparkles,
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
} from 'lucide-react';
import {
  CONNECTORS_BY_ROLE,
  OEUVRES_DATA,
  OeuvreExample,
  findExamplesMatchingArgument,
  getModelArgumentsForTheme,
  ModelArgument,
} from '../data/oeuvreExamples';

interface AtelierProductionProps {
  sujet: string;
  isSubjectValidated: boolean;
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
}

function analyzeSubjectText(rawSubject: string): SubjectAnalysis {
  const clean = (rawSubject || '')
    .replace(/^Sujet\s*:\s*/i, '')
    .replace(/^Consigne\s*:\s*/i, '')
    .trim();

  const lower = clean.toLowerCase();

  // Détection de l'œuvre associée
  let oeuvre = 'La Boîte à Merveilles';
  if (lower.includes('antigone') || lower.includes('créon') || lower.includes('creon') || lower.includes('anouilh') || lower.includes('ismène') || lower.includes('ismene')) {
    oeuvre = 'Antigone';
  } else if (lower.includes('condamné') || lower.includes('condamne') || lower.includes('peine de mort') || lower.includes('hugo') || lower.includes('bicêtre') || lower.includes('bicetre') || lower.includes('guillotine')) {
    oeuvre = 'Le Dernier Jour d’un Condamné';
  } else if (lower.includes('boîte') || lower.includes('boite') || lower.includes('sefrioui') || lower.includes('chouafa') || lower.includes('zoubida') || lower.includes('sidi mohammed')) {
    oeuvre = 'La Boîte à Merveilles';
  } else {
    oeuvre = 'Sujet de Société Général';
  }

  // Extraction thématique précise avec arguments clairs et explications simples
  let themeName = 'cette question majeure de société';
  let these1 = 'cette idée comporte une part indéniable de vérité';
  let these1Explication = 'En effet, cela permet de préserver des repères essentiels et d\'assurer la stabilité collective.';
  let these2 = 'cette vision mérite d\'être nuancée et complétée par d\'autres réalités';
  let these2Explication = 'En effet, une application trop rigide risque de restreindre la liberté individuelle et d\'ignorer la diversité des situations.';
  let questionCentrale = 'dans quelle mesure peut-on considérer cette affirmation comme légitime';

  if (lower.includes('solitude') || lower.includes('seul')) {
    themeName = 'la solitude et son impact sur l\'individu';
    these1 = 'la solitude choisie permet à l\'individu de se recueillir et de stimuler son imagination';
    these1Explication = 'En effet, loin du bruit et du regard des autres, l\'esprit trouve le calme nécessaire pour réfléchir et créer son propre monde.';
    these2 = 'la solitude imposée isole la personne et lui fait éprouver une souffrance morale pesante';
    these2Explication = 'En effet, l\'être humain a un besoin vital de dialogue et d\'affection fraternelle pour se sentir compris et aimé.';
    questionCentrale = 'doit-on percevoir la solitude comme un refuge fécond ou comme une douloureuse épreuve';
  } else if (lower.includes('peine de mort') || lower.includes('condamn') || lower.includes('guillotine')) {
    themeName = 'la peine de mort et la justice humaine';
    these1 = 'la justice des hommes n\'a moralement pas le droit d\'ôter la vie et doit abolir la peine de mort';
    these1Explication = 'En effet, la justice humaine n\'étant pas infaillible, le risque d\'exécuter un innocent est irréparable, et le châtiment suprême supprime toute chance de rédemption.';
    these2 = 'certains partisans de l\'ordre estiment que la sévérité absolue est indispensable pour dissuader les crimes';
    these2Explication = 'En effet, ils considèrent que la peur de mourir protège les innocents et offre une punition exemplaire proportionnée à la gravité de l\'acte.';
    questionCentrale = 'la société a-t-elle le droit moral d\'ôter la vie à un condamné ou doit-elle plutôt privilégier la dignité humaine';
  } else if (lower.includes('superstition') || lower.includes('voyante') || lower.includes('chouafa') || lower.includes('marabout') || lower.includes('saints')) {
    themeName = 'le recours aux superstitions et aux croyances traditionnelles';
    these1 = 'le recours aux marabouts procure aux personnes angoissées un réconfort moral passager';
    these1Explication = 'En effet, face à la douleur et à la précarité, ces pratiques rassurent les esprits fragiles en leur redonnant un sentiment d\'espoir immédiat.';
    these2 = 'la superstition enferme les esprits dans l\'ignorance et retarde les solutions médicales rationnelles';
    these2Explication = 'En effet, allumer des cierges ou consulter des charlatans ne soigne aucune maladie et appauvrit ceux qui souffrent au lieu de les guérir.';
    questionCentrale = 'le recours aux marabouts constitue-t-il un remède réconfortant ou une dangereuse illusion';
  } else if (lower.includes('parent') || lower.includes('génération') || lower.includes('jeune') || lower.includes('tradition') || lower.includes('famille')) {
    themeName = 'l\'autorité des parents et le dialogue avec la jeunesse';
    these1 = 'l\'expérience et les conseils des parents constituent un guide précieux pour protéger les jeunes';
    these1Explication = 'En effet, les aînés ont vécu les épreuves de l\'existence et transmettent des valeurs solides pour éviter les faux pas.';
    these2 = 'la jeunesse a un besoin légitime d\'autonomie et d\'écoute pour forger ses propres convictions';
    these2Explication = 'En effet, une autorité trop rigide étouffe la créativité et empêche les jeunes d\'apprendre par leurs propres expériences.';
    questionCentrale = 'convient-il de se conformer strictement aux directives des aînés ou de revendiquer son autonomie';
  } else if (lower.includes('réseau') || lower.includes('virtuel') || lower.includes('écran') || lower.includes('téléphone') || lower.includes('internet')) {
    themeName = 'l\'impact du monde virtuel et des réseaux sociaux';
    these1 = 'les outils numériques offrent des opportunités exceptionnelles d\'apprentissage et de communication instantanée';
    these1Explication = 'En effet, ils permettent d\'accéder facilement à la connaissance et de maintenir le contact par-delà les frontières géographiques.';
    these2 = 'l\'abus des écrans affaiblit les véritables relations humaines et accentue l\'isolement individuel';
    these2Explication = 'En effet, accumuler des amis virtuels ne remplace jamais les échanges chaleureux dans la réalité et peut enfermer dans l\'anxiété du regard d\'autrui.';
    questionCentrale = 'le monde virtuel favorise-t-il l\'ouverture sur autrui ou conduit-il à un nouvel isolement moderne';
  } else if (lower.includes('argent') || lower.includes('riche') || lower.includes('bonheur')) {
    themeName = 'la place de l\'argent dans la quête du bonheur';
    these1 = 'l\'argent est indispensable pour répondre aux besoins fondamentaux et assurer la sécurité de sa famille';
    these1Explication = 'En effet, avoir de quoi se loger, se soigner et se nourrir décemment évite l\'angoisse de la misère au quotidien.';
    these2 = 'la richesse financière ne suffit pas à elle seule pour être heureux et trouver la paix de l\'esprit';
    these2Explication = 'En effet, la santé, l\'amour sincère, l\'amitié et la dignité humaine ne peuvent s\'acheter avec de l\'argent.';
    questionCentrale = 'l\'argent constitue-t-il la véritable clé du bonheur ou une simple condition matérielle d\'existence';
  } else if (lower.includes('solidarité') || lower.includes('entraide') || lower.includes('voisin')) {
    themeName = 'l\'importance de la solidarité et de l\'entraide sociale';
    these1 = 'l\'entraide et la bienveillance entre concitoyens constituent le ciment indispensable d\'une société apaisée';
    these1Explication = 'En effet, se soutenir mutuellement dans les moments de deuil ou d\'épreuve rend la collectivité plus humaine et plus forte.';
    these2 = 'l\'individualisme croissant et la méfiance tendent parfois à fragiliser ces élans fraternels';
    these2Explication = 'En effet, la recherche du profit personnel ou la peur du jugement d\'autrui poussent souvent les individus à se replier sur eux-mêmes.';
    questionCentrale = 'dans quelle mesure la solidarité demeure-t-elle un devoir fondamental pour préserver le vivre-ensemble';
  } else if (lower.includes('autorité') || lower.includes('loi') || lower.includes('obéir') || lower.includes('révolte') || lower.includes('liberté')) {
    themeName = 'la confrontation entre le respect de la loi et la fidélité à sa conscience';
    these1 = 'le respect des lois et de l\'ordre établi est nécessaire pour garantir la paix et éviter l\'anarchie';
    these1Explication = 'En effet, une communauté ne peut survivre si chaque individu décide arbitrairement de suivre ses propres règles au mépris de tous.';
    these2 = 'la conscience morale et le devoir de justice doivent prévaloir lorsque la loi devient tyrannique';
    these2Explication = 'En effet, obéir aveuglément à des ordres inhumains détruit la dignité de l\'homme et consacre le règne de l\'injustice.';
    questionCentrale = 'faut-il privilégier l\'obéissance civile aux lois établies ou le respect intangible de ses valeurs morales';
  } else if (clean.length > 15) {
    const excerpt = clean
      .replace(/partagez-vous ce point de vue\s*\??/gi, '')
      .replace(/qu'en pensez-vous\s*\??/gi, '')
      .replace(/dans quelle mesure\s*\??/gi, '')
      .trim();
    themeName = `la réflexion autour de l'idée selon laquelle « ${excerpt.slice(0, 75)}${excerpt.length > 75 ? '...' : ''} »`;
    these1 = 'cette idée met en lumière une exigence essentielle';
    these1Explication = 'En effet, ce principe permet d\'éclairer nos choix quotidiens et de maintenir un cap moral cohérent.';
    these2 = 'd\'autres facteurs essentiels doivent être pris en compte pour nuancer ce jugement';
    these2Explication = 'En effet, la réalité est diverse et nécessite d\'adapter ses principes à chaque situation concrète.';
    questionCentrale = 'dans quelle mesure ce constat correspond-il fidèlement à la complexité de nos vies';
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
  };
}

export const AtelierProduction: React.FC<AtelierProductionProps> = ({
  sujet,
  isSubjectValidated,
  onInjectContent,
  onClose,
}) => {
  // Analyse sémantique continue du sujet
  const subjectAnalysis = useMemo(() => analyzeSubjectText(sujet), [sujet]);

  const [selectedOeuvre, setSelectedOeuvre] = useState<string>(subjectAnalysis.oeuvreProbable);
  const [currentStep, setCurrentStep] = useState<EtapeId>('PLAN');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('DIALECTIQUE');

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
      dev1Argument || subjectAnalysis.these1,
      selectedOeuvre,
      'these'
    );
  }, [dev1Argument, selectedOeuvre, subjectAnalysis.these1]);

  // 2. Détection dynamique des exemples adaptés à l'argument du candidat pour l'Axe 2
  const matchingAxe2 = useMemo(() => {
    return findExamplesMatchingArgument(
      dev2Argument || subjectAnalysis.these2,
      selectedOeuvre,
      selectedPlan === 'DIALECTIQUE' ? 'antithese' : 'these'
    );
  }, [dev2Argument, selectedOeuvre, selectedPlan, subjectAnalysis.these2]);

  // Modèles d'arguments clairs et bien expliqués en langage simple pour l'Axe 1 et l'Axe 2
  const modelArgsAxe1 = useMemo(() => {
    return getModelArgumentsForTheme(subjectAnalysis.themeName, selectedOeuvre, 'these');
  }, [subjectAnalysis.themeName, selectedOeuvre]);

  const modelArgsAxe2 = useMemo(() => {
    return getModelArgumentsForTheme(
      subjectAnalysis.themeName,
      selectedOeuvre,
      selectedPlan === 'DIALECTIQUE' ? 'antithese' : 'these'
    );
  }, [subjectAnalysis.themeName, selectedOeuvre, selectedPlan]);

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
      showToast('Argument modèle clair, explication et exemple insérés dans l\'Axe 2 !');
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
        // Plan Simple / Thématique
        setVarianteA(
          `Depuis toujours, ${theme} constitue une réalité indéniable qui marque profondément notre société. En effet, chacun mesure l'importance de ce phénomène dans l'équilibre des rapports humains. Quels sont dès lors les fondements de cette réalité et comment influence-t-elle notre quotidien ? À travers une analyse méthodique, nous étudierons en premier lieu ses causes majeures, puis nous en mesurerons les conséquences directes.`
        );
        setVarianteB(
          `Il est incontestable que la question liée à ${theme} se trouve au cœur des enjeux contemporains. Loin d'être une préoccupation secondaire, elle façonne nos valeurs et engage notre responsabilité collective. Dès lors, comment expliquer la prégnance d'un tel constat ? Nous nous attacherons tout d'abord à explorer les manifestations concrètes de ce phénomène, avant de souligner dans quelle mesure il oriente l'avenir de notre société.`
        );
      }
    } else if (step === 'DEV_AXE1') {
      // Nettoyage et explicitation claire de l'argument du candidat
      const rawArg = dev1Argument.trim();
      const rawExpl = dev1Explication.trim();
      const rawEx = dev1Exemple.trim();

      // Si le candidat a fourni un argument, on l'utilise directement en le formulant avec clarté
      const finalArg = rawArg || t1;
      const finalExpl = rawExpl && rawExpl !== 'En effet,' && rawExpl !== 'En effet, '
        ? rawExpl
        : t1Exp;

      // Exemple suivant l'argument : si l'élève n'a pas encore saisi d'exemple, on prend le meilleur exemple détecté
      const finalEx = rawEx || (matchingAxe1.bestMatch ? matchingAxe1.bestMatch.phraseComplete : `Comme l'illustre un épisode marquant de ${selectedOeuvre}`);

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

      const finalArg = rawArg || t2;
      const finalExpl = rawExpl && rawExpl !== 'En effet,' && rawExpl !== 'En effet, '
        ? rawExpl
        : t2Exp;

      const finalEx = rawEx || (matchingAxe2.bestMatch ? matchingAxe2.bestMatch.phraseComplete : `À cet égard, une scène éloquente de ${selectedOeuvre}`);

      if (selectedPlan === 'DIALECTIQUE') {
        // Variante 1 : Clarté & Simplicité
        setVarianteA(
          `${dev2Amorce}il convient de souligner que ${finalArg}. ${finalExpl} ${finalEx}, montrant ainsi que cette réalité ne doit pas être jugée de manière unilatérale.`
        );

        // Variante 2 : Élégance académique 50/50
        setVarianteB(
          `${dev2Amorce}il serait réducteur d'occulter le fait que ${finalArg}. ${finalExpl} ${finalEx}, prouvant avec éloquence que la lucidité exige de mesurer les contrepoids indispensables à tout jugement équilibré.`
        );
      } else {
        setVarianteA(
          `${dev2Amorce}il importe d'ajouter que ${finalArg}. ${finalExpl} ${finalEx}, ce qui renforce considérablement la portée de ce second aspect.`
        );
        setVarianteB(
          `${dev2Amorce}un examen plus approfondi révèle en outre que ${finalArg}. ${finalExpl} ${finalEx}, offrant un témoignage éclatant de la complémentarité de ces deux dimensions.`
        );
      }
    } else if (step === 'CONCL') {
      const pvd = conclPointDeVue.trim() || `le juste équilibre entre respect des principes et discernement personnel doit guider notre jugement sur ${theme}`;
      const ouv = conclOuverture.trim() || 'Dès lors, comment les générations futures sauront-elles concilier ces exigences face aux nouveaux défis contemporains ?';

      setVarianteA(
        `${conclBilan}au terme de notre réflexion sur ${theme}, il apparaît clairement que ces deux points de vue se complètent. Pour ma part, j'estime que ${pvd}. ${ouv}`
      );
      setVarianteB(
        `${conclBilan}l'examen attentif de cette problématique permet de dégager une synthèse équilibrée et féconde. En ce qui me concerne, je demeure convaincu que ${pvd}. Dès lors, une question essentielle demeure ouverte : ${ouv}`
      );
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
    <div className="mb-6 bg-white border-2 border-slate-300 rounded-2xl text-slate-800 shadow-xl overflow-hidden transition-all animate-fade-in font-sans">
      {/* ======================================================== */}
      {/* 1. BARRE DE TITRE SUPÉRIEURE LUMINEUSE ET ÉLÉGANTE      */}
      {/* ======================================================== */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shadow-2xs">
            <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-outfit tracking-tight">
                Atelier de Production Écrite
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                1ère BAC Régional
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
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
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 max-w-3xl">
          <span className="font-bold text-slate-800 shrink-0">Sujet identifié :</span>
          <span className="text-slate-700 italic truncate" title={subjectAnalysis.cleanSubject}>
            « {subjectAnalysis.cleanSubject || 'Aucun sujet saisi — rédigez ou collez votre consigne ci-dessus.'} »
          </span>
        </div>
        <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          Thème : {subjectAnalysis.themeName}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRE D'ÉTAPES DU PARCOURS PÉDAGOGIQUE                */}
      {/* ======================================================== */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[700px]">
          {[
            { id: 'PLAN', label: '1. Plan', num: '1', desc: 'Dialectique / Simple' },
            { id: 'INTRO', label: '2. Introduction', num: '2', desc: '4 étapes obligatoires' },
            { id: 'DEV_AXE1', label: '3. Axe 1 (Thèse)', num: '3', desc: 'Argument + Exemple lié' },
            { id: 'DEV_AXE2', label: '4. Axe 2 (Antithèse)', num: '4', desc: 'Nuance + Exemple lié' },
            { id: 'CONCL', label: '5. Conclusion', num: '5', desc: 'Bilan + Point de vue' },
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Plan Dialectique */}
              <div
                onClick={() => setSelectedPlan('DIALECTIQUE')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  selectedPlan === 'DIALECTIQUE'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-blue-950 font-outfit">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>Plan Dialectique (Recommandé si controverse)</span>
                  </div>
                  {selectedPlan === 'DIALECTIQUE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Sélectionné
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                  Idéal pour les sujets d'opinion (« Partagez-vous ce point de vue ? », « Êtes-vous d'accord ? »).
                  Permet de confronter la thèse (Axe 1) et l'antithèse (Axe 2) avant d'équilibrer en conclusion.
                </p>
                <div className="text-[11px] font-semibold text-blue-900 bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                  Structure : Accroche ➔ Confrontation des thèses (« Certains... d'autres en revanche... ») ➔ Problématique ➔ Thèse (Axe 1) ➔ Antithèse (Axe 2) ➔ Bilan.
                </div>
              </div>

              {/* Option Plan Simple */}
              <div
                onClick={() => setSelectedPlan('SIMPLE')}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  selectedPlan === 'SIMPLE'
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-outfit">
                    <AlignLeft className="w-4 h-4 text-indigo-600" />
                    <span>Plan Simple / Thématique</span>
                  </div>
                  {selectedPlan === 'SIMPLE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Sélectionné
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                  Recommandé lorsque le sujet invite à expliquer un phénomène sans opposition frontale (Causes / Conséquences, ou plusieurs facettes d'un même constat).
                </p>
                <div className="text-[11px] font-semibold text-slate-800 bg-slate-100 p-2 rounded-lg border border-slate-200">
                  Structure : Accroche ➔ Définition du thème ➔ Problématique ➔ Aspect 1 (Axe 1) ➔ Aspect 2 (Axe 2) ➔ Synthèse finale.
                </div>
              </div>
            </div>

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
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
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

            {/* 2. CONFRONTATION DES THÈSES */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>
                    {selectedPlan === 'DIALECTIQUE'
                      ? '2. Confrontation des thèses : « Certains... d\'autres en revanche estiment... »'
                      : '2. Sujet posé / Explication du thème'}
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
                    <button
                      type="button"
                      onClick={() => setIntroTheses(`Ce constat s'impose avec acuité dans notre quotidien et interpelle l'ensemble des citoyens. `)}
                      className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition font-medium cursor-pointer"
                    >
                      + Explication thématique
                    </button>
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
                    : "Présentez clairement le sujet et expliquez pourquoi cette affirmation est au cœur de l'actualité..."
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
                    onClick={() => setIntroProblematique(`Dès lors, ${subjectAnalysis.questionCentrale} ? `)}
                    className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 transition font-medium cursor-pointer"
                  >
                    + Formule interrogative adaptée
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntroProblematique('Face à ce dilemme, convient-il d\'adhérer pleinement à ce point de vue ou doit-on plutôt en mesurer les nuances ? ')}
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
                placeholder="Exemple : Dès lors, dans quelle mesure peut-on affirmer que la solidarité constitue le pilier de toute vie en société ?"
                className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition"
              />
            </div>

            {/* 4. ANNONCE DU PLAN / SUJET DIVISÉ */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>4. Annonce du Plan / Sujet divisé (Selon le plan : {selectedPlan})</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan === 'DIALECTIQUE') {
                      setIntroAnnoncePlan('Dans un premier temps, nous mettrons en lumière les arguments qui corroborent cette idée, avant d\'examiner dans un second temps les nuances et les réserves qui s\'imposent.');
                    } else {
                      setIntroAnnoncePlan('Dans un premier temps, nous analyserons les causes fondamentales de cette situation, avant d\'étudier dans un second temps ses répercussions directes sur notre vie quotidienne.');
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
                placeholder="Exemple : Dans un premier temps, nous analyserons les arguments favorables, avant d'aborder les réserves légitimes..."
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
                  <span>Étape 3 : Développement — Axe 1 (Thèse ou Premier Volet)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Règle d'or : Amorce (🔵) ➔ Argument clair (Pourquoi/Comment) ➔ Justification (🟣) ➔ Exemple adapté tiré de l'œuvre (🟢).
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('DEV_AXE1')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Axe 1)</span>
              </button>
            </div>

            {/* Suggestions d'arguments clairs et bien expliqués en langage simple */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Modèles d'Arguments Clairs & Bien Expliqués (Langage Simple) :</span>
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
                      2. Votre Argument (Clair, explicite, langage simple)
                    </label>
                    <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                      Idée directrice
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={dev1Argument}
                    onChange={(e) => setDev1Argument(e.target.value)}
                    placeholder={`Exemple : ${subjectAnalysis.these1}...`}
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
                    placeholder={`Exemple : ${subjectAnalysis.these1Explication}`}
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
                    Étape 4 : Développement — Axe 2 {selectedPlan === 'DIALECTIQUE' ? '(Antithèse / Nuances)' : '(Second Volet Complémentaire)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {selectedPlan === 'DIALECTIQUE'
                    ? 'Opposition / Nuance (🟠) ➔ Contre-argument clair et expliqué ➔ Justification (🟣) ➔ Exemple de l\'œuvre (🟢).'
                    : 'Addition (🔵) ➔ Second argument clair et expliqué ➔ Justification (🟣) ➔ Exemple de l\'œuvre (🟢).'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('DEV_AXE2')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Générer 2 Reformulations (Axe 2)</span>
              </button>
            </div>

            {/* Suggestions de contre-arguments clairs et bien expliqués en langage simple */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>
                    Modèles de Contre-Arguments Clairs & Bien Expliqués (Langage Simple) :
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
                    <span>1. Connecteur de transition / nuance (Orange Ambré)</span>
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(selectedPlan === 'DIALECTIQUE'
                      ? ['Cependant, ', 'En revanche, ', 'Toutefois, ', 'Néanmoins, ', 'D\'autre part, ']
                      : ['D\'autre part, ', 'Par ailleurs, ', 'En second lieu, ', 'De surcroît, ']
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
                      2. Votre Contre-Argument (Clair et bien expliqué)
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                      {selectedPlan === 'DIALECTIQUE' ? 'Antithèse / Réserve' : 'Second aspect'}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={dev2Argument}
                    onChange={(e) => setDev2Argument(e.target.value)}
                    placeholder={`Exemple : ${subjectAnalysis.these2}...`}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Astuce : Les exemples de l'œuvre ci-contre suivent automatiquement votre contre-argument !
                  </p>
                </div>

                {/* 3. Justification */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>3. Justification (Violet Impérial)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={dev2Explication}
                    onChange={(e) => setDev2Explication(e.target.value)}
                    placeholder={`Exemple : ${subjectAnalysis.these2Explication}`}
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
                  <span>Étape 5 : La Conclusion (Bilan Synthétique, Prise de Position & Ouverture)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  La conclusion scelle votre note. Elle résume les deux axes sans hors-sujet et formule votre point de vue nuancé en langage clair.
                </p>
              </div>

              <button
                type="button"
                onClick={() => generateTwoVariants('CONCL')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
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
                {['En définitive, ', 'En somme, ', 'Au terme de cette réflexion, ', 'Pour conclure, '].map((c) => (
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
                2. Synthèse & Prise de position personnelle nuancée (Langage simple)
              </label>
              <textarea
                rows={2}
                value={conclPointDeVue}
                onChange={(e) => setConclPointDeVue(e.target.value)}
                placeholder="Exemple : pour ma part, j'estime que la liberté individuelle ne prend tout son sens que lorsqu'elle s'articule avec le respect des valeurs communes..."
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
                  const full = `${conclBilan}${conclPointDeVue} ${conclOuverture}`.trim();
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
                  <Sparkles className="w-4 h-4 text-amber-600" />
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
