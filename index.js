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

// Affiche la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LOGIQUE DE CORRECTION IA ---
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es l'expert correcteur du Centre Al Akhawayn pour le Baccalauréat Marocain.
          
          MISSION : Analyser la production écrite de l'élève avec une rigueur pédagogique.

          1. ANALYSE DU SUJET : 
             - Si le texte de l'élève est totalement hors-sujet, affiche : <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div> suivi d'une explication brève.
             - Si le texte traite du thème (même de façon courte), effectue la correction normalement.

          2. NOTATION (Barème 10 pts) : 
             - Consigne & Organisation (2 pts)
             - Structure argumentative (2 pts)
             - Force des arguments & exemples (2 pts)
             - Correction de la langue (2.5 pts)
             - Richesse du lexique (1.5 pts)

          3. TRANSCRIPTION ANNOTÉE : 
             - Réécris le texte de l'élève.
             - Entoure les erreurs par <span class="error-highlight">...</span>.
             - Entoure les connecteurs logiques par <b class="connector-bold">...</b>.

          4. GÉNÉRATION DU MODÈLE OPTIMISÉ (CRUCIAL) :
             - Si le sujet demande une OPINION : Tu DOIS obligatoirement fournir deux versions en utilisant exactement ces balises :
               [PLAN_SIMPLE] 
               (Texte du modèle en plan simple)
               [PLAN_DIALECTIQUE] 
               (Texte du modèle en plan dialectique)
             
             - Si le sujet demande CAUSES / CONSÉQUENCES : Utilise cette balise :
               [PLAN_ANALYTIQUE]
               (Texte du modèle en plan analytique)

          IMPORTANT : Dans tous tes modèles, utilise des exemples précis des œuvres : "La Boîte à Merveilles", "Antigone" ou "Le Dernier Jour d'un Condamné". Mets les titres et les exemples en **GRAS**.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("ERREUR IA :", error.message);
    res.status(500).json({ error: "L'IA est indisponible.", details: error.message });
  }
});

// Port dynamique pour Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Centre Al Akhawayn opérationnel sur le port ${PORT}`);
});
