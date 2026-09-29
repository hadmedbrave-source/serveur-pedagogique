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
    intro = "<div class='academic-para'><span class='c-intro'>À la lecture attentive du roman autobiographique <em>La Boîte à merveilles</em> d'Ahmed Sefrioui, notamment à travers le personnage de Sidi Mohammed, on se rend vite compte que</span> " + sujetPur + " <span class='c-intro'>occupe une place centrale. Dès lors, s'agit-il d'un simple repli ou d'un véritable danger pour l'équilibre de l'enfant ?</span></div>";
  } else if (isAntigone) {
    intro = "<div class='academic-para'><span class='c-intro'>L'étude approfondie de la tragédie <em>Antigone</em> de Jean Anouilh montre clairement que</span> " + sujetPur + " <span class='c-intro'>place les consciences face à un choix crucial, à l'image du personnage de Créon. Dès lors, comment analyser cette situation face aux contraintes du pouvoir ?</span></div>";
  } else if (isCondamne) {
    intro = "<div class='academic-para'><span class='c-intro'>En découvrant les pages poignantes de l'œuvre <em>Le Dernier Jour d'un condamné</em> de Victor Hugo, force est de constater que</span> " + sujetPur + " <span class='c-intro'>révèle une immense détresse humaine et un enfermement total à Bicêtre. Dès lors, quelle position adopter ?</span></div>";
  } else if (isAnalytique) {
    intro = "<div class='academic-para'><span class='c-intro'>De nos jours</span>, <span class='c-intro'>" + sujetPur + "</span> <span class='c-intro'>pose un problème sociétal complexe qui suscite de nombreuses interrogations légitimes. Dès lors, quelles en sont les causes profondes et quelles solutions peut-on envisager ?</span></div>";
  } else {
    intro = "<div class='academic-para'><span class='c-intro'>Il est fréquent de constater que</span> " + sujetPur + ", <span class='c-intro'>ce qui engendre un réel débat au sein de la société contemporaine. Pour bien cerner les enjeux, il est indispensable d'analyser les différents aspects de cette question.</span></div>";
  }

  var dev1 = "", dev2 = "", dev3 = "";
  if (isAnalytique) {
    dev1 = "<div class='academic-para'><strong>En premier lieu</strong>, <span class='c-dev'>sur le plan des causes, il est indéniable que le rythme de vie trépidant et l'affaiblissement du dialogue familial favorisent grandement le repli sur soi.</span></div>";
    dev2 = "<div class='academic-para'><strong>En second lieu</strong>, <span class='c-dev'>les conséquences de cette situation se traduisent par une fragilisation psychologique évidente et une perte de communication.</span></div>";
    dev3 = "<div class='academic-para'><strong>Enfin</strong>, <span class='c-opp'>pour résoudre efficacement ce problème, l'écoute active et le renforcement des liens familiaux s'avèrent indispensables.</span></div>";
  } else if (planType === 'dialectique') {
    dev1 = "<div class='academic-para'><strong>D'un côté</strong>, <span class='c-dev'>certains estiment que la solitude au sein du foyer peut offrir un espace nécessaire de repos et d'introspection.</span></div>";
    dev2 = "<div class='academic-para'><strong>D'un autre côté</strong>, <span class='c-opp'>il ne faut pas oublier que si cet isolement devient permanent, il engendre l'exclusion et nuit à l'épanouissement.</span></div>";
    dev3 = "<div class='academic-para'><strong>Il apparaît donc clairement qu'</strong> <span class='c-concl'>un juste équilibre s'impose entre intimité et partage.</span></div>";
  } else {
    dev1 = "<div class='academic-para'><strong>D'abord</strong>, <span class='c-dev'>la recherche de la solitude s'explique par un besoin légitime de recul face aux pressions de la vie quotidienne.</span></div>";
    dev2 = "<div class='academic-para'><strong>De surcroît</strong>, <span class='c-dev'>cet état passager favorise la créativité et la maturité intellectuelle.</span></div>";
    dev3 = "<div class='academic-para'><strong>Toutefois</strong>, <span class='c-dev'>cet ancrage doit rester mesuré.</span></div>";
  }

  var concl = "<div class='academic-para'><strong>En définitive</strong>, <span class='c-concl'>il ressort de cette analyse approfondie que</span> <span class='c-concl'>" + sujetPur + "</span> <span class='c-concl'>constitue un enjeu majeur qui nécessite de concilier harmonieusement autonomie personnelle et communication.</span></div>";

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
      Analyse rigoureusement le texte de l'élève fourni ci-dessous.

      Règles de mise en forme strictes pour la clé "erreursDetectees":
      1. Reprends l'intégralité du texte de l'élève en conservant sa structure globale (paragraphes).
      2. Le texte de base doit s'afficher en noir normal.
      3. Pour chaque faute d'orthographe, de grammaire, d'accord, de conjugaison ou de syntaxe commise par l'élève, insère directement à l'endroit de la faute la correction en rouge vif sous ce format exact : <span style='color: #c5221f; font-weight: bold; background: #fee2e2; padding: 1px 4px; border-radius: 4px;'>[Mot corrigé / Explication]</span>. Ne supprime pas le mot de l'élève, fais suivre ou encadre la correction proprement.
      4. Tous les connecteurs logiques et liens logiques employés par l'élève dans son texte DOIVENT obligatoirement être mis en Rendu HTML <strong>en gras et en noir</strong> (ex: <strong>En premier lieu</strong>, <strong>Cependant</strong>, <strong>Enfin</strong>, etc.).

      Règles pour la clé "reformulations":
      - Fournis un tableau HTML ou une liste claire présentant les phrases faibles de l'élève accompagnées de propositions de reformulations argumentées, riches en vocabulaire et en connecteurs logiques.

      Règles pour les autres clés :
      - "remarquesPedagogiques": Bilan qualitatif constructif et recommandations sur mesure.
      - "texteModele": Un texte argumentatif modèle complet (18 à 20 lignes) structuré en paragraphes HTML (c-intro, c-dev, c-opp, c-concl) avec des exemples littéraires ou du quotidien.

      Retourne UNIQUEMENT un objet JSON valide (sans aucun bloc de code markdown \`\`\`json) contenant exactement les clés suivantes :
      {
        "total": "note sur 10 sous forme de chaîne (ex: '13.50')",
        "notes": {
          "consigne": nombre,
          "structure": nombre,
          "arguments": nombre,
          "langue": nombre,
          "lexique": nombre
        },
        "erreursDetectees": "Le texte de l'élève complet en noir, avec les fautes corrigées en rouge vif via le span indiqué, et les liens logiques en <strong>gras et noir</strong>.",
        "reformulations": "Tableau ou liste claire des propositions de reformulations des phrases lourdes ou incorrectes.",
        "remarquesPedagogiques": "Bilan qualitatif constructif.",
        "texteModele": "Le texte modèle académique complet structuré en paragraphes HTML avec des balises span c-intro, c-dev, c-opp, c-concl."
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
      erreursDetectees: "Transcription de secours : Vérifiez l'accord des participes passés et la syntaxe générale.",
      reformulations: "Privilégiez l'utilisation de connecteurs logiques variés et structurez vos phrases.",
      remarquesPedagogiques: "Effort louable. Veillez à bien structurer vos paragraphes.",
      texteModele
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur pédagogique du Centre Pro-Langues & Prépa Concours démarré sur le port ${PORT}`);
});
