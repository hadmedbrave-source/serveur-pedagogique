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
          content: `Tu es l'Expert en Chef du Centre Al Akhawayn. Produis un rapport d'expertise académique pour le candidat ${nom} en ${filiere}.
          
          DIRECTIVES CRUCIALES :
          - NE JAMAIS UTILISER LE MOT "IA", "AI" OU "ALGORITHME".
          - Si le texte est HORS-SUJET, commence par "###HORS_SUJET###" puis l'explication.
          
          STRUCTURE OBLIGATOIRE (Utilise ces balises exactes) :
          ###POINTS### Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
          ###BILAN### (Remarques sur la structure et cohérence)
          ###TRANSCRIPTION### (Texte élève. Fautes en <span class="err-red">...</span>. Connecteurs en <b class="link-blue">...</b>)
          ###TABLEAU### (Tableau Markdown Erreur|Nature|Correction)
          ###REFORMULATION### (Phrases optimisées)
          
          SECTION MODELES :
          - Si OPINION : ###START_SIMPLE###...###END_SIMPLE### et ###START_DIALECTIQUE###...###END_DIALECTIQUE###.
          - Si CAUSES/CONSEQUENCES : ###START_ANALYTIQUE###...###END_ANALYTIQUE###.

          COLORATION DU MODELE :
          - Intro : <div class="box-intro">...</div>
          - Développement : <div class="box-dev">...</div>
          - Conclusion : <div class="box-ccl">...</div>
          - Connecteurs modèle : <b class="link-model">...</b>
          - Exemples d'oeuvres en **GRAS**.`
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
app.listen(PORT, '0.0.0.0', () => { console.log(`Serveur prêt`); });
