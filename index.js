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
          content: `Tu es le Directeur Pédagogique du Centre Al Akhawayn. Produis une expertise académique prestigieuse.
          
          FORMAT DE RÉPONSE STRICT :
          Tu dois diviser ta réponse en 6 blocs distincts en utilisant ces marqueurs exacts :
          
          [[GRILLE]] : Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
          [[BILAN]] : Analyse de la cohérence et organisation.
          [[TRANSCRIPTION]] : Texte élève. Erreurs: <span class="err-red">...</span>. Connecteurs: <b class="link-blue">...</b>.
          [[TABLEAU]] : Erreur|Nature|Correction (Tableau Markdown).
          [[REFORMULATION]] : Liste phrases optimisées.
          [[MODELES]] : 
          Détéction Sujet : Si Opinion -> [PLAN_SIMPLE]...[PLAN_DIALECTIQUE]. Si Causes -> [PLAN_ANALYTIQUE].
          Structure Modèle :
          Intro: <div class="box-intro">...</div>
          Corps: <div class="box-body">...</div>
          Concl: <div class="box-concl">...</div>
          Connecteurs Modèle: <b class="link-gold">...</b>. 
          Oeuvres en **GRAS**.`
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
