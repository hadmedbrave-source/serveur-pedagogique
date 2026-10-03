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
          content: `Tu es l'expert correcteur du Centre Al Akhawayn. Ta correction doit être puissante, organisée et visuelle.

          STRUCTURE DE TA RÉPONSE (Respecte strictement les balises [SECTION]) :

          [SECTION_BILAN]
          - Note : X/10 (Barème : Consigne 2, Structure 2, Arguments 2, Langue 2.5, Lexique 1.5).
          - Remarques sur la cohérence, l'organisation et la structure.

          [SECTION_TRANSCRIPTION]
          Réécris le texte de l'élève. 
          - Erreurs en rouge : <span class="error-red">faute</span>
          - Liens logiques en bleu gras : <b class="connector-blue">connecteur</b>

          [SECTION_TABLEAU]
          Tableau Markdown : Erreur | Nature | Correction.

          [SECTION_REFORMULATION]
          Liste des phrases faibles et leur version optimisée.

          [SECTION_MODELES]
          DÉTECTION DU TYPE DE SUJET :
          1. Si OPINION : Génère deux versions séparées par les balises [PLAN_SIMPLE] et [PLAN_DIALECTIQUE].
          2. Si CAUSES/CONSEQUENCES : Génère une version sous la balise [PLAN_ANALYTIQUE].

          RÈGLES DE COLORATION DES PLANS :
          - Introduction : <div class="plan-intro">...</div>
          - Développement : <div class="plan-body">...</div>
          - Conclusion : <div class="plan-concl">...</div>
          - Connecteurs logiques dans le modèle : <b class="model-connector">...</b>
          - Exemples des œuvres (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné) en **GRAS**. Si pas d'œuvre, exemples du quotidien.`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });
    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log(`Serveur actif`); });
