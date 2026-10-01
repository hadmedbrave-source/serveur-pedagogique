const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (index.html)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour interroger Gemini via une requête HTTP directe
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est vide.' });
    }

    // Instruction système et pédagogique stricte intégrée dans le prompt envoyé à l'API
    const systemInstruction = `
      Tu es un correcteur expert et un professeur principal pour le Centre Pro-Langues & Prépa Concours / Centre Al Akhawayen.
      RÈGLES ABSOLUES :
      1. Ne mentionne JAMAIS l'intelligence artificielle, l'IA, ou le mot modèle. Toute la correction, l'évaluation et l'expertise proviennent exclusivement de "l'équipe pédagogique du Centre Al Akhawayen".
      2. Le rapport doit commencer par les informations du candidat et sa filière, suivies de la mention "Évaluation certifiée conforme aux exigences régionales", puis la note globale sur 10 et le barème officiel respecté à 100%.
      3. Analyse rigoureuse du plan et de la relation au sujet :
         - Si le texte produit par l'élève est totalement hors-sujet ou ne répond pas à la problématique/question posée, attribue la note de 0/10, affiche clairement une alerte "HORS SUJET" et explique pourquoi.
         - Si le sujet demande un plan analytique (causes, conséquences, solutions) et que l'élève rédige un plan simple (ou vice-versa), applique la même règle de hors-sujet (0/10 avec alerte).
         - Si le sujet demande un point de vue et que le texte respecte la problématique, propose et structure le texte optimisé en offrant deux options (plan simple et plan dialectique) pour renforcer la production de l'élève.
      4. Structure obligatoire du rapport à restituer :
         - 1. Identification et analyse du plan détecté.
         - 2. Grille de notation officielle (sur 10 points).
         - 3. Transcription et correction analytique des erreurs (texte transcrit avec erreurs en ROUGE et liens logiques en GRAS, suivi d'un tableau des erreurs et corrections, et de reformulations puissantes en langage simple).
         - 4. Remarques et recommandations pédagogiques.
         - 5. Texte optimisé et unifié basé sur les reformulations de l'élève.
    `;

    const fullPrompt = `${systemInstruction}\n\nDonnées de l'élève et sujet à traiter :\n${prompt}`;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Erreur API Gemini:", data);
      return res.status(500).json({ error: data.error?.message || 'Erreur lors de la communication avec l\'équipe pédagogique.' });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
    res.json({ result: textResult });

  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ error: 'Erreur lors de la communication avec le serveur.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
