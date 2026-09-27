const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTE D'ACCUEIL DU SERVEUR ---
app.get('/', (req, res) => {
  res.send('✅ Le serveur pédagogique du Centre Pro-Langues & Prépa Concours est en ligne et opérationnel !');
});

// --- FONCTIONS LOGIQUES PROTÉGÉES CÔTÉ SERVEUR ---

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

function compterFautesLangue(texte) {
  var fautesDetectees = 0;
  var dictionnairesFautes = [
    /\bPersonnelle\b/gi, /\bpratiqu\b/gi, /\bne\s+sot\b/gi, /\bensuit\b/gi,
    /\ballor\b/gi, /\bpeut\s+etre\b/gi, /\bbeaucoupe\b/gi, /\bmalgres\b/gi,
    /\bparceque\b/gi, /\ble\s+gens\b/gi, /\bun\s+probléme\b/gi, /\bsociétée\b/gi,
    /\bils\s+(a\b|est\b|va\b|veut\b|peut\b)/gi, /\ble\s+personne\b/gi, /\bun\s+solution\b/gi
  ];

  dictionnairesFautes.forEach(function(reg) {
    var matches = texte.match(reg);
    if (matches) fautesDetectees += matches.length;
  });

  return fautesDetectees;
}

function genererTexteOptimise(sujet, planType, isAnalytique) {
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
    intro = "<div class='academic-para'><span class='c-intro'>À la lecture attentive du roman autobiographique <em>La Boîte à merveilles</em> d'Ahmed Sefrioui, on se rend vite compte que</span> " + sujetPur + " <span class='c-intro'>occupe une place centrale. Dès lors, s'agit-il d'un simple repli ou d'un véritable danger ?</span></div>";
  } else if (isAntigone) {
    intro = "<div class='academic-para'><span class='c-intro'>L'étude approfondie de la tragédie <em>Antigone</em> de Jean Anouilh montre clairement que</span> " + sujetPur + " <span class='c-intro'>place les consciences face à un choix crucial. Dès lors, comment analyser cette situation ?</span></div>";
  } else if (isCondamne) {
    intro = "<div class='academic-para'><span class='c-intro'>En découvrant les pages de l'œuvre <em>Le Dernier Jour d'un condamné</em> de Victor Hugo, force est de constater que</span> " + sujetPur + " <span class='c-intro'>révèle une grande détresse humaine. Dès lors, quelle position adopter ?</span></div>";
  } else if (isAnalytique) {
    intro = "<div class='academic-para'><span class='c-intro'>De nos jours</span>, <span class='c-intro'>" + sujetPur + "</span> <span class='c-intro'>pose un problème qui suscite de nombreuses interrogations. Dès lors, quelles en sont les causes et les solutions ?</span></div>";
  } else {
    intro = "<div class='academic-para'><span class='c-intro'>Il est fréquent de constater que</span> " + sujetPur + ", <span class='c-intro'>ce qui engendre un réel débat au sein de la société. Dès lors, qu'en penser ?</span></div>";
  }

  var dev1 = "", dev2 = "";
  if (isAnalytique) {
    dev1 = "<div class='academic-para'><span class='c-dev'>En premier lieu</span>, <span class='c-dev'>sur le plan des causes, il est clair que les tensions et le rythme de vie moderne favorisent le repli sur soi.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-opp'>En second lieu</span>, <span class='c-opp'>pour résoudre ce problème, l'écoute et le soutien psychologique s'avèrent indispensables.</span></div>";
  } else if (planType === 'dialectique') {
    dev1 = "<div class='academic-para'><span class='c-dev'>Certes</span>, <span class='c-dev'>on peut comprendre que la solitude au sein du foyer offre parfois un espace de repos ou un moyen de se protéger.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-opp'>En revanche</span>, <span class='c-opp'>il ne faut pas oublier que si cet isolement s'installe durablement, il devient destructeur et nuit à l'équilibre familial.</span></div>";
  } else {
    dev1 = "<div class='academic-para'><span class='c-dev'>D'abord</span>, <span class='c-dev'>la recherche de la solitude au milieu des siens s'explique par un besoin légitime de recul face aux pressions extérieures.</span></div>";
    dev2 = "<div class='academic-para'><span class='c-dev'>De surcroît</span>, <span class='c-dev'>cet état passager favorise l'introspection et aide l'individu à mieux se connaître.</span></div>";
  }

  var concl = "<div class='academic-para'><span class='c-concl'>En définitive</span>, <span class='c-concl'>il ressort de cette analyse que</span> <span class='c-concl'>" + sujetPur + "</span> <span class='c-concl'>constitue une situation délicate qui nécessite un juste équilibre entre autonomie et communication.</span></div>";

  return intro + dev1 + dev2 + concl;
}

