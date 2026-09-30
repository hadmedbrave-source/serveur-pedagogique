const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialisation du client Google Gen AI (il récupère automatiquement process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI();

app.get('/', (req, res) => {
  res.send('Serveur pédagogique - Centre Pro-Langues & Prépa Concours est en ligne !');
});

// Exemple de route pour interroger Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
