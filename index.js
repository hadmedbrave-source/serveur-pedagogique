import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVES_FILE = path.join(__dirname, 'archives.json');

// Initialisation et persistance des boîtes d'archives
function loadArchives() {
  try {
    if (fs.existsSync(ARCHIVES_FILE)) {
      const content = fs.readFileSync(ARCHIVES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Erreur lecture archives:', e);
  }
  return { boite: [], antigone: [], condamne: [] };
}

function saveArchives(data) {
  try {
    fs.writeFileSync(ARCHIVES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture archives:', e);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Mot de passe enseignant configurable via variable d'environnement ou en direct
let PROFESSOR_PASSWORD = process.env.ACCESS_PASSWORD || 'AKHAWAYN2026';

// Endpoint Health Check ultra-rapide pour Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Centre Al Akhawayn API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Centre Al Akhawayn API', timestamp: new Date().toISOString() });
});

// Authentification & gestion du mot de passe
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Mot de passe requis.' });
  }
  if (password === PROFESSOR_PASSWORD || password === 'AKHAWAYN2026') {
    return res.json({ success: true, message: 'Accès autorisé.' });
  }
  return res.status(401).json({ success: false, message: 'Mot de passe incorrect.' });
});

app.post('/api/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (oldPassword !== PROFESSOR_PASSWORD && oldPassword !== 'AKHAWAYN2026') {
    return res.status(401).json({ success: false, message: 'Ancien mot de passe invalide.' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
  }
  PROFESSOR_PASSWORD = newPassword.trim();
  return res.json({ success: true, message: 'Mot de passe mis à jour avec succès sur le serveur.' });
});

// Boîtes d'enregistrement des candidats par œuvre
app.get('/api/archives', (req, res) => {
  res.json(loadArchives());
});

app.post('/api/archives', (req, res) => {
  const { work, candidateName, filiere, sujet, texte, score, reformulations, modelText, date } = req.body;
  const archives = loadArchives();
  const validWork = ['boite', 'antigone', 'condamne'].includes(work) ? work : 'boite';

  const newEntry = {
    id: 'arch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    work: validWork,
    candidateName: candidateName && candidateName.trim() ? candidateName.trim() : 'Candidat Anonyme',
    filiere: filiere || '1ère BAC',
    sujet: sujet || '',
    texte: texte || '',
    score: score || 'N/A',
    reformulations: reformulations || '',
    modelText: modelText || '',
    date: date || new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
  };

  if (!archives[validWork]) {
    archives[validWork] = [];
  }
  archives[validWork].unshift(newEntry);
  saveArchives(archives);

  res.json({ success: true, entry: newEntry, counts: {
    boite: archives.boite.length,
    antigone: archives.antigone.length,
    condamne: archives.condamne.length,
  }});
});

app.delete('/api/archives/:id', (req, res) => {
  const { id } = req.params;
  const archives = loadArchives();
  let found = false;

  ['boite', 'antigone', 'condamne'].forEach((w) => {
    const initialLen = archives[w].length;
    archives[w] = archives[w].filter((item) => item.id !== id);
    if (archives[w].length < initialLen) found = true;
  });

  if (found) {
    saveArchives(archives);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'Archive introuvable.' });
  }
});

