const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- INITIALISATION DE L'INTELLIGENCE ARTIFICIELLE ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- GESTION DE LA SESSION PROFESSEUR CÔTÉ SERVEUR ---
let professeurAuthentifie = false;

// --- SERVIR LES FICHIERS STATIQUES DE L'INTERFACE ---
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTE DE VÉRIFICATION DU MOT DE PASSE ---
app.post('/api/connexion', (req, res) => {
  const { password } = req.body;
  if (password === "Akhawayn2026!") {
    professeurAuthentifie = true;
    return res.json({ success: true, message: "Authentification réussie." });
  }
  return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
});

// --- ROUTE POUR VÉRIFIER SI LE PROFESSEUR EST DÉJÀ CONNECTÉ ---
app.get('/api/verifier-session', (req, res) => {
  res.json({ authentifie: professeurAuthentifie });
});

// --- FONCTIONS LOGIQUES DE SECOURS (FALLBACK LOCAL) ---
function detecterSujetAnalytique(sujet) {
  if (!sujet) return false;
  var sLower = sujet.toLowerCase();
  return /(causes|raisons|cons[ée]quences|effets|impacts|solutions|mesures|pourquoi|comment expliquer)/i.test(sLower);
}

function estHorsSujet(sujet, texte) {
  if (!sujet || sujet.trim().length < 4) return false;
  var sMots = sujet.toLowerCase().replace(/[^\w\sàâäéèêëîïôöùûüç]/g, '').split(/\s+/);
  var motsSignificatifs = sMots.filter(function(m) { 
    return m.length > 3 && !['dans', 'pour', 'avec', 'sont', 'vous', 'que', 'qui', 'les', 'des'].includes(m); 
  });
  if (motsSignificatifs.length === 0) return false;

  var tLower = texte.toLowerCase();
  var matchesCount = 0;
  motsSignificatifs.forEach(function(mot) {
    if (tLower.indexOf(mot) !== -1) matchesCount++;
  });

  return (matchesCount / motsSignificatifs.length) < 0.20;
}

