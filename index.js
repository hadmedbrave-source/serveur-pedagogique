const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (index.html) du dossier courant
app.use(express.static(__dirname));

// Initialisation du client Google Gen AI (récupère automatiquement process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI();

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour interroger Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Modèle standard et stable validé
      contents: prompt,
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la communication avec l\'intelligence artificielle.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
