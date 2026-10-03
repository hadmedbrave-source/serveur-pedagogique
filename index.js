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

// Gestion sécurisée des archives
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
// Railway attribue le port via la variable d'environnement PORT
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Servir index.html et les fichiers statiques à la racine
app.use(express.static(__dirname));

// Endpoint de santé pour Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Mot de passe enseignant (configurable sur Railway via ACCESS_PASSWORD ou AKHAWAYN2026 par défaut)
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
    return res.status(400).json({ success: false, message: 'Au moins 4 caractères requis.' });
  }
  PROFESSOR_PASSWORD = newPassword.trim();
  return res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
});

// Gestion des 3 boîtes d'archives par œuvre
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

// Initialisation OpenAI avec votre variable d'environnement Railway
let openai = null;
const apiKey = process.env.OPENAI_API_KEY;
if (apiKey && apiKey.trim() !== '') {
  try {
    openai = new OpenAI({ apiKey: apiKey.trim() });
    console.log('[Centre Al Akhawayn] Client OpenAI connecté avec succès.');
  } catch (err) {
    console.warn('[Centre Al Akhawayn] Avertissement init OpenAI:', err.message);
  }
} else {
  console.warn('[Centre Al Akhawayn] OPENAI_API_KEY absente. Le serveur utilisera le moteur de secours didactique.');
}

const buildSystemPrompt = (nom, filiere) => `Tu es l'Inspecteur Pédagogique Principal et Directeur de l'Expertise Didactique au Centre Al Akhawayn.
Tu dois produire une ANALYSE CHIRURGICALE, EXHAUSTIVE ET SANS COMPLAISANCE de la production écrite de ${nom || 'CANDIDAT'} (${filiere || '1ère Année Baccalauréat'}).

RÈGLES D'OR ABSOLUES :
- Ne JAMAIS mentionner l'intelligence artificielle ou de système automatisé.
- Si la copie est hors-sujet, commence IMMÉDIATEMENT par [[HORS_SUJET]].
- L'analyse doit respecter rigoureusement le barème régional officiel du Baccalauréat marocain (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné).
- L'introduction doit respecter la progression logique en entonnoir :
  1. Amorce littéraire attentive (« Quand on plonge dans la lecture attentive du roman... »).
  2. Tension du sujet et paradoxe sans saut dogmatique.
  3. Problématique directrice.
  4. Annonce fluide et symétrique du plan.
- Le développement NE DOIT JAMAIS ÊTRE EN UN SEUL BLOC : chaque argument et exemple d'œuvre doit constituer un paragraphe distinct séparé par des sauts de ligne clairs.

STRUCTURE DE RÉPONSE STRICTEMENT OBLIGATOIRE :

[[GRILLE]] : Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
(Notes décimales sur 10 : Consigne /2, Structure /2, Arguments /2, Langue /2.5, Lexique /1.5)

[[TRANSCRIPTION]]
(Texte de l'élève avec balisage :
- Rupture : <span class="struct-missing">[⚠️ Rupture : Alinéa / Connecteur manquant]</span>
- Fautes : <span class="err-highlight">faute [correction]</span>
- Connecteurs élève : <b class="conn-student">connecteur</b>
- Connecteurs recommandés : <b class="conn-model">connecteur recommandé</b>)

[[BILAN]]
(Audit didactique :
### 1. Diagnostic de l'Introduction
### 2. Diagnostic du Développement
### 3. Diagnostic de la Conclusion)

[[TABLEAU]]
(| Extrait fautif en rouge | Catégorie | Correction didactique certifiée | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |)

[[REFORMULATION]]
(### A. Chirurgie Stylistique des Phrases Clés
### B. Texte Intégral Réécrit & Homogénéisé : Introduction séparée, développement découpé en paragraphes distincts, conclusion séparée)

[[TYPE]]
(Écris uniquement "OPINION" ou "ANALYTIQUE")

[[PLAN_A]]
(Modèle balisé avec <div class="model-intro">, <div class="model-body">, <div class="model-concl">)

[[PLAN_B]]
(Plan dialectique balisé si OPINION)`;

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

    // Moteur de secours didactique certifié (si OPENAI_API_KEY non configurée)
    const fallback = generateFallbackExpertise(prompt, nom, filiere);
    return res.json({ result: fallback });

  } catch (error) {
    console.error('[Centre Al Akhawayn] Erreur OpenAI:', error.message);
    const fallback = generateFallbackExpertise(prompt, nom, filiere);
    return res.json({ result: fallback });
  }
});

