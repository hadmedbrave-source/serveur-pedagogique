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
          content: `Tu es l'Expert en Chef du Centre Al Akhawayn. Produis un Procès-Verbal d'expertise académique pour ${nom} (${filiere}).
          
          INTERDICTIONS : Ne jamais mentionner "IA", "AI" ou "Assistant".
          
          STRUCTURE DU RAPPORT (Respecte strictement les balises [[...]]) :
          [[POINTS]] Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
          [[BILAN]] (Ton analyse sur la structure)
          [[TRANSCRIPTION]] (Texte élève. Fautes : <span class="err-red">...</span>. Connecteurs : <b class="connector-trans">...</b>)
          [[TABLEAU]] (Tableau Erreur|Nature|Correction)
          [[REFORMULATION]] (Phrases faibles vs optimisées)
          
          [[MOD_TYPE]] (Inscrit ici "OPINION" ou "ANALYTIQUE")

          SI OPINION : 
          [[MOD_SIMPLE]] ... [[END_SIMPLE]]
          [[MOD_DIALECTIQUE]] ... [[END_DIALECTIQUE]]

          SI ANALYTIQUE :
          [[MOD_ANALYTIQUE]] ... [[END_ANALYTIQUE]]

          RÈGLES DU MODÈLE :
          - Intro : <div class="box-intro">...</div>
          - Développement : <div class="box-body">...</div>
          - Conclusion : <div class="box-concl">...</div>
          - Connecteurs : <b class="connector-model">...</b>
          - Œuvres en **GRAS**.`
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
