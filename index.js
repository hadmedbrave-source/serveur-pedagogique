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

// Route pour interroger Gemini via une requête HTTP directe (compatible avec toutes les clés)
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Le prompt est vide.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Erreur API Gemini:", data);
      return res.status(500).json({ error: data.error?.message || 'Erreur lors de la communication avec l\'intelligence artificielle.' });
    }

    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
    res.json({ result: textResult });

  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ error: 'Erreur lors de la communication avec le serveur.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