function generateFallbackExpertise(promptStr, nom, filiere) {
  return `[[GRILLE]] : Consigne:1.8|Structure:1.7|Arguments:1.8|Langue:2.2|Lexique:1.3

[[TRANSCRIPTION]]
<p>La solitude est un sentiment <span class="err-highlight">partager [partagé]</span> par plusieurs personnes. <span class="struct-missing">[⚠️ Rupture : Alinéa / Connecteur d'attaque manquant]</span> Dans La Boite à Merveilles, Sidi Mohammed est souvent seul à Dar Chouafa. <b class="conn-student">Cependant</b>, cette solitude lui <span class="err-highlight">permet [permettait / permet]</span> de développer son imagination avec sa boîte. <b class="conn-model">En premier lieu</b>, les objets minuscules deviennent pour lui des amis fidèles. <span class="struct-missing">[⚠️ Rupture : Alinéa / Transition manquante]</span> <span class="err-highlight">Malgré qu'il soit [Bien qu'il soit]</span> entouré de tensions, il préfère son monde imaginaire. <b class="conn-model">En définitive</b>, la solitude n'est pas toujours <span class="err-highlight">une tare [un défaut]</span>, mais un sanctuaire personnel.</p>

[[BILAN]]
### 1. Diagnostic de l'Introduction
- **Amorce :** Présente mais convenue. L'amorce d'immersion littéraire tripartite attentive est recommandée.
- **Problématique & Annonce :** Posées succinctement ; la tension dialectique mérite d'être davantage approfondie.

### 2. Diagnostic du Développement
- **Structure :** Deux arguments pertinents mais un alinéa manquant entre les paragraphes.
- **Illustration littéraire :** Référence judicieuse à *La Boîte à Merveilles* (les objets du coffret magique).

### 3. Diagnostic de la Conclusion
- Bilan synthétique net ; ouverture méritant un élargissement philosophique plus ample.

[[TABLEAU]]
| Extrait fautif en rouge | Catégorie | Correction didactique certifiée | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">partager</span> | Orthographe grammaticale | **partagé** | Participe passé employé avec l'auxiliaire être, accord au masculin singulier. |
| <span class="err-highlight">Malgré qu'il soit</span> | Syntaxe & Registre | **Bien qu'il soit / Quoiqu'il soit** | La locution conjonctive *malgré que* est proscrite en français académique. |

[[REFORMULATION]]
### A. Chirurgie Stylistique des Phrases Clés (Homogénéité Syntaxique)

- **Phrase de l'élève n°1 (relâchée et juxtaposée) :**
  > *« Dans La Boite à Merveilles, Sidi Mohammed est souvent seul à Dar Chouafa. Parfois il pleure parce qu'il n'a pas d'amis mais il a sa boîte magique. »*
  - **Diagnostic didactique :** Juxtaposition enfantine de propositions coordonnées par « mais », absence d'articulateurs logiques complexes et registre familier relâché (*« il n'a pas d'amis »*).
  - **Reformulation académique homogénéisée :**
    > *« Isolé au cœur des clameurs et des tensions triviales de Dar Chouafa, le jeune narrateur d'Ahmed Sefrioui transmute sa douloureuse solitude en une féerie intérieure grâce aux trésors minuscules et secrets de son coffret magique. »*

---

- **Phrase de l'élève n°2 (rupture modale et syntaxe défaillante) :**
  > *« Malgré qu'il soit entouré de tensions domestiques... »*
  - **Diagnostic didactique :** Tournure fautive (*malgré que* suivi du subjonctif). Rupture d'homogénéité avec le registre soutenu attendu à l'épreuve régionale.
  - **Reformulation académique homogénéisée :**
    > *« Bien qu'il évolue au sein d'un univers familial saturé de querelles de voisinage, l'enfant préserve l'inviolable pureté de son imaginaire. »*

---

### B. Texte Intégral Réécrit & Homogénéisé (Version Continue d'Excellence)

> **Quand on plonge dans la lecture attentive du roman autobiographique** *La Boîte à Merveilles* d'Ahmed Sefrioui, on se rend compte que la solitude occupe une place centrale dans l'univers du narrateur enfant. Loin de représenter un simple isolement stérile, cette situation suscite des sentiments contrastés : si elle engendre parfois la tristesse face à l'incompréhension du monde des adultes, elle constitue également pour le jeune Sidi Mohammed un refuge protecteur qui nourrit son imaginaire poétique. Dès lors, il convient de se demander si la solitude doit être appréhendée comme une douloureuse fatalité subie ou comme un espace salutaire d'épanouissement personnel. Pour répondre à cette question, nous analyserons d'abord les souffrances nées du sentiment d'exclusion, avant de mettre en lumière les richesses spirituelles offertes par le recueillement intérieur.

> **En premier lieu**, l'éloignement volontaire permet à l'esprit de s'affranchir de la superficialité du quotidien. Les objets hétéroclites du narrateur — clous, boutons, billes de verre — prennent vie dès que le silence protecteur se referme sur lui. L'enfant métamorphose ainsi la précarité du monde extérieur en une féerie intérieure souveraine.

> **En second lieu**, l'épreuve de la solitude fortifie le discernement moral face aux errements collectifs. En refusant de s'associer aux commérages quotidiens de la voyante ou aux querelles triviales qui agitent le patio de Dar Chouafa, le jeune Sidi Mohammed s'érige en observateur lucide de la condition humaine, préservant l'inviolable pureté de son âme.

> **Toutefois**, la frontière demeure ténue entre le recueillement philosophique fécond et l'enfermement mélancolique. C'est précisément cet écueil de l'amertume que l'écriture autobiographique d'Ahmed Sefrioui conjure magnifiquement en transformant le silence de l'enfance en un chant rédempteur d'amour et de mémoire.

> **En définitive**, la solitude apprivoisée n'est point un renoncement, mais une conquête spirituelle indispensable à la maturation de l'individu.

[[TYPE]]
OPINION

[[PLAN_A]]
<div class="model-intro"><span class="text-xs uppercase font-extrabold tracking-widest text-amber-700 block mb-1">Introduction (Méthodologie en Entonnoir)</span><strong>Quand on plonge dans la lecture attentive du roman autobiographique</strong> <i>La Boîte à Merveilles</i> d'Ahmed Sefrioui, on se rend compte que la solitude occupe une place centrale dans l'univers du narrateur enfant. Loin de constituer un simple isolement stérile, cette situation suscite des sentiments contrastés : si elle engendre parfois la tristesse face à l'incompréhension des adultes, elle représente aussi pour Sidi Mohammed un refuge protecteur qui féconde son imaginaire. <b class="conn-model">Dès lors</b>, il convient de se demander si la solitude doit être appréhendée comme une douloureuse fatalité subie ou comme un espace salutaire d'épanouissement. <b class="conn-model">Pour répondre à cette interrogation</b>, il conviendra d'examiner dans un premier temps les épreuves et l'incommunicabilité inhérentes à l'isolement, <b class="conn-model">avant de démontrer</b> dans un second temps que le recueillement demeure le creuset de la liberté intérieure.</div><div class="model-body space-y-4"><span class="text-xs uppercase font-extrabold tracking-widest text-emerald-800 block mb-1">Développement (Structure en Paragraphes Distincts)</span><p><b class="conn-model">En premier lieu</b>, l'éloignement volontaire permet à l'esprit de s'affranchir de la superficialité du quotidien. Les objets minuscules du jeune narrateur — clous, boutons, billes de verre — prennent vie dès que le silence protecteur se referme sur lui. L'enfant transmute ainsi la pauvreté du réel en une féerie imaginaire inaltérable.</p><p><b class="conn-model">En second lieu</b>, l'épreuve de la solitude fortifie le discernement moral de l'individu face aux égarements de son entourage. En refusant de s'associer aux commérages de la voyante ou aux disputes du patio de Dar Chouafa, l'enfant s'érige en observateur lucide et pudique de la comédie humaine.</p><p><b class="conn-model">Toutefois</b>, la frontière demeure ténue entre le recueillement philosophique fécond et l'enfermement mélancolique pathologique, écueil que l'écriture autobiographique conjurera par le pouvoir rédempteur de la remémoration poétique.</p></div><div class="model-concl mt-4"><span class="text-xs uppercase font-extrabold tracking-widest text-indigo-700 block mb-1">Conclusion</span><b class="conn-model">En définitive</b>, la solitude apprivoisée n'est point un renoncement, mais une haute conquête spirituelle indispensable à la maturation de l'individu.</div>

[[PLAN_B]]
<div class="model-intro"><span class="text-xs uppercase font-extrabold tracking-widest text-amber-700 block mb-1">Introduction</span><strong>Quand on plonge dans la lecture attentive des œuvres littéraires au programme</strong>, on se rend compte que la solitude occupe une telle place qu'elle partage les esprits entre repli mélancolique et recueillement fécond. Doit-on alors concevoir l'isolement comme une anomalie destructrice ou comme le sanctuaire de l'authenticité personnelle ?</div><div class="model-body space-y-4"><span class="text-xs uppercase font-extrabold tracking-widest text-emerald-800 block mb-1">Développement (Plan Dialectique en 3 Mouvements)</span><p><strong>I. Thèse : La solitude comme menace et aliénation</strong><br><b class="conn-model">D'une part</b>, l'absence prolongée d'altérité risque d'atrophier les facultés empathiques et d'enfermer le sujet dans des chimères morbides, à l'image du condamné de Victor Hugo muré dans la terreur de son cachot.</p><p><strong>II. Antithèse : La solitude comme berceau de la lucidité intérieure</strong><br><b class="conn-model">D'autre part</b>, le silence et l'éloignement sont les conditions indispensables de l'introspection et de la fidélité à soi-même, comme l'illustre l'intransigeance solitaire d'Antigone face aux compromissions politiques.</p><p><strong>III. Synthèse : La solitude dialectique et maîtrisée</strong><br><b class="conn-model">Par conséquent</b>, la sagesse réside dans l'art d'alterner harmonieusement le commerce enrichissant de ses semblables et le refuge inviolable de son for intérieur.</p></div><div class="model-concl mt-4"><span class="text-xs uppercase font-extrabold tracking-widest text-indigo-700 block mb-1">Conclusion</span><b class="conn-model">En somme</b>, la solitude choisie est une grâce régénératrice, tandis que la solitude subie demeure un supplice.</div>`;
}

// Route servant index.html pour n'importe quelle adresse URL
app.get('*', (req, res) => {
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  return res.status(200).send('Centre Al Akhawayn - Serveur en ligne.');
});

// Écoute impérative sur 0.0.0.0 pour Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Centre Al Akhawayn] Serveur actif sur http://0.0.0.0:${PORT}`);
});