// --- ROUTE DE TRAITEMENT DE L'ÉVALUATION ---
app.post('/api/evaluer', (req, res) => {
  const { sujet, texte, nom, niveau, planMode } = req.body;

  const isAnalytique = detecterSujetAnalytique(sujet);
  const thematiqueHorsSujet = estHorsSujet(sujet, texte);
  
  let messageHorsSujet = "";
  let isHorsSujet = false;

  const sujetLower = (sujet || "").toLowerCase();
  const texteLower = (texte || "").toLowerCase();
  const estSujetAvis = /pensez|avis|faut-il|préférez|approuvez/i.test(sujetLower);
  const eleveTraiteEnAnalytique = /(quelles seraient.*causes|causes de ce phénomène)/i.test(texteLower);
  const eleveTraiteEnAvisSimple = !/(causes|conséquences|facteurs|mesures|solutions)/i.test(texteLower) && /(certes|en revanche|pour ma part)/i.test(texteLower);

  if (thematiqueHorsSujet || (estSujetAvis && eleveTraiteEnAnalytique) || (isAnalytique && eleveTraiteEnAvisSimple)) {
    isHorsSujet = true;
    messageHorsSujet = "🚨 ALERTE HORS-SUJET / DÉCALAGE DE CONSIGNE : Le traitement de la consigne ne correspond pas aux attentes académiques requises. Note éliminatoire absolue de 0.00 / 10.";
  }

  let notes = { consigne: 0, structure: 0, arguments: 0, langue: 0, lexique: 0 };

  if (!isHorsSujet) {
    const paragraphes = texte.split(/\n+/).filter(p => p.trim().length > 0);
    const motsCount = texte.trim().split(/\s+/).length;
    const aConclusion = /(en définitive|en conclusion|pour conclure|finalement|ainsi|bref)/i.test(texte);
    const aOpposition = /(cependant|en revanche|toutefois|mais|néanmoins)/i.test(texte);
    const aDeveloppement = /(en premier lieu|certes|d'abord|en second lieu|ensuite)/i.test(texte);

    if (paragraphes.length >= 3 && motsCount >= 60 && aConclusion) {
      notes.consigne = 2.0;
      notes.structure = 2.0;
      notes.arguments = (!isAnalytique && !aOpposition) ? 1.0 : 2.0;
      notes.lexique = 1.5;

      const nbFautes = compterFautesLangue(texte);
      notes.langue = Math.max(0.0, 2.5 - (nbFautes * 0.5));
    }
  }

  const total = (notes.consigne + notes.structure + notes.arguments + notes.langue + notes.lexique).toFixed(2);
  const texteModele = genererTexteOptimise(sujet, planMode, isAnalytique);

  res.json({
    nom,
    niveau,
    total,
    notes,
    isSujetAnalytique: isAnalytique,
    isHorsSujet,
    messageHorsSujet,
    texteModele
  });
});

app.listen(PORT, () => {
  console.log(`Serveur pédagogique du Centre Pro-Langues & Prépa Concours démarré sur le port ${PORT}`);
});