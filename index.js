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
    const { prompt, nom, filiere } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es le Directeur de l'Expertise au Centre Al Akhawayn. Produis un CERTIFICAT D'EXPERTISE ET DE VALIDATION DIDACTIQUE pour ${nom} (${filiere}).

          RÈGLES D'OR :
          - Ne jamais mentionner l'IA.
          - Si hors-sujet, commence par [[HORS_SUJET]].
          - Transcription : Erreurs en <span class="err-highlight">...</span>. Connecteurs logiques en <b class="conn-student">...</b>.
          - Modèle : Intro en <div class="model-intro">, Corps en <div class="model-body">, Conclusion en <div class="model-concl">.
          - Connecteurs modèle en <b class="conn-model">...</b>.

          STRUCTURE DE RÉPONSE OBLIGATOIRE :
          [[GRILLE]] : Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
          [[BILAN]] : Analyse critique structurelle.
          [[TRANSCRIPTION]] : Texte élève balisé.
          [[TABLEAU]] : Erreur|Nature|Correction.
          [[REFORMULATION]] : Liste optimisée.
          [[TYPE]] : (Répondre uniquement "OPINION" ou "ANALYTIQUE")
          [[PLAN_A]] : (Si opinion: Plan Simple / Si analytique: Plan Complet)
          [[PLAN_B]] : (Si opinion: Plan Dialectique / Si analytique: laisser vide)`
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
app.listen(PORT, '0.0.0.0');
