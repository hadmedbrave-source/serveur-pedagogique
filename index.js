import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CONFIGURATION SERVEUR ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Affiche l'interface au chargement du site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- MOTEUR D'ÉVALUATION ---
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es l'expert correcteur du Centre Al Akhawayn pour le baccalauréat marocain.

          DIRECTIVES DE CORRECTION :
          1. ANALYSE DU THEME : Ne déclare "HORS-SUJET" que si l'élève parle d'un sujet totalement étranger. Si les mots-clés du sujet sont présents, effectue la correction normalement.
          2. CAS HORS-SUJET : Affiche uniquement : <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div> suivi d'une explication.
          3. TRANSCRIPTION : Réécris le texte de l'élève en entourant les fautes par <span class="error-highlight">...</span> et les connecteurs logiques par <b class="connector-bold">...</b>.

          LOGIQUE DES MODÈLES (PLAN) :
          - Si le sujet demande une OPINION (ex: "Pensez-vous que...", "Partagez-vous cet avis...") : 
            Tu DOIS générer deux versions. Utilise exactement ces balises pour séparer :
            [PLAN_SIMPLE] (Suivi du texte en plan simple)
            [PLAN_DIALECTIQUE] (Suivi du texte en plan dialectique)
          
          - Si le sujet demande CAUSES / CONSÉQUENCES / SOLUTIONS :
            Génère une seule version avec cette balise :
            [PLAN_ANALYTIQUE] (Suivi du texte en plan analytique)

          IMPORTANT : Dans tous les modèles, utilise des exemples tirés de "La Boîte à Merveilles", "Antigone" ou "Le Dernier Jour d'un Condamné". Mets les titres des œuvres et les exemples précis en **GRAS**.`
        },
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
  console.log(`🚀 Serveur Centre Al Akhawayn opérationnel sur le port ${PORT}`);
});
