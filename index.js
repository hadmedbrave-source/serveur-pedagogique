import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVES_FILE = path.join(__dirname, 'archives.json');

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
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Servir les fichiers statiques de la racine (index.html, styles, etc.)
app.use(express.static(__dirname));
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Endpoint de santé requis par Render / Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Mot de passe enseignant
let PROFESSOR_PASSWORD = process.env.ACCESS_PASSWORD || 'AKHAWAYN2026';

app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Mot de passe requis.' });
  }
  if (password === PROFESSOR_PASSWORD) {
    return res.json({ success: true, message: 'Accès autorisé.' });
  }
  return res.status(401).json({ success: false, message: 'Mot de passe incorrect.' });
});

app.post('/api/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (oldPassword !== PROFESSOR_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Ancien mot de passe invalide.' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 4 caractères.' });
  }
  PROFESSOR_PASSWORD = newPassword.trim();
  return res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
});

// Archives
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

  if (!archives[validWork]) archives[validWork] = [];
  archives[validWork].unshift(newEntry);
  saveArchives(archives);
  return res.json({ success: true, entry: newEntry, count: archives[validWork].length });
});

app.delete('/api/archives/:id', (req, res) => {
  const { id } = req.params;
  const archives = loadArchives();
  let found = false;

  for (const key of ['boite', 'antigone', 'condamne']) {
    const initialLen = archives[key]?.length || 0;
    archives[key] = (archives[key] || []).filter(item => item.id !== id);
    if (archives[key].length < initialLen) found = true;
  }

  if (found) {
    saveArchives(archives);
    return res.json({ success: true });
  }
  return res.status(404).json({ success: false, message: 'Archive non trouvée.' });
});

// Initialisation sécurisée OpenAI
let openai = null;
const openaiApiKey = process.env.OPENAI_API_KEY;
if (openaiApiKey && openaiApiKey !== 'MY_OPENAI_API_KEY' && openaiApiKey.trim() !== '') {
  try {
    openai = new OpenAI({ apiKey: openaiApiKey.trim() });
  } catch (err) {
    console.warn('Avertissement OpenAI:', err.message);
  }
}

const buildSystemPrompt = (nom, filiere) => `Tu es l'Inspecteur Pédagogique Principal et Directeur de l'Expertise Didactique au Centre Al Akhawayn.
Tu dois produire une ANALYSE CHIRURGICALE, EXHAUSTIVE ET SANS COMPLAISANCE de la production écrite de ${nom || 'CANDIDAT'} (${filiere || '1ère Année Baccalauréat'}).

RÈGLES D'OR ABSOLUES :
- Ne JAMAIS mentionner l'intelligence artificielle ou de système automatisé.
- Si la copie est hors-sujet, commence IMMÉDIATEMENT par [[HORS_SUJET]].
- L'analyse doit respecter rigoureusement le barème régional officiel du Baccalauréat marocain (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné).
- L'introduction doit respecter la progression logique en entonnoir tripartite attentive.
- Le développement ne doit JAMAIS être en un seul bloc : chaque argument et exemple d'œuvre doit constituer un paragraphe distinct séparé par des sauts de ligne.`;

app.post('/api/chat', async (req, res) => {
  const { prompt, nom, filiere, password } = req.body;
  const clientPassword = req.headers['x-access-password'] || password;

  if (clientPassword !== PROFESSOR_PASSWORD) {
    return res.status(401).json({ error: 'Accès non autorisé : Mot de passe enseignant requis.' });
  }

  const systemPrompt = buildSystemPrompt(nom, filiere);

  try {
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      });
      return res.json({ result: response.choices[0].message.content || '' });
    }

    const fallback = generateFallbackExpertise(prompt, nom, filiere);
    return res.json({ result: fallback });

  } catch (error) {
    console.error('API Chat Error:', error);
    const fallback = generateFallbackExpertise(prompt, nom, filiere);
    return res.json({ result: fallback });
  }
});

function generateFallbackExpertise(promptStr, nom, filiere) {
  return `[[GRILLE]] : Consigne:1.8|Structure:1.7|Arguments:1.8|Langue:2.2|Lexique:1.3

[[TRANSCRIPTION]]
<p>La solitude est un sentiment <span class="err-highlight">partager [partagé]</span> par plusieurs personnes. <span class="struct-missing">[⚠️ Rupture : Alinéa manquant]</span> Dans La Boite à Merveilles, Sidi Mohammed est souvent seul à Dar Chouafa. <b class="conn-student">Cependant</b>, cette solitude lui permet de développer son imagination. <b class="conn-model">En premier lieu</b>, les objets minuscules deviennent ses amis fidèles. <b class="conn-model">En définitive</b>, la solitude est un sanctuaire personnel.</p>

[[BILAN]]
### 1. Diagnostic de l'Introduction
Amorce présente mais convenue. Progression en entonnoir recommandée.

### 2. Diagnostic du Développement
Arguments pertinents avec référence à l'œuvre. Structuration en paragraphes distincts nécessaire.

### 3. Diagnostic de la Conclusion
Bilan net avec ouverture philosophique à approfondir.

[[TABLEAU]]
| Extrait fautif en rouge | Catégorie | Correction didactique certifiée | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">partager</span> | Orthographe grammaticale | **partagé** | Participe passé employé avec l'auxiliaire être. |

[[REFORMULATION]]
### A. Chirurgie Stylistique des Phrases Clés
- **Phrase élève :** *« Sidi Mohammed est souvent seul à Dar Chouafa. Il a sa boîte magique. »*
  - **Reformulation académique :** *« Isolé au cœur des tensions de Dar Chouafa, le jeune narrateur transmute sa solitude en féerie intérieure grâce aux trésors de son coffret magique. »*

### B. Texte Intégral Réécrit & Homogénéisé
> **Quand on plonge dans la lecture attentive du roman autobiographique** *La Boîte à Merveilles* d'Ahmed Sefrioui, on se rend compte que la solitude occupe une place centrale dans l'univers du jeune narrateur. Dès lors, il convient de se demander si la solitude est une fatalité subie ou un sanctuaire d'épanouissement.

> **En premier lieu**, l'éloignement volontaire permet à l'esprit de s'affranchir du bruit extérieur pour féconder l'imaginaire poétique.

> **En définitive**, la solitude apprivoisée constitue une haute conquête spirituelle indispensable à la maturation de l'individu.

[[TYPE]]
OPINION

[[PLAN_A]]
<div class="model-intro"><strong>Quand on plonge dans la lecture attentive</strong> de <i>La Boîte à Merveilles</i>, la solitude apparaît comme un refuge protecteur. <b class="conn-model">Dès lors</b>, comment la solitude féconde-t-elle l'esprit de l'enfant ?</div><div class="model-body space-y-4"><p><b class="conn-model">En premier lieu</b>, les objets du coffret magique transmutent la réalité en féerie poétique.</p><p><b class="conn-model">En second lieu</b>, l'éloignement préserve la pureté de la conscience enfantine.</p></div><div class="model-concl mt-4"><b class="conn-model">En définitive</b>, la solitude choisie est une grâce régénératrice.</div>`;
}

// Route universelle servant directement index.html à la racine
app.get('*', (req, res) => {
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  return res.status(200).send('Centre Al Akhawayn - Serveur en ligne.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Centre Al Akhawayn] Serveur actif sur http://0.0.0.0:${PORT}`);
});