function genererTexteOptimiseSecours(sujet, planType, isAnalytique) {
  var sujetPur = "la solitude de l'individu au sein de son propre foyer";
  if (sujet && sujet.trim().length > 3) {
    var net = sujet.replace(/(Alors,|Qu'en pensez-vous\?|Que pensez-vous\?|Développez votre réflexion.*?|dans un texte argumenté.*?|illustré d'exemples.*?)/gi, '').trim();
    net = net.replace(/[?.!:]/g, '').trim();
    if (net.length > 10 && net.length < 150) sujetPur = net;
  }

  var sujetLower = (sujet || "").toLowerCase();
  var isBoite = /bo[îi]te|sefrioui|sidi\s+mohammed|chouafa/i.test(sujetLower);
  var isAntigone = /antigone|anouilh|cr[ée]on/i.test(sujetLower);
  var isCondamne = /condamn[ée]|victor\s+hugo|bic[êe]tre/i.test(sujetLower);

  var intro = "";
  if (isBoite) {
    intro = "<div class='academic-para'><span class='c-intro'>À la lecture attentive du roman autobiographique <em>La Boîte à merveilles</em> d'Ahmed Sefrioui, notamment à travers le personnage de Sidi Mohammed, on se rend vite compte que</span> " + sujetPur + " <span class='c-intro'>occupe une place centrale. Dès lors, s'agit-il d'un simple repli ou d'un véritable danger pour l'équilibre de l'enfant ? En effet, l'isolement au Msid ou à la maison renvoie à une profonde solitude existentielle. Par conséquent, il convient d'analyser les causes et les répercussions de ce phénomène dans le texte.</span></div>";
  } else if (isAntigone) {
    intro = "<div class='academic-para'><span class='c-intro'>L'étude approfondie de la tragédie <em>Antigone</em> de Jean Anouilh montre clairement que</span> " + sujetPur + " <span class='c-intro'>place les consciences face à un choix crucial, à l'image du personnage de Créon ou d'Antigone confrontée à sa solitude. Dès lors, comment analyser cette situation face aux contraintes du pouvoir et de la destinée ? Il est primordial d'examiner les motivations profondes de ce comportement tragique.</span></div>";
  } else if (isCondamne) {
    intro = "<div class='academic-para'><span class='c-intro'>En découvrant les pages poignantes de l'œuvre <em>Le Dernier Jour d'un condamné</em> de Victor Hugo, force est de constater que</span> " + sujetPur + " <span class='c-intro'>révèle une immense détresse humaine et un enfermement total à Bicêtre. Dès lors, quelle position adopter face à cette solitude carcérale ? Cette question mérite un examen approfondi des arguments en présence.</span></div>";
  } else if (isAnalytique) {
    intro = "<div class='academic-para'><span class='c-intro'>De nos jours</span>, <span class='c-intro'>" + sujetPur + "</span> <span class='c-intro'>pose un problème sociétal complexe qui suscite de nombreuses interrogations légitimes. En premier lieu, face aux mutations de la société moderne, l'individu se retrouve souvent confronté à lui-même. Dès lors, quelles en sont les causes profondes et quelles solutions peut-on envisager pour y remédier durablement ?</span></div>";
  } else {
    intro = "<div class='academic-para'><span class='c-intro'>Il est fréquent de constater que</span> " + sujetPur + ", <span class='c-intro'>ce qui engendre un réel débat au sein de la société contemporaine. Pour bien cerner les enjeux de cette problématique, il est indispensable d'analyser les différents aspects liés à cette question délicate et d'en mesurer toutes les répercussions sur le plan humain.</span></div>";
  }

  var dev1 = "", dev2 = "", dev3 = "";
  if (isAnalytique) {
    dev1 = "<div class='academic-para'><span class='c-dev'>En premier lieu</span>, <span class='c-dev'>sur le plan des causes, il est indéniable que le rythme de vie trépidant, l'omniprésence des écrans et l'affaiblissement du dialogue familial favorisent grandement le repli sur soi. Cet isolement progressif coupe l'individu de ses repères affectifs et sociaux fondamentaux.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-dev'>En second lieu</span>, <span class='c-dev'>les conséquences de cette situation se traduisent par une fragilisation psychologique évidente, de l'anxiété et une perte progressive du sens de la communication interpersonnelle au sein même du foyer.</span></div>";
    dev3 = "<div class='academic-para'><span class='c-opp'>Enfin</span>, <span class='c-opp'>pour résoudre efficacement ce problème, l'écoute active, le renforcement des liens familiaux et le soutien psychologique s'avèrent des solutions indispensables et urgentes.</span></div>";
  } else if (planType === 'dialectique') {
    dev1 = "<div class='academic-para'><span class='c-dev'>D'un côté, certains estiment que</span> <span class='c-dev'>la solitude au sein du foyer peut offrir un espace nécessaire de repos, d'introspection et de protection contre les agressions du monde extérieur.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-opp'>D'un autre côté, il ne faut pas oublier que</span> <span class='c-opp'>si cet isolement devient permanent, il engendre l'exclusion, l'incompréhension et nuit gravement à l'épanouissement personnel et familial.</span></div>";
    dev3 = "<div class='academic-para'><span class='c-concl'>Il apparaît donc clairement qu'</span> <span class='c-concl'>un juste équilibre s'impose entre le besoin légitime de moments d'intimité et la nécessité absolue du partage.</span></div>";
  } else {
    dev1 = "<div class='academic-para'><span class='c-dev'>D'abord</span>, <span class='c-dev'>la recherche de la solitude s'explique par un besoin légitime de recul face aux pressions de la vie quotidienne et aux exigences de l'entourage.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-dev'>De surcroît</span>, <span class='c-dev'>cet état passager favorise la créativité, la maturité intellectuelle et aide l'individu à fortifier sa personnalité.</span></div>";
    dev3 = "<div class='academic-para'><span class='c-dev'>Toutefois</span>, <span class='c-dev'>cet ancrage doit rester mesuré pour ne pas basculer dans une marginalisation dangereuse.</span></div>";
  }

  var concl = "<div class='academic-para'><span class='c-concl'>En définitive</span>, <span class='c-concl'>il ressort de cette analyse approfondie que</span> <span class='c-concl'>" + sujetPur + "</span> <span class='c-concl'>constitue un enjeu majeur qui nécessite de concilier harmonieusement autonomie personnelle et communication au quotidien, tout en gardant à l'esprit les leçons universelles que nous enseignent les grandes œuvres littéraires.</span></div>";

  return intro + dev1 + dev2 + dev3 + concl;
}

