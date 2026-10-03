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
          
          STRUCTURE OBLIGATOIRE (Utilise exactement ces balises) :
          [GRILLE_POINTS] : Format: Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
          [BILAN_CRITIQUE] : Analyse détaillée de la cohérence et de l'organisation.
          [TEXTE_ANNOTÉ] : Texte élève. Fautes en <span class="err">faute</span>. Connecteurs logiques en <b class="connector-trans">connecteur</b>.
          [TABLEAU_ERREURS] : Tableau Erreur|Nature|Correction.
          [PHRASES_OPTIMISÉES] : Reformulations phrases faibles.
          [MODELE_SECTION] : 
          SI OPINION : Génère [PLAN_SIMPLE] ET [PLAN_DIALECTIQUE].
          SI CAUSES/CONSEQUENCES : Génère [PLAN_ANALYTIQUE].

          COLORATION DU MODÈLE :
          - Intro : <div class="box-intro">...</div>
          - Développement : <div class="box-dev">...</div>
          - Conclusion : <div class="box-ccl">...</div>
          - Connecteurs du modèle : <b class="connector-model">...</b>
          - Œuvres (Antigone, Boîte à Merveilles, Condamné) en **GRAS**.`
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
app.listen(PORT, '0.0.0.0', () => { console.log(`Serveur prêt sur port ${PORT}`); });