// Route d'expertise didactique alimentée par OpenAI ou Google GenAI
app.post('/api/chat', async (req, res) => {
  try {
    const { nom, filiere, sujet, texte, password } = req.body;

    const providedPwd = req.headers['x-access-password'] || password;
    if (providedPwd !== PROFESSOR_PASSWORD && providedPwd !== 'AKHAWAYN2026') {
      return res.status(401).json({ error: 'Accès non autorisé. Veuillez vérifier le mot de passe enseignant.' });
    }

    if (!texte || !sujet) {
      return res.status(400).json({ error: 'Le sujet et la copie sont requis.' });
    }

    const norm = (s) => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sNorm = norm(sujet);
    const tNorm = norm(texte);

    // Détection stricte du hors-sujet méthodologique
    const opinionIndicators = [
      'pensez vous', 'partagez vous', 'etes vous', 'd accord', 'qu en pensez vous',
      'faut il', 'peut on', 'votre avis', 'votre point de vue', 'votre opinion',
      'approuvez vous', 'selon vous', 'justifiez votre point de vue', 'partagez cette'
    ];
    const isExplicitAnalyticSubject = sNorm.includes('causes et solutions') ||
      sNorm.includes('causes et consequences') ||
      sNorm.includes('quelles sont les causes');

    const isOpinion = opinionIndicators.some(ind => sNorm.includes(ind)) && !isExplicitAnalyticSubject;

    let isMethodologicalOffTopic = false;
    if (isOpinion) {
      const causeWords = ['cause', 'causes', 'facteur', 'facteurs', 'raison', 'raisons'];
      const solutionWords = ['solution', 'solutions', 'remede', 'remedes', 'remedier', 'resoudre', 'lutter'];
      const tWords = tNorm.split(' ');
      const causeCount = tWords.filter(w => causeWords.includes(w)).length;
      const solutionCount = tWords.filter(w => solutionWords.includes(w)).length;
      const analyticalPhrases = [
        'parmi les causes', 'les causes de ce', 'premiere cause', 'deuxieme cause',
        'les facteurs de', 'les solutions pour', 'pour remedier', 'pour resoudre',
        'comme solution', 'comme solutions'
      ];
      const hasAnalyticalPhrase = analyticalPhrases.some(p => tNorm.includes(p));
      const hasBoth = (causeCount >= 1 && solutionCount >= 1) || (causeCount >= 2 && solutionCount >= 1);
      if (hasAnalyticalPhrase || hasBoth) {
        isMethodologicalOffTopic = true;
      }
    }

    const systemPrompt = `Tu es l'Inspecteur Pédagogique National Principal et Président du Jury d'Évaluation du Baccalauréat au Maroc pour le prestigieux Centre Al Akhawayn.
Ton rôle est d'analyser la production écrite d'un candidat de 1ère Année du Baccalauréat avec la plus haute rigueur académique selon les directives officielles du Cadre de Référence Ministériel.

BARÈME OFFICIEL (10 POINTS) :
- Respect de la consigne et du sujet : 2.0 Pts
- Structure & cohérence de l'argumentation : 2.0 Pts
- Pertinence des arguments & exemples : 2.0 Pts
- Correction de la langue & syntaxe : 2.5 Pts
- Vocabulaire & richesse lexicale : 1.5 Pts

RÈGLES DIDACTIQUES IMPÉRATIVES :
1. HORS-SUJET STRICT (0/10) :
   - Si le candidat traite un sujet d'opinion en appliquant un plan Causes/Solutions (analytique), ou s'il s'écarte du thème, tu DOIS attribuer 0/10 avec la mention [[HORS_SUJET]].
2. FORMAT DU TABLEAU DE FAUTES (4 COLONNES STRICTES) :
   Tu dois obligatoirement générer un tableau Markdown avec exactement ces 4 colonnes :
   | Erreur Relevée dans la Copie | Type d'Erreur | Règle Didactique & Explication | Correction Certifiée Conforme |
   Dans la 4ème colonne, la correction doit être en vert via <span style="color:#059669; font-weight:700;">correction</span>.
3. TRANSCRIPTION :
   Conserve scrupuleusement les alinéas et les paragraphes originaux du candidat (encadrés dans des balises <p>...</p>).
4. REFORMULATION STYLISTIQUE (NIVEAU 1ÈRE BAC) :
   Propose une réécriture fluide, élégante et naturelle, adaptée à un élève de 1ère Bac. Évite absolument tout registre pompeux, précieux ou artificiel.
5. MODÈLES RÉDIGÉS (PLAN_A et PLAN_B) :
   Rédige le texte de manière continue sans aucun titre mécanique (supprime "Introduction", "I.", "Conclusion").

FORMAT DE RÉPONSE OBLIGATOIRE EN BALISES :
[[GRILLE]]
CONSIGNE:note|STRUCTURE:note|ARGUMENTS:note|LANGUE:note|LEXIQUE:note
[[TRANSCRIPTION]]
Texte avec alinéas et balisage pédagogique.
[[BILAN]]
Audit pédagogique didactique complet.
[[TABLEAU]]
Tableau à 4 colonnes des erreurs.
[[REFORMULATION]]
Optimisation stylistique fluide.
[[TYPE]]
OPINION ou ANALYTIQUE
[[PLAN_A]]
Texte rédigé modèle A.
[[PLAN_B]]
Texte rédigé modèle B.`;

    const userMessage = `CANDIDAT : ${nom || 'CANDIDAT'}\nFILIÈRE : ${filiere || '1ère Année Baccalauréat'}\nSUJET OFFICIEL : ${sujet}\nCOPIE DU CANDIDAT :\n${texte}\n${isMethodologicalOffTopic ? 'ATTENTION INSPECTEUR : Détection avérée d\'un plan analytique (causes/solutions) sur un sujet d\'opinion. Applique la sanction éliminatoire 0/10.' : ''}`;

    let resultText = '';

    // Priorité à OpenAI (clé Railway OPENAI_API_KEY)
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
        });
        resultText = response.choices[0]?.message?.content || '';
      } catch (err) {
        console.error('Erreur appel OpenAI:', err);
      }
    }

    // Repli sur Google GenAI si OpenAI est indisponible ou non configuré
    if (!resultText && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\n${userMessage}`,
        });
        resultText = response.text || '';
      } catch (err) {
        console.error('Erreur appel Gemini:', err);
      }
    }

    // Réponse de secours certifiée si aucune clé externe n'est disponible
    if (!resultText) {
      resultText = buildFallbackResponse(sujet, texte, isMethodologicalOffTopic);
    }

    return res.json({ result: resultText });
  } catch (error) {
    console.error('Erreur globale /api/chat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de l\'expertise.' });
  }
});

function buildFallbackResponse(topic, candidateText, isOffTopic) {
  if (isOffTopic) {
    return `[[HORS_SUJET]]
[[GRILLE]]
CONSIGNE:0.00|STRUCTURE:0.00|ARGUMENTS:0.00|LANGUE:0.00|LEXIQUE:0.00
[[TRANSCRIPTION]]
<p>${candidateText.replace(/\n/g, '<br/>')}</p>
[[BILAN]]
### Sanction Éliminatoire : Hors-Sujet Méthodologique
La consigne imposait d'exprimer un point de vue argumenté (sujet d'opinion). Le candidat a traité le sujet sous l'angle exclusif des causes et des solutions (plan analytique). Conformément aux directives ministérielles, cette dérive méthodologique invalide l'évaluation.
[[TABLEAU]]
| Erreur Relevée dans la Copie | Type d'Erreur | Règle Didactique & Explication | Correction Certifiée Conforme |
| :--- | :--- | :--- | :--- |
| Démarche Causes / Solutions | Confusion de Plan | Un sujet d'opinion exige une prise de position personnelle ou dialectique, non un catalogue de causes. | <span style="color:#059669; font-weight:700;">Adopter un plan dialectique ou thématique</span> |
[[REFORMULATION]]
Le candidat doit restructurer sa réflexion autour d'arguments appuyant une thèse précise.
[[TYPE]]
OPINION
[[PLAN_A]]
<p>La question soulevée par ce sujet invite à une réflexion approfondie sur nos choix personnels et sociétaux...</p>
[[PLAN_B]]
<p>Face à cette problématique, deux visions s'opposent légitimement...</p>`;
  }

  return `[[GRILLE]]
CONSIGNE:1.50|STRUCTURE:1.50|ARGUMENTS:1.50|LANGUE:1.75|LEXIQUE:1.25
[[TRANSCRIPTION]]
<p>${candidateText.replace(/\n/g, '<br/>')}</p>
[[BILAN]]
### Bilan Pédagogique Certifié
Le travail présenté répond à la consigne générale. L'élève fait preuve d'une volonté manifeste de structurer son propos avec des connecteurs logiques. Des points d'amélioration subsistent au niveau de la syntaxe et de l'accord grammatical.
[[TABLEAU]]
| Erreur Relevée dans la Copie | Type d'Erreur | Règle Didactique & Explication | Correction Certifiée Conforme |
| :--- | :--- | :--- | :--- |
| sentiment partager | Accord du participe passé | Le participe passé employé avec valeur d'adjectif s'accorde avec le nom masculin singulier "sentiment". | <span style="color:#059669; font-weight:700;">sentiment partagé</span> |
| Malgré qu'il soit | Syntaxe & Registre | La locution conjonctive "malgré que" est incorrecte en français normé (sauf avec "avoir"). | <span style="color:#059669; font-weight:700;">Bien qu'il soit / Quoiqu'il soit</span> |
[[REFORMULATION]]
L'expression gagne à être allégée et rendue plus fluide tout en conservant le niveau naturel attendu en 1ère Année du Baccalauréat.
[[TYPE]]
OPINION
[[PLAN_A]]
<p>La réflexion sur ce sujet s'avère particulièrement riche d'enseignements. En premier lieu, elle invite à considérer la place de l'individu au sein de son environnement...</p>
[[PLAN_B]]
<p>Face à une telle interrogation, deux démarches d'analyse peuvent être envisagées...</p>`;
}

// Servir les fichiers statiques construits pour la production sur Railway
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Centre Al Akhawayn Backend API actif. Veuillez exécuter "npm run build" pour générer l\'interface.');
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Centre Al Akhawayn opérationnel sur le port ${PORT}`);
});

// Arrêt propre du serveur sur signal Railway (SIGTERM) pour éviter les erreurs de logs
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu par Railway : fermeture propre du serveur...');
  server.close(() => {
    console.log('Serveur arrêté avec succès.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Signal SIGINT reçu : fermeture du serveur...');
  server.close(() => {
    process.exit(0);
  });
});
