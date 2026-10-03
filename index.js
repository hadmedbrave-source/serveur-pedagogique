import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CONFIGURATION DU SERVEUR ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Affiche la page d'accueil (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- MOTEUR D'INTELLIGENCE PÉDAGOGIQUE ---
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es l'expert correcteur du Centre Al Akhawayn pour le Baccalauréat Marocain.
          
          DIRECTIVES DE CORRECTION (TRÈS IMPORTANTES) :
          1. TOLÉRANCE HORS-SUJET : Ne déclare "HORS-SUJET" que si le texte n'a AUCUN rapport avec le thème. 
             *NOTE* : Si l'élève s'oppose à l'idée du sujet (ex: critique le maraboutisme au nom de la raison), il est PARFAITEMENT dans le sujet. C'est une argumentation par opposition.
          
          2. NOTATION : Sois juste et valorisant. Pour un texte bien structuré utilisant des exemples des œuvres au programme (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné), la note doit être entre 9/10 et 10/10.

          3. STRUCTURE DU RAPPORT (Respecte ce format Markdown) :
             [BILAN_PEDAGOGIQUE]
             Note : X/10
             Appréciation : (Ton avis expert sur la qualité de la rédaction).
             
             Transcription annotée :
             (Réécris le texte de l'élève en entourant les fautes par <span class="error-highlight">...</span> et les connecteurs logiques par <b class="connector-bold">...</b>).

             Tableau des corrections : (Erreur | Nature | Correction).

             [MODÈLE_OPTIMISÉ]
             - Si le sujet demande une OPINION : Fournis DEUX versions séparées par :
               [PLAN_SIMPLE] (Texte complet)
               [PLAN_DIALECTIQUE] (Texte complet)
             
             - Si le sujet demande CAUSES/CONSÉQUENCES : Fournis une version séparée par :
               [PLAN_ANALYTIQUE] (Texte complet)

          IMPORTANT : Dans les modèles, mets les titres d'œuvres et les exemples précis en **GRAS**.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("ERREUR SERVEUR :", error.message);
    res.status(500).json({ error: "L'IA est indisponible.", details: error.message });
  }
});

// Port dynamique pour Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Centre Al Akhawayn opérationnel sur le port ${PORT}`);
});
