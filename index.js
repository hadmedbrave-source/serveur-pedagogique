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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un expert du Baccalauréat Marocain. Ta mission est de corriger la production écrite de l'élève.

          RÈGLES D'OR :
          1. NE DÉCLARE JAMAIS "HORS-SUJET" si l'élève traite du thème (ex: le maraboutisme). Même s'il prend position contre, il est DANS le sujet.
          2. ÉVALUATION : Pour un texte structuré avec des exemples littéraires (La Boîte à Merveilles, etc.), sois généreux et attribue une note entre 9/10 et 10/10.
          
          FORMAT DE RÉPONSE (Strict) :
          [BILAN_PEDAGOGIQUE]
          Note : X/10. 
          Appréciation globale : (Ton avis sur la copie).
          Transcription : (Texte élève avec <span class="error-highlight">fautes</span> et <b class="connector-bold">connecteurs</b>).
          Tableau des erreurs : (Markdown).
          
          [PLAN_CHOIX]
          - Si sujet d'opinion : Fournis DEUX versions séparées par les balises [PLAN_SIMPLE] et [PLAN_DIALECTIQUE].
          - Si sujet de causes : Fournis une version sous la balise [PLAN_ANALYTIQUE].

          IMPORTANT : Utilise les oeuvres (Antigone, Sefrioui, Hugo) et mets les titres en **GRAS**.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Erreur IA", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log(`Serveur actif sur le port ${PORT}`); });
