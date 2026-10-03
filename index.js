import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CONFIGURATION SÉCURITÉ ---
app.use(express.json());
app.use(cors()); // Autorise les connexions externes

// Sert les fichiers statiques (votre index.html)
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Route d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es l'expert du Centre Al Akhawayn. Corrige cette production écrite au Maroc. Note /10, fautes en <span class='error-highlight'>, connecteurs en <b>." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });
    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error("ERREUR :", error.message);
    res.status(500).json({ error: "L'IA est indisponible.", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
