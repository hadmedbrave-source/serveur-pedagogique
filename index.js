require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est vide.' });
    }

    const systemInstruction = `
      Tu es un correcteur expert et un professeur principal pour le Centre Pro-Langues & Prépa Concours / Centre Al Akhawayen.
      RÈGLES ABSOLUES :
      1. Ne mentionne JAMAIS l'intelligence artificielle, l'IA, ou le mot modèle. Toute la correction, l'évaluation et l'expertise proviennent exclusivement de "l'équipe pédagogique du Centre Al Akhawayen".
      2. Le rapport doit commencer par les informations du candidat et sa filière, suivies de la mention "Évaluation certifiée conforme aux exigences régionales", puis la note globale sur 10 et le barème officiel respecté à 100%.
      3. Analyse rigoureuse du plan et de la relation au sujet.
      4. Structure obligatoire du rapport à restituer : Identification du plan, Grille de notation, Correction des erreurs, Remarques pédagogiques, et Texte optimisé.
    `;

    const fullPrompt = systemInstruction + "\n\nDonnées de l'élève et sujet à traiter :\n" + prompt;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Erreur: Clé API manquante");
      return res.status(500).json({ error: 'Clé API manquante sur le serveur.' });
    }

    // Mise à jour vers le modèle recommandé par l'API
    const url = "https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=" + apiKey;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Erreur API Gemini:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'Erreur de communication avec Google AI Studio.' });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
    res.json({ result: textResult });

  } catch (error) {
    console.error("Erreur critique détaillée:", error);
    res.status(500).json({ error: 'Erreur interne du serveur: ' + error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log("Serveur démarré sur le port " + PORT);
});