// --- ROUTE PRINCIPALE D'ÉVALUATION PAR L'IA ---
app.post('/api/evaluer', async (req, res) => {
  const { sujet, texte, nom, niveau, planMode } = req.body;

  const isAnalytique = detecterSujetAnalytique(sujet);
  const thematiqueHorsSujet = estHorsSujet(sujet, texte);
  
  let isHorsSujet = thematiqueHorsSujet;
  let messageHorsSujet = isHorsSujet ? "🚨 ALERTE HORS-SUJET / DÉCALAGE DE CONSIGNE : Le traitement de la consigne ne correspond pas aux attentes académiques requises. Note éliminatoire absolue de 0.00 / 10." : "";

  try {
    const promptSysteme = `
      Tu es un professeur de français intransigeant et un correcteur officiel expert pour les examens régionaux (1ère BAC) et les concours de l'enseignement au Maroc.
      Analyse extrêmement rigoureusement le texte de l'élève fourni ci-dessous. Tu DOIS produire un rapport d'évaluation complet, détaillé et structuré selon les exigences académiques marocaines.

      Voici les impératifs absolus de ta réponse :
      1. Détection des erreurs (langue et syntaxe) : Passe en revue le texte de l'élève. Si des fautes d'orthographe, de grammaire, de conjugaison, d'accord ou de syntaxe sont présentes, cite explicitement le passage erroné et propose la correction en rouge vif avec ce style exact : <span style='color: #c5221f; font-weight: bold; background: #fee2e2; padding: 1px 4px; border-radius: 4px;'>[Correction / Explication]</span>.
      2. Propositions de reformulations : Identifie les phrases faibles, lourdes ou mal construites du texte de l'élève. Pour chaque phrase faible repérée, propose une reformulation claire, élégante, enrichie en vocabulaire précis et articulée par de bons connecteurs logiques.
      3. Remarques et recommandations pédagogiques : Rédige des conseils méthodologiques sur mesure, précis et constructifs pour aider l'élève à progresser.
      4. Texte modèle optimisé et unifié : Rédige un texte argumentatif modèle d'une longueur riche et conséquente (minimum 18 à 20 lignes/développements), structuré en paragraphes HTML avec les classes span c-intro, c-dev, c-opp, c-concl. 
         - ATTENTION : Si le sujet de production écrite mentionne explicitement une œuvre littéraire au programme (ex: "La Boîte à merveilles" d'Ahmed Sefrioui, "Antigone" de Jean Anouilh, ou "Le Dernier Jour d'un condamné" de Victor Hugo), ton texte modèle DOIT impérativement intégrer des exemples littéraires précis tirés de ces œuvres (ex: mentionner Sidi Mohammed, Lalla Zoubida, le Msid, le pacha, Créon, le condamné à mort, etc.). Si aucune œuvre n'est mentionnée dans le sujet, base ton texte sur des exemples solides de la vie quotidienne et de la société.

      Retourne UNIQUEMENT un objet JSON valide (sans aucun bloc de code markdown \`\`\`json) contenant exactement les clés suivantes :
      {
        "total": "note sur 10 sous forme de chaîne (ex: '14.00' ou '9.50')",
        "notes": {
          "consigne": nombre,
          "structure": nombre,
          "arguments": nombre,
          "langue": nombre,
          "lexique": nombre
        },
        "erreursDetectees": "Le texte HTML détaillé listant les erreurs relevées dans le texte de l'élève et affichant les corrections en rouge.",
        "reformulations": "Un tableau ou une liste claire présentant les phrases faibles de l'élève accompagnées de leurs propositions de reformulations argumentées et riches en connecteurs.",
        "remarquesPedagogiques": "Bilan qualitatif constructif et recommandations pédagogiques sur mesure.",
        "texteModele": "Le texte modèle académique complet d'une longueur de 18 à 20 lignes minimum, structuré en paragraphes HTML avec des balises span c-intro, c-dev, c-opp, c-concl, intégrant des exemples littéraires si le sujet le requiert ou du quotidien dans le cas contraire."
      }

      Sujet: "${sujet}"
      Niveau de l'élève: "${niveau}"
      Texte de l'élève:
      "${texte}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptSysteme,
    });

    let jsonResponseText = response.text().trim();
    if (jsonResponseText.startsWith("```json")) {
      jsonResponseText = jsonResponseText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (jsonResponseText.startsWith("```")) {
      jsonResponseText = jsonResponseText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const aiData = JSON.parse(jsonResponseText);

    res.json({
      nom,
      niveau,
      total: aiData.total,
      notes: aiData.notes,
      isSujetAnalytique: isAnalytique,
      isHorsSujet,
      messageHorsSujet,
      erreursDetectees: aiData.erreursDetectees,
      reformulations: aiData.reformulations,
      remarquesPedagogiques: aiData.remarquesPedagogiques,
      texteModele: aiData.texteModele
    });

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini :", error);

    let notes = { consigne: 0, structure: 0, arguments: 0, langue: 0, lexique: 0 };
    if (!isHorsSujet) {
      const paragraphes = texte.split(/\n+/).filter(p => p.trim().length > 0);
      const motsCount = texte.trim().split(/\s+/).length;
      const aConclusion = /(en définitive|en conclusion|pour conclure|finalement|ainsi|bref)/i.test(texte);
      const aOpposition = /(cependant|en revanche|toutefois|mais|néanmoins)/i.test(texte);

      if (paragraphes.length >= 3 && motsCount >= 60 && aConclusion) {
        notes.consigne = 2.0;
        notes.structure = 2.0;
        notes.arguments = (!isAnalytique && !aOpposition) ? 1.0 : 2.0;
        notes.lexique = 1.5;
        notes.langue = 2.0;
      }
    }

    const total = (notes.consigne + notes.structure + notes.arguments + notes.langue + notes.lexique).toFixed(2);
    const texteModele = genererTexteOptimiseSecours(sujet, planMode, isAnalytique);

    res.json({
      nom,
      niveau,
      total,
      notes,
      isSujetAnalytique: isAnalytique,
      isHorsSujet,
      messageHorsSujet,
      erreursDetectees: "Analyse de secours : Veuillez vérifier attentivement l'accord des participes passés et la syntaxe générale des phrases.",
      reformulations: "Privilégiez l'utilisation de connecteurs logiques variés et structurez vos phrases avec des propositions subordonnées plus riches.",
      remarquesPedagogiques: "Effort louable. Veillez à bien structurer vos paragraphes en veillant à la clarté de l'argumentation.",
      texteModele
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur pédagogique du Centre Pro-Langues & Prépa Concours démarré sur le port ${PORT}`);
});
