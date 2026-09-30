const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let professeurAuthentifie = false;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/connexion', (req, res) => {
  const { password } = req.body;
  if (password === 'Akhawayn2026!') {
    professeurAuthentifie = true;
    return res.json({ success: true, message: 'Authentification réussie.' });
  }
  return res.status(403).json({ success: false, message: 'Mot de passe incorrect.' });
});

app.get('/api/verifier-session', (req, res) => {
  return res.json({ professeurAuthentifie });
});

async function appelerGeminiAvecRetry(promptSysteme, maxTentatives = 3) {
  for (let tentative = 1; tentative <= maxTentatives; tentative++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: promptSysteme,
        config: {
          responseMimeType: 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.warn(`Tentative ${tentative} échouée :`, error.message);
      if (tentative === maxTentatives || (!error.message.includes('503') && !error.message.includes('high demand'))) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, tentative * 2000));
    }
  }
}

app.post('/api/evaluer', async (req, res) => {
  try {
    const texte = req.body.texte || req.body.texteEleve;
    const sujet = req.body.sujet || 'Sujet libre';
    const nom = req.body.nom || 'Candidat(e)';
    const niveau = req.body.niveau || req.body.niveauScolaire || '1ère BAC';
    const planMode = req.body.planMode || 'simple';

    if (!texte || texte.trim() === '') {
      return res.status(400).json({ error: "Le texte de l'élève est requis." });
    }

    const promptSysteme = `
Tu es un inspecteur et correcteur officiel expert pour le Centre Al Akhawayn (Centre Pro-Langues & Prépa Concours).
Tu évalues une copie de production écrite pour l'examen régional selon le barème officiel marocain sur 10 points.

Informations de la copie :
- Candidat : "${nom}"
- Niveau scolaire : "${niveau}"
- Sujet posé : "${sujet}"
- Mode de plan sélectionné : "${planMode}"

Copie originale de l'élève :
"""
${texte}
"""

Critères de notation stricts (Total sur 10 Points) :
1. Consigne & organisation (sur 2.0)
2. Structure argumentative du plan (sur 2.0)
3. Force argumentative & exemples (sur 2.0)
4. Correction de la langue (orthographe, grammaire, syntaxe, conjugaison) (sur 2.5)
5. Richesse lexicale (sur 1.5)

Détection hors-sujet :
- Si la rédaction est manifestement hors-sujet, attribue 0 à tous les critères, passe isHorsSujet à true et donne une explication dans messageHorsSujet.

Consignes pour les retours pédagogiques :
- "texteTranscrit" : Reprends le texte de l'élève en mettant les erreurs repérées en rouge gras (<span style="color:#c5221f; font-weight:bold;">faute</span>) et les liens logiques en gras standard (<strong style="color:#0f172a; font-weight:bold;">lien logique</strong>).
- "tableauErreurs" : Un tableau HTML complet (<table class="table-erreurs">...) listant clairement chaque erreur relevée, sa nature, et sa correction adéquate.
- "reformulations" : Doit contenir une liste HTML des propositions d'amélioration syntaxique et stylistique.
- "remarquesPedagogiques" : Conseils méthodologiques précis et bienveillants adaptés au profil.
- "texteModele" : Un texte modèle complet, exemplaire et académique rédigé en paragraphes structurés avec la classe <p class="academic-para">. Utilise les balises <span class="c-intro"> pour l'introduction, <span class="c-dev"> pour le développement (ou <span class="c-opp"> pour la nuance/antithèse), et <span class="c-concl"> pour la conclusion.

Tu dois répondre UNIQUEMENT avec un objet JSON strict au format exact suivant :
{
  "nom": "${nom}",
  "niveau": "${niveau}",
  "isHorsSujet": false,
  "messageHorsSujet": "",
  "isSujetAnalytique": false,
  "total": 7.5,
  "notes": {
    "consigne": 1.5,
    "structure": 1.5,
    "arguments": 1.5,
    "langue": 2.0,
    "lexique": 1.0
  },
  "texteTranscrit": "<p>...</p>",
  "tableauErreurs": "<table class='table-erreurs'>...</table>",
  "reformulations": "<ul>...</ul>",
  "remarquesPedagogiques": "<ul>...</ul>",
  "texteModele": "<p class=\\"academic-para\\"><span class=\\"c-intro\\">...</span></p>"
}
`;

    const response = await appelerGeminiAvecRetry(promptSysteme);

    const rawText = response.text || '';
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const resultJson = JSON.parse(cleanedText);

    return res.json(resultJson);

  } catch (error) {
    console.error("Erreur détaillée d'évaluation :", error);
    return res.status(500).json({ 
      error: "Erreur technique : " + error.message,
      stack: error.stack 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur du Centre Pro-Langues & Prépa Concours démarré sur le port ${PORT} !`);
});
