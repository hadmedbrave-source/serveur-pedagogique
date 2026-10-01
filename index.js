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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Erreur: Clé API manquante");
      return res.status(500).json({ error: 'Clé API manquante sur le serveur.' });
    }

    // URL stable avec gemini-1.5-flash
    const url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
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
