import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Configuration pour le mode "ES Modules" (nécessaire pour Railway)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- CONFIGURATION DU SERVEUR ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Connexion à OpenAI avec la clé enregistrée sur Railway
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Affiche la page d'accueil (votre fichier index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LOGIQUE DE CORRECTION PÉDAGOGIQUE ---
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Aucun texte n'a été reçu." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modèle rapide, stable et économique
      messages: [
        {
          role: "system",
          content: `Tu es l'expert correcteur du Centre Al Akhawayn pour le Baccalauréat Marocain. 
          
          MISSION : Analyser la production écrite avec bienveillance et rigueur.

          DIRECTIVES DE JUGEMENT :
          1. ANALYSE DU THÈME : Ne déclare JAMAIS "HORS-SUJET" si l'élève traite du thème (ex: maraboutisme, solitude, famille). Même si l'élève est contre l'idée du sujet ou propose une alternative comme "la raison", il est PARFAITEMENT dans le sujet.
          2. ÉVALUATION : Pour un texte structuré (Intro, Développement, Conclusion) utilisant des connecteurs et des exemples d'œuvres (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné), attribue une note entre 8.5/10 et 10/10.

          STRUCTURE DU RAPPORT (Respecte scrupuleusement ces balises pour l'affichage) :
          [BILAN_PEDAGOGIQUE]
          ### 📊 Bilan de l'évaluation
          **Note : X/10**
          **Appréciation :** (Ton commentaire expert).

          **Transcription annotée :**
          (Réécris le texte de l'élève. Entoure les fautes par <span class="error-highlight">...</span> et les connecteurs par <b class="connector-bold">...</b>).

          **Tableau des corrections :**
          | Erreur | Nature | Correction |

          [PLAN_CHOIX]
          - Si le sujet demande une OPINION : Génère DEUX versions séparées par :
          [PLAN_SIMPLE]
          (Version complète en plan simple)
          [PLAN_DIALECTIQUE]
          (Version complète en plan dialectique)

          - Si le sujet demande CAUSES/CONSÉQUENCES : Génère une version sous la balise :
          [PLAN_ANALYTIQUE]
          (Version complète en plan analytique)

          IMPORTANT : Dans tous les modèles, mets les titres d'œuvres et les exemples littéraires en **GRAS**.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3 // Pour une correction stable et sérieuse
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("ERREUR IA :", error.message);
    res.status(500).json({ 
      error: "Le serveur OpenAI ne répond pas.", 
      details: error.message 
    });
  }
});

// Port dynamique pour Railway (0.0.0.0 est obligatoire)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Centre Al Akhawayn opérationnel sur le port ${PORT}`);
});
