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

// Connexion à OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Version optimisée pour la vitesse
      messages: [
        {
          role: "system",
          content: `Tu es l'expert du Centre Al Akhawayn. Ta mission est de corriger une production écrite (Bac Maroc).
          RÈGLES DE RÉPONSE (Markdown) :
          1. HORS-SUJET : Si le texte est hors-sujet, affiche <div class="hors-sujet-alert">⚠️ HORS-SUJET - NOTE : 00/10</div>.
          2. NOTATION : Note sur 10 selon le barème (Consigne 2, Plan 2, Arguments 2, Langue 2.5, Lexique 1.5).
          3. TRANSCRIPTION : Erreurs en <span class="error-highlight">...</span> et connecteurs en <b class="connector-bold">...</b>.
          4. TABLEAU : Erreur | Nature | Correction.
          5. MODÈLE : Rédige la version parfaite (Plan Dialectique ou Analytique).`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("ERREUR :", error.message);
    res.status(500).json({ error: "L'IA est indisponible.", message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Système de Correction Centre Al Akhawayn (GPT-4o) prêt !`);
});
