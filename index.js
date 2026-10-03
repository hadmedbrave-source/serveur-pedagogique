import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Votre clé sk-... sur Railway
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Le modèle le plus puissant
      messages: [
        {
          role: "system",
          content: `Tu es l'expert du Centre Al Akhawayn. Ta mission est de corriger une production écrite (Bac Maroc).
          1. Si hors-sujet : affiche <div class="hors-sujet-alert">⚠️ HORS-SUJET - NOTE : 00/10</div>.
          2. Sinon, note sur 10.
          3. Transcription : Erreurs en <span class="error-highlight">...</span> et connecteurs en <b class="connector-bold">...</b>.
          4. Tableau : Erreur | Nature | Correction.
          5. Modèle d'excellence : Plan Dialectique ou Analytique selon le sujet.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("Erreur OpenAI :", error.message);
    res.status(500).json({ error: "L'IA GPT-4 est indisponible.", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur GPT-4 prêt sur le port ${PORT}`);
});
