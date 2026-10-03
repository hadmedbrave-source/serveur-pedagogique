import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// --- CONFIGURATION DES CHEMINS (ES MODULES) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- MIDDLEWARES ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname))); // Sert les fichiers statiques (images, css, js)

// --- CONFIGURATION OPENAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// --- ROUTES ---

// Route pour afficher l'interface index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route API pour le traitement IA
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Le contenu du texte est vide." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modèle performant et très économique
      messages: [
        {
          role: "system",
          content: `Tu es l'expert correcteur du Centre Al Akhawayn. Ta mission est de produire un rapport pédagogique ultra-organisé pour une production écrite (Bac Maroc).

          IMPORTANT : Tu dois utiliser EXACTEMENT les balises ci-dessous pour que l'interface puisse découper ton texte.

          STRUCTURE DE TA RÉPONSE :

          [SECTION_BILAN]
          Donne la note sur 10 (Consigne 2, Structure 2, Arguments 2, Langue 2.5, Lexique 1.5).
          Ajoute des remarques précises sur la cohérence et l'organisation.

          [SECTION_TRANSCRIPTION]
          Réécris le texte original de l'élève. 
          - Entoure chaque erreur par : <span class="error-red">erreur</span>
          - Entoure chaque lien logique par : <b class="connector-blue">connecteur</b>
          NE CORRIGE PAS LE TEXTE ICI, souligne juste les fautes.

          [SECTION_TABLEAU]
          Produis un tableau Markdown avec 3 colonnes : Erreur détectée | Nature | Correction proposée.

          [SECTION_REFORMULATION]
          Identifie les phrases syntaxiquement faibles et propose une version optimisée pour chacune.

          [SECTION_MODELES]
          Analyse le sujet :
          1. Si c'est un sujet d'OPINION : Génère deux versions séparées par les balises [PLAN_SIMPLE] et [PLAN_DIALECTIQUE].
          2. Si c'est un sujet de CAUSES/CONSEQUENCES/SOLUTIONS : Génère une seule version sous la balise [PLAN_ANALYTIQUE].

          CONSIGNES DE MISE EN PAGE DU MODÈLE :
          - Chaque partie doit être entourée par ces balises HTML :
            Introduction : <div class="plan-intro">...</div>
            Développement : <div class="plan-body">...</div>
            Conclusion : <div class="plan-concl">...</div>
          - Met les connecteurs logiques en : <b class="model-connector">...</b>
          - Utilise des exemples des œuvres (Antigone, La Boîte à Merveilles, Le Dernier Jour d'un Condamné) en **GRAS**.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3 // Température basse pour une correction rigoureuse et constante
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error("ERREUR SERVEUR OPENAI :", error.message);
    res.status(500).json({ 
      error: "L'IA est indisponible ou le solde est épuisé.", 
      details: error.message 
    });
  }
});

// --- LANCEMENT DU SERVEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  --------------------------------------------------
  🚀 SERVEUR CENTRE AL AKHAWAYN DÉMARRÉ
  📡 Port : ${PORT}
  🤖 Modèle : GPT-4o-mini
  --------------------------------------------------
  `);
});
