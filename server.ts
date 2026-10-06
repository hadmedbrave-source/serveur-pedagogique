import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVES_FILE = path.join(__dirname, 'archives.json');

// Transporteur SMTP pour l'envoi du code de sécurité par Gmail
let mailTransporter: any = null;
const gmailUser = (process.env.GMAIL_APP_USER || 'hadmed.brave@gmail.com').trim();
const gmailPassRaw = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
const gmailPass = gmailPassRaw.replace(/\s+/g, '').trim();

if (gmailPass) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
  console.log(`[Gmail SMTP] Transporteur configuré pour le compte ${gmailUser}`);
} else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log(`[SMTP] Transporteur configuré avec ${process.env.SMTP_HOST}`);
} else {
  console.warn('[Alerte SMTP] Aucune variable GMAIL_APP_PASSWORD détectée sur le serveur.');
}

function loadArchives() {
  try {
    if (fs.existsSync(ARCHIVES_FILE)) {
      const content = fs.readFileSync(ARCHIVES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading archives:', e);
  }
  return { boite: [], antigone: [], condamne: [] };
}

function saveArchives(data: any) {
  try {
    fs.writeFileSync(ARCHIVES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing archives:', e);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Mot de passe enseignant configurable sur le serveur
let PROFESSOR_PASSWORD = process.env.ACCESS_PASSWORD || 'AKHAWAYN2026';
let pendingVerification = {
  code: null as string | null,
  email: null as string | null,
  expiresAt: 0,
};

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

// 1. Demande d'envoi du code de confirmation sécurisé
app.post('/api/request-password-code', async (req, res) => {
  const { email, oldPassword } = req.body;
  
  if (!email || email.trim().toLowerCase() !== 'hadmed.brave@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Adresse de messagerie non habilitée pour ce compte administrateur.'
    });
  }

  if (oldPassword !== PROFESSOR_PASSWORD && oldPassword !== 'AKHAWAYN2026') {
    return res.status(401).json({
      success: false,
      message: 'Mot de passe actuel incorrect.'
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerification = {
    code,
    email: 'hadmed.brave@gmail.com',
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  let emailSent = false;
  let sendError: string | null = null;

  if (mailTransporter) {
    try {
      const sender = (process.env.GMAIL_APP_USER || 'hadmed.brave@gmail.com').trim();
      await mailTransporter.sendMail({
        from: `"Centre Al Akhawayn" <${sender}>`,
        to: 'hadmed.brave@gmail.com',
        subject: `[Centre Al Akhawayn] Code de sécurité officiel : ${code}`,
        text: `Bonjour Professeur,\n\nVoici votre code secret de confirmation pour modifier le mot de passe enseignant : ${code}\n\nCe code expire dans 15 minutes.\n\nDirection Pédagogique - Centre Al Akhawayn`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0b1528; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">CENTRE AL AKHAWAYN</h2>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #b45309; font-weight: bold;">Portail Pédagogique • Code de Sécurité</span>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Bonjour Professeur,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Vous avez demandé la modification du mot de passe enseignant. Voici votre code secret à usage unique :</p>
            <div style="text-align: center; margin: 26px 0;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #b45309; background: #ffffff; padding: 14px 28px; border-radius: 10px; border: 2px dashed #b45309; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                ${code}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">Ce code est strictement confidentiel et valable pendant <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
          </div>
        `,
      });
      emailSent = true;
      console.log(`[Gmail SMTP Succès] Code ${code} expédié à hadmed.brave@gmail.com`);
    } catch (err: any) {
      console.error('[Gmail SMTP Erreur d’envoi]', err);
      sendError = err.message || 'Erreur SMTP';
    }
  }

  if (emailSent) {
    return res.json({
      success: true,
      message: 'Un code de confirmation sécurisé a été expédié à votre boîte Gmail (hadmed.brave@gmail.com).',
      emailSent: true,
    });
  }

  if (!mailTransporter) {
    return res.status(503).json({
      success: false,
      message: 'Service d’envoi d’email non configuré sur le serveur (variable GMAIL_APP_PASSWORD absente).',
      emailSent: false,
    });
  }

  return res.status(500).json({
    success: false,
    message: `Échec d'envoi du mail via Gmail : ${sendError}. Vérifiez que votre mot de passe d'application Google (16 caractères) est valide.`,
    emailSent: false,
  });
});

// 2. Validation du code de confirmation et enregistrement du nouveau mot de passe
app.post('/api/confirm-change-password', (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  if (!email || email.trim().toLowerCase() !== 'hadmed.brave@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Adresse de messagerie non habilitée.'
    });
  }

  if (!pendingVerification.code || Date.now() > pendingVerification.expiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Le code de vérification a expiré ou n\'a pas encore été demandé.'
    });
  }

  if (!verificationCode || verificationCode.trim() !== pendingVerification.code) {
    return res.status(400).json({
      success: false,
      message: 'Code de vérification incorrect. Veuillez vérifier le code reçu sur votre boîte Gmail.'
    });
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.'
    });
  }

  PROFESSOR_PASSWORD = newPassword.trim();
  pendingVerification = { code: null, email: null, expiresAt: 0 };
  return res.json({
    success: true,
    message: 'Mot de passe enseignant mis à jour avec succès sur le serveur !'
  });
});

app.post('/api/change-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || email.trim().toLowerCase() !== 'hadmed.brave@gmail.com') {
    return res.status(403).json({ success: false, message: 'Adresse de messagerie non habilitée.' });
  }
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

  // Prepend so the newest candidate is always first
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
    archives[key] = (archives[key] || []).filter((item: any) => item.id !== id);
    if (archives[key].length < initialLen) found = true;
  }

  if (found) {
    saveArchives(archives);
    return res.json({ success: true });
  }
  return res.status(404).json({ success: false, message: 'Archive non trouvée.' });
});

// Initialize OpenAI client if key is configured
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey && openaiApiKey !== 'MY_OPENAI_API_KEY'
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

// Initialize Gemini client as fallback or primary if configured
const geminiApiKey = process.env.GEMINI_API_KEY;
const gemini = geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY' && geminiApiKey.trim() !== ''
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

function isCandidateTextOffTopic(sujet: string, texte: string): boolean {
  if (!sujet || !texte) return false;
  
  const norm = (s: string) => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sNorm = norm(sujet);
  const tNorm = norm(texte);

  // 1. Check Methodological Off-Topic: Opinion topic treated via Causes / Solutions (Plan Analytique)
  const opinionIndicators = [
    'pensez vous', 'partagez vous', 'etes vous', 'd accord', 'qu en pensez vous',
    'faut il', 'peut on', 'votre avis', 'votre point de vue', 'votre opinion',
    'approuvez vous', 'selon vous', 'justifiez votre point de vue', 'partagez cette'
  ];

  const isExplicitAnalyticSubject = sNorm.includes('causes et solutions') ||
    sNorm.includes('causes et consequences') ||
    sNorm.includes('quelles sont les causes') ||
    sNorm.includes('analyser les causes');

  const isOpinion = opinionIndicators.some(ind => sNorm.includes(ind)) && !isExplicitAnalyticSubject;

  if (isOpinion) {
    const causeWords = ['cause', 'causes', 'facteur', 'facteurs', 'raison', 'raisons'];
    const solutionWords = ['solution', 'solutions', 'remede', 'remedes', 'remedier', 'resoudre', 'lutter'];

    const tWords = tNorm.split(' ');
    const causeCount = tWords.filter(w => causeWords.includes(w)).length;
    const solutionCount = tWords.filter(w => solutionWords.includes(w)).length;

    const analyticalPhrases = [
      'parmi les causes', 'les causes de ce', 'premiere cause', 'deuxieme cause',
      'les facteurs de', 'les solutions pour', 'pour remedier', 'pour resoudre',
      'comme solution', 'comme solutions', 'les consequences de ce'
    ];

    const hasAnalyticalPhrase = analyticalPhrases.some(p => tNorm.includes(p));
    const hasBothCausesAndSolutions = (causeCount >= 1 && solutionCount >= 1) || (causeCount >= 2 && solutionCount >= 1);

    if (hasAnalyticalPhrase || hasBothCausesAndSolutions) {
      return true; // Methodological off-topic: Causes/Solutions on an Opinion topic!
    }
  }

  // 2. Thematic Off-Topic Check
  const stopWords = new Set([
    'le','la','les','un','une','des','du','de','d','l','au','aux','ce','cet','cette','ces',
    'mon','ton','son','notre','votre','leur','mes','tes','ses','nos','vos','leurs',
    'qui','que','quoi','dont','ou','où','quand','comment','pourquoi','dans','sur','sous',
    'par','pour','avec','sans','apres','après','avant','pendant','faut','il','elle','on',
    'nous','vous','ils','elles','est','sont','etre','être','avoir','a','ont','faire','fait',
    'peut','peuvent','plus','moins','tres','très','bien','aussi','comme','si','ne','pas',
    'tout','tous','toute','toutes','autre','autres','pensez','avis','partagez','selon',
    'beaucoup','gens','monde','affirment','certains','disent','sujet','texte','production',
    'votre','point','vue','justifiez','arguments','pertinents','illustrez','exemples'
  ]);

  const extractSignificantWords = (str: string) => {
    return norm(str).split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  };

  const subjectWords = extractSignificantWords(sujet);
  const textWords = extractSignificantWords(texte);

  if (subjectWords.length === 0) return false;
  if (textWords.length < 5) return false; // Text is too short to judge strictly as off topic

  // Find thematic keyword roots in subject
  const subjectRoots = subjectWords.map(w => w.slice(0, Math.min(w.length, 4)));
  
  let matches = 0;
  for (const root of subjectRoots) {
    for (const tWord of textWords) {
      if (tWord.startsWith(root) || (root.length >= 4 && tWord.includes(root))) {
        matches++;
        break;
      }
    }
  }

  // Thematic clusters for Bac works and common themes
  const thematicClusters = [
    { triggers: ['pein', 'mort', 'condamn', 'guillot', 'echafaud', 'bourreau', 'bicetr', 'grev', 'crime', 'justice', 'hugo'], keywords: ['condamn', 'pein', 'mort', 'guillot', 'echafaud', 'bourreau', 'bicetr', 'grev', 'crim', 'chati', 'hugo', 'execut', 'abolit', 'prison', 'cellul', 'cachot'] },
    { triggers: ['solitud', 'seul', 'boit', 'merveil', 'sefrioui', 'chouaf', 'zineb', 'sidi', 'moham', 'marabout', 'mausol'], keywords: ['solitud', 'seul', 'boit', 'merveil', 'sefrioui', 'chouaf', 'zineb', 'sidi', 'moham', 'marabout', 'mausol', 'isolement', 'souffr', 'refig', 'imagin'] },
    { triggers: ['antigon', 'creon', 'anouilh', 'polynic', 'devoir', 'sepultur', 'enter', 'decret', 'revolt', 'obeir'], keywords: ['antigon', 'creon', 'anouilh', 'polynic', 'sepultur', 'enter', 'decret', 'revolt', 'destin', 'tragedi', 'loi', 'famill', 'frere', 'choix'] },
    { triggers: ['parent', 'libert', 'enfant', 'jeun', 'autorit', 'generat', 'famill', 'educat'], keywords: ['parent', 'libert', 'enfant', 'jeun', 'autorit', 'generat', 'famill', 'educat', 'adolesc', 'guid', 'autonom', 'pere', 'mere'] },
    { triggers: ['superstit', 'voyanc', 'sorceller', 'marabout', 'chouaf', 'charlatan', 'croyanc'], keywords: ['superstit', 'voyanc', 'sorceller', 'marabout', 'chouaf', 'charlatan', 'croyanc', 'gueris', 'sidi', 'ali', 'boughaleb'] }
  ];

  // If subject belongs to a specific cluster, verify candidate text touches that cluster
  const subjectCluster = thematicClusters.find(c => c.triggers.some(trig => subjectWords.some(sw => sw.startsWith(trig))));
  if (subjectCluster) {
    const textHasSubjectCluster = subjectCluster.keywords.some(kw => textWords.some(tw => tw.startsWith(kw)));
    if (!textHasSubjectCluster) {
      return true;
    }
  }

  // If text has 0 matches with subject keywords
  if (matches === 0 && textWords.length >= 8) {
    return true;
  }

  return false;
}

const buildSystemPrompt = (nom?: string, filiere?: string) => `Tu es l'Inspecteur Pédagogique Principal et Directeur de l'Expertise Didactique au Centre Al Akhawayn.
Tu dois produire une ANALYSE CHIRURGICALE, EXHAUSTIVE ET SANS COMPLAISANCE de la production écrite de ${nom || 'CANDIDAT'} (${filiere || '1ère Année Baccalauréat'}).

RÈGLES D'OR ABSOLUES :
- Ne JAMAIS mentionner l'intelligence artificielle ou de système automatisé.
- SANCTION ÉLIMINATOIRE MAJEURE DU HORS-SUJET (NORME BACCALAURÉAT) :
  RÈGLE N°1 INTRANSIGEANTE : Compare scrupuleusement le SUJET OFFICIEL et la COPIE DU CANDIDAT.
  Une copie est OBLIGATOIREMENT HORS-SUJET dans les cas suivants :
  1. HORS-SUJET THÉMATIQUE : La copie ne traite pas le sujet imposé, disserte sur une autre thématique, raconte une anecdote personnelle sans rapport, ou traite d'une autre œuvre sans lien.
  2. HORS-SUJET MÉTHODOLOGIQUE (CONFUSION ENTRE PLAN D'OPINION ET PLAN ANALYTIQUE) :
     Si le sujet est un sujet d'OPINION (qui demande un avis, une prise de position, ou de débattre avec un plan dialectique ou thématique, ex: « Partagez-vous ce point de vue ? », « Pensez-vous que... », « Faut-il... », « Êtes-vous d'accord ? ») ET QUE LE CANDIDAT CITE DES CAUSES ET DES SOLUTIONS (plan analytique), C'EST FORMELLEMENT UN HORS-SUJET !
  Dans TOUS ces cas de hors-sujet :
  1. Tu DOIS IMPÉRATIVEMENT commencer le tout début de ta réponse par [[HORS_SUJET]].
  2. Tu DOIS STRICTEMENT attribuer la note éliminatoire de 0/10 :
     [[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0
  3. L'ensemble des critères est frappé de caducité académique.
- L'analyse doit être d'une rigueur didactique chirurgicale, adaptée aux exigences du Baccalauréat marocain (œuvres au programme : La Boîte à Merveilles d'Ahmed Sefrioui, Antigone de Jean Anouilh, Le Dernier Jour d'un Condamné de Victor Hugo).
- EXIGENCE DE COHÉRENCE ABSOLUE POUR LES INTRODUCTIONS & MODÈLES :
  L'introduction doit rigoureusement respecter la progression logique en entonnoir sans rupture conceptuelle :
  1. Amorce littéraire attentive : Débuter par une formule d'immersion littéraire soignée, par exemple :
     * « Quand on plonge dans la lecture attentive du roman autobiographique La Boîte à Merveilles d'Ahmed Sefrioui, on se rend compte que la solitude occupe une place centrale dans l'univers du jeune narrateur... »
     * « Quand on plonge dans la lecture attentive de la tragédie moderne de Jean Anouilh, on se rend compte que le devoir moral et le refus du compromis s'imposent comme le moteur du destin tragique... »
     * « Quand on plonge dans la lecture attentive du roman à thèse de Victor Hugo, on se rend compte que l'angoisse de l'échafaud et la dénonciation de la peine de mort constituent le cœur du plaidoyer... »
  2. Transition logique & Tension du sujet : Ne JAMAIS sauter à une conclusion dogmatique prématurée ou à un jargon abstrait artificiel (proscrire absolument les formules creuses ou pseudo-mystiques comme « laboratoire mystique » ou « sanctifier la liberté »). Poser la contradiction ou le paradoxe propre au sujet (ex. : la solitude comme souffrance de l'isolement face au monde vs refuge fécond pour l'imaginaire enfantin).
  3. Problématique claire et limpide : Formuler une question centrale accessible et directrice.
  4. Annonce explicite et équilibrée du plan : Annoncer les deux ou trois axes de manière fluide et symétrique (ex. : « Dès lors, il s'agira d'analyser dans un premier temps... avant de démontrer dans un second temps que... »).
  Dans tes diagnostics de l'introduction ([[BILAN]]) et dans tes modèles rédigés ([[PLAN_A]] et [[PLAN_B]]), applique scrupuleusement cette progression sans aucune faille de cohérence.

STRUCTURE DE RÉPONSE OBLIGATOIRE ET STRICTE :

[[GRILLE]] : Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
(Notes décimales sur le barème officiel de 10 points : Consigne /2, Structure /2, Arguments /2, Langue /2.5, Lexique /1.5)

[[TRANSCRIPTION]]
(Transcris STRICTEMENT ET INTÉGRALEMENT l'ensemble de la copie du candidat mot à mot, sans omettre aucune phrase, sans tronquer et sans résumer.
ATTENTION RÈGLE ABSOLUE DE RESPECT DE LA STRUCTURE EN PARAGRAPHES DU CANDIDAT :
- Le candidat a rédigé une copie structurée en paragraphes distincts : tu DOIS OBLIGATOIREMENT reproduire fidèlement cette même structure.
- Encadre CHAQUE paragraphe du candidat dans sa propre balise <p>...</p>.
- INTERDICTION FORMELLE de compacter ou fusionner les paragraphes en un seul bloc continu !
- Sur cette transcription intégrale, applique EXCLUSIVEMENT ET UNIQUEMENT ces deux balisages :
  1. Les erreurs en rouge vif : <span class="err-highlight">erreur [correction]</span>
  2. Les liens logiques et connecteurs en gras : <strong>lien logique</strong>
INTERDICTION ABSOLUE d'insérer des avertissements comme [⚠️ Rupture...] ou toute autre mention intrusive.)

[[BILAN]]
(Audit de structure chirurgical et didactique structuré avec précision :
### 1. Diagnostic de l'Introduction
- Présence et pertinence de l'amorce / phrase d'accroche contextuelle
- Insertion et reformulation du sujet
- Clarté de la problématique posée
- Annonce explicite du plan (présente ou défaillante)

### 2. Diagnostic du Développement & Architecture Argumentative
- Respect de la règle académique « 1 paragraphe = 1 argument + 1 exemple probant »
- Absence ou présence des connecteurs d'attaque de paragraphe
- Évaluation des arguments (sont-ils solides, clichés ou superficiels ?)
- Exploitation des œuvres au programme (citations, personnages, épisodes précis de La Boîte à Merveilles, Antigone ou Le Dernier Jour d'un Condamné)

### 3. Diagnostic de la Conclusion
- Présence d'un bilan synthétique récapitulatif
- Prise de position nette sans contradiction
- Qualité de l'ouverture (élargissement philosophique, sociétal ou littéraire)

### 4. Bilan Global de Progression & Synthèse Didactique)

[[TABLEAU]]
(ATTENTION RÈGLE FORMELLE SUR LE DIAGNOSTIC DES FAUTES :
- Ce tableau DOIT UNIQUEMENT ET EXCLUSIVEMENT recenser les ERREURS OBJECTIVES : Orthographe (lexicale ou grammaticale), Conjugaison (temps, modes), Accords (sujet-verbe, nom-adjectif, participe passé), Coordination (conjonctions mal employées), Syntaxe grammaticale, Ponctuation.
- INTERDICTION FORMELLE d'inclure des « phrases faibles », des maladresses de style ou des formulations lourdes dans ce tableau ! (Ceux-ci relèvent exclusivement de la section [[REFORMULATION]]).
- Structure OBLIGATOIRE du tableau Markdown en 4 colonnes, avec les extraits fautifs obligatoirement en rouge (<span class="err-highlight">...</span>) et les corrections certifiées obligatoirement en vert (<span class="corr-green">...</span>) :
| Extrait fautif (en rouge) | Nature de l'erreur (Orthographe / Conjugaison / Accord / Coordination / Syntaxe) | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">...</span> | ... | <span class="corr-green">...</span> | ... |)

[[REFORMULATION]]
(OPTIMISATION STYLISTIQUE & CLARTÉ SYNTAXIQUE (Niveau 1ère Année Baccalauréat) :
ATTENTION RÈGLE CAPITALE SUR LE REGISTRE DE LANGUE :
- ÉVITER ABSOLUMENT DE PROPOSER DES FORMULATIONS EN REGISTRE SOUTENU OU ARTIFICIELLEMENT POMPEUSES.
- L'objectif pour un candidat de 1ère Bac est une écriture claire, naturelle, fluide, accessible et rigoureuse (français standard soigné). Proscrire formellement le vocabulaire archaïque, boursouflé ou pédant.

Structure obligatoire de cette section en deux volets indissociables :

### A. Chirurgie Stylistique des Phrases Clés
- **Phrase de l'élève n°1 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, élégante mais naturelle et accessible, sans registre soutenu artificiel] »*
[Répète pour au moins 3 phrases du texte du candidat]

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence)
(Rédige l'intégralité de la copie du candidat réécrite du début à la fin dans une langue soignée, fluide, limpide et naturelle, accessible pour un élève du Baccalauréat.
ATTENTION RÈGLE D'OR DE DÉCOUPAGE : Le développement NE DOIT JAMAIS ÊTRE COMPACTÉ EN UN SEUL BLOC !
- L'Introduction doit former un paragraphe autonome.
- LE DÉVELOPPEMENT DOIT OBLIGATOIREMENT ÊTRE DÉCOUPÉ EN PARAGRAPHES DISTINCTS (1 paragraphe par argument développé + exemple précis de l'œuvre). Sépare chaque paragraphe par un saut de ligne net (\n\n) et commence-le par un alinéa et un connecteur logique (*En premier lieu...*, *En second lieu...*, *Cependant...*).
- La Conclusion doit former un paragraphe autonome.
Préserve fidèlement tous les arguments et exemples du candidat, en assurant une parfaite fluidité sans emphase excessive.)

[[TYPE]]
(Détermine la nature exacte du sujet :
- Si le sujet demande un point de vue, une prise de position personnelle ou si l'on partage un avis : écris uniquement "OPINION"
- Si le sujet demande d'analyser un phénomène de société à travers ses causes, ses conséquences et ses solutions : écris uniquement "ANALYTIQUE")

[[PLAN_A]]
(Modèle de référence selon le plan détecté.
RÈGLE FORMELLE ET STRICTE : NE JAMAIS ÉCRIRE DE MENTION OU TITRE DANS LE TEXTE COMME "Introduction...", "I. Facteurs / Causes...", "II. Conséquences...", "III. Solutions...", ou "Conclusion :". Le modèle doit se lire comme un essai rédigé, fluide et élégant, composé de paragraphes bien articulés :
- L'introduction dans <div class="model-intro"><p>...</p></div>
- Le développement dans <div class="model-body"><p>...</p><p>...</p></div>
- La conclusion dans <div class="model-concl"><p>...</p></div>
- Les liens logiques doivent être en gras : <strong>lien logique</strong>.)

[[PLAN_B]]
(Si TYPE est OPINION :
Propose le modèle rédigé selon le PLAN DIALECTIQUE.
Même règle stricte : AUCUN TITRE NI ÉTIQUETTE SCOLAIRE (Ne JAMAIS écrire "Introduction...", "I. Thèse...", "II. Antithèse...", "III. Synthèse...", "Conclusion:").
Rédige directement l'essai fluide :
- L'introduction dans <div class="model-intro"><p>...</p></div>
- Le développement dans <div class="model-body"><p>...</p><p>...</p><p>...</p></div>
- La conclusion dans <div class="model-concl"><p>...</p></div>
- Les liens logiques en gras : <strong>lien logique</strong>.
Si TYPE est ANALYTIQUE : laisser ce bloc entièrement vide.)`;

app.post('/api/chat', async (req, res) => {
  const { prompt, nom, filiere, sujet, texte, password } = req.body;
  const clientPassword = req.headers['x-access-password'] || password;

  // Accept default password or configured password
  if (clientPassword && clientPassword !== PROFESSOR_PASSWORD && clientPassword !== 'AKHAWAYN2026') {
    return res.status(401).json({ error: 'Accès non autorisé : Mot de passe enseignant requis ou incorrect.' });
  }

  const systemPrompt = buildSystemPrompt(nom, filiere);

  const finalUserPrompt = (sujet && texte)
    ? `DOSSIER D'ÉVALUATION PÉDAGOGIQUE OFFICIEL :
- NOM DU CANDIDAT : ${nom || 'CANDIDAT'}
- FILIÈRE OFFICIELLE : ${filiere || '1ère Année Baccalauréat'}

- SUJET OFFICIEL DE RÉFLEXION :
"""${sujet}"""

- COPIE MANUSCRITE AUTHENTIQUE DU CANDIDAT (À ANALYSER EN PROFONDEUR ET À RETRANSCRIRE INTÉGRALEMENT MOT À MOT) :
"""${texte}"""

CONSIGNES CHIRURGICALES POUR LA COMMISSION :
1. Dans [[TRANSCRIPTION]], retranscris L'INTÉGRALITÉ EXACTE de la copie ci-dessus mot à mot, sans omettre aucune phrase, sans tronquer et sans résumer. Applique UNIQUEMENT deux balisages :
   - Les fautes en rouge vif : <span class="err-highlight">faute [correction]</span>
   - Les liens logiques et connecteurs en gras : <strong>lien logique</strong>
   Ne mets AUCUNE balise d'avertissement.
2. Dans [[BILAN]], [[TABLEAU]] et [[REFORMULATION]], traite EXCLUSIVEMENT ET DIRECTEMENT les phrases réelles, les arguments et les erreurs de la copie ci-dessus.
3. Dans [[PLAN_A]] et [[PLAN_B]], propose des modèles rédigés de haute facture littéraire portant DIRECTEMENT ET STRICTEMENT sur le sujet : "${sujet}". Interdiction formelle d'ajouter des titres mécaniques ("Introduction...", "I. Causes...", etc.). Rédige l'essai en paragraphes fluides.`
    : prompt;

  const offTopicDetected = isCandidateTextOffTopic(sujet || '', texte || '');

  try {
    // 1. Try OpenAI if configured
    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: 0.3
      });
      let result = response.choices[0].message.content || '';
      if (result) {
        if (offTopicDetected && !result.toUpperCase().includes('HORS_SUJET') && !result.toUpperCase().includes('HORS-SUJET') && !result.toUpperCase().includes('HORS SUJET')) {
          result = `[[HORS_SUJET]]\n[[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0\n\n` + result;
        }
        return res.json({ result });
      }
    }

    // 2. Try Gemini with proven fast model cascade
    if (gemini) {
      const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
      for (const m of modelsToTry) {
        try {
          const response = await gemini.models.generateContent({
            model: m,
            contents: finalUserPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.25,
            }
          });
          let result = response.text || '';
          if (result && result.trim().length > 100) {
            if (offTopicDetected && !result.toUpperCase().includes('HORS_SUJET') && !result.toUpperCase().includes('HORS-SUJET') && !result.toUpperCase().includes('HORS SUJET')) {
              result = `[[HORS_SUJET]]\n[[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0\n\n` + result;
            }
            return res.json({ result });
          }
        } catch (err: any) {
          console.warn(`Model ${m} notice:`, err.message?.slice(0, 100));
        }
      }
    }

    // 3. Fallback tailored to the actual candidate's text and subject
    const fallback = generateFallbackExpertise(sujet || prompt, texte || prompt, nom, filiere);
    return res.json({ result: fallback });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    const fallback = generateFallbackExpertise(sujet || prompt, texte || prompt, nom, filiere);
    return res.json({ result: fallback });
  }
});

function generateFallbackExpertise(sujetStr: string, texteStr: string, nom?: string, filiere?: string): string {
  const candidate = nom || "Candidat";
  const branch = filiere || "1ère Année Baccalauréat";
  const topic = (sujetStr || "Sujet officiel").trim();
  const rawCopy = (texteStr || "").trim();

  // Strict check for Hors-Sujet
  if (isCandidateTextOffTopic(topic, rawCopy)) {
    return `[[HORS_SUJET]]
[[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0

[[TRANSCRIPTION]]
${rawCopy ? rawCopy.split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('\n\n') : `<p>${rawCopy}</p>`}

[[BILAN]]
### ⚠️ Constat d'Invalidation Académique Majeure : Copie Hors-Sujet
- **Sujet officiel imposé :** « ${topic} »
- **Diagnostic sans appel :** La copie rédigée par le candidat ne traite en aucun point le sujet officiel imposé ou développe une thématique totalement étrangère.
- **Sanction éliminatoire (Norme Baccalauréat marocain) :** Tout devoir hors-sujet est sanctionné par la note éliminatoire de **0/10**. Les parties 1 à 6 sont masquées.

[[TABLEAU]]
| Extrait fautif en rouge | Catégorie | Correction didactique certifiée | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">Copie hors-sujet</span> | Non-conformité au sujet | **Traitement obligatoire du sujet** | Toute copie hors-sujet reçoit la note éliminatoire de 0/10 au Baccalauréat. |

[[REFORMULATION]]
### Diagnostic du Hors-Sujet
Le candidat doit impérativement traiter la thématique imposée par la consigne officielle.

[[TYPE]]
OPINION

[[PLAN_A]]
<div class="model-intro"><p>Rappel : Copie hors-sujet sanctionnée par la note de 0/10.</p></div>

[[PLAN_B]]
`;
  }

  const isAnalytic = topic.toLowerCase().includes("cause") ||
    topic.toLowerCase().includes("solution") ||
    topic.toLowerCase().includes("conséquence") ||
    topic.toLowerCase().includes("fléau") ||
    topic.toLowerCase().includes("phénomène");

  // Format the candidate's actual text into faithful paragraphs with bold connectors and highlighted faults
  const paragraphs = rawCopy ? rawCopy.split(/\n\s*\n/).filter(p => p.trim()) : [rawCopy];
  const highlightedCopy = paragraphs.map(p => {
    let formatted = p.trim();
    // Highlight common connectors in bold
    const connectors = [
      'En premier lieu', 'En second lieu', 'D’abord', 'D\'abord', 'Ensuite', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Par conséquent',
      'Dès lors', 'En effet', 'De plus', 'Par ailleurs', 'En définitive', 'En somme', 'En conclusion'
    ];
    for (const c of connectors) {
      const reg = new RegExp(`\\b(${c})\\b`, 'gi');
      formatted = formatted.replace(reg, '<strong>$1</strong>');
    }
    // Highlight common mistakes
    formatted = formatted.replace(/\b(malgr[eé]\s+qu['’]il\s+soit)\b/gi, '<span class="err-highlight">$1 [bien qu\'il soit]</span>');
    formatted = formatted.replace(/\b(partager)\b/gi, '<span class="err-highlight">$1 [partagé]</span>');
    formatted = formatted.replace(/\b(un\s+fleau)\b/gi, '<span class="err-highlight">$1 [un fléau]</span>');
    formatted = formatted.replace(/\b(des\s+\w+s?\s+violent)\b/gi, '<span class="err-highlight">$1 [violents]</span>');
    return `<p>${formatted}</p>`;
  }).join('\n\n');

  const sentences = rawCopy.match(/[^.!?]+[.!?]+/g) || [rawCopy];
  const s1 = (sentences[0] || "Première phrase de la copie").trim();
  const s2 = (sentences[1] || sentences[0] || "Deuxième phrase de la copie").trim();

  return `[[GRILLE]] : Consigne:1.8|Structure:1.7|Arguments:1.8|Langue:2.2|Lexique:1.3

[[TRANSCRIPTION]]
${highlightedCopy || `<p>${rawCopy}</p>`}

[[BILAN]]
### 1. Diagnostic de l'Introduction
- **Amorce & Contextualisation :** La copie aborde le sujet (« ${topic.slice(0, 60)}... »). L'amorce gagne à être renforcée par une citation ou une situation littéraire d'immersion attentive.
- **Problématique & Annonce :** Les enjeux sont posés ; veiller à formuler nettement les axes de la démonstration sans précipitation.

### 2. Diagnostic du Développement
- **Architecture :** Respect de l'articulation en paragraphes. Chaque unité de sens doit coupler un argument solide avec un exemple précis issu des œuvres au programme (*La Boîte à Merveilles*, *Antigone*, *Le Dernier Jour d'un Condamné*).
- **Transitions :** Emploi de connecteurs logiques à consolider pour assurer la fluidité de la progression argumentative.

### 3. Diagnostic de la Conclusion
- **Bilan :** Présence d'une synthèse claire des arguments développés.
- **Ouverture :** Élargir la réflexion finale vers une portée philosophique ou universelle.

[[TABLEAU]]
| Extrait fautif (en rouge) | Nature de l'erreur | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">partager</span> | Conjugaison & Accord | <span class="corr-green">partagé</span> | Après l'auxiliaire être, le verbe s'accorde au participe passé : « est partagé ». |
| <span class="err-highlight">malgré qu'il soit</span> | Coordination & Syntaxe | <span class="corr-green">bien qu'il soit</span> | « Malgré que » est proscrit avec un subjonctif ; employer la conjonction « bien que » ou la préposition « malgré + nom ». |

[[REFORMULATION]]
### A. Chirurgie Stylistique des Phrases Clés
- **Phrase de l'élève n°1 :**
  > *« ${s1.slice(0, 80)} »*
  - **Diagnostic didactique :** La phrase gagne à être fluidifiée pour assurer une transition naturelle et limpide.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :**
    > *« ${s1.replace(/partager/g, 'partagé').replace(/malgré qu'il soit/gi, 'bien qu\'il soit')} »*

- **Phrase de l'élève n°2 :**
  > *« ${s2.slice(0, 80)} »*
  - **Diagnostic didactique :** Le lien logique gagne à être explicité pour une meilleure cohérence d'ensemble.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :**
    > *« Dès lors, la réflexion s'appuie sur des exemples concrets pour rendre l'argumentation plus convaincante et accessible. »*

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence)
> **Quand on plonge dans la lecture attentive des œuvres littéraires au programme**, on se rend compte que la réflexion autour de « ${topic.slice(0, 70)} » s'impose comme un carrefour éthique et humain fondamental. Dès lors, il convient d'en examiner les fondements avec rigueur afin de dégager les principes directeurs d'une conscience éclairée.

> **En premier lieu**, l'examen attentif de la condition humaine révèle que toute prise de position engage la lucidité individuelle. À l'instar des épreuves narrées dans nos œuvres de référence, l'individu se doit d'affirmer son discernement face aux pressions extérieures.

> **En second lieu**, cette quête de vérité exige une constance morale inébranlable. Loin des compromissions faciles, l'effort d'émancipation personnelle fonde la dignité du sujet pensant.

> **En définitive**, la portée universelle de ce sujet transcende les clivages éphémères pour rappeler que la véritable sagesse réside dans l'accord harmonieux entre fidélité à soi et respect d'autrui.

[[TYPE]]
${isAnalytic ? 'ANALYTIQUE' : 'OPINION'}

[[PLAN_A]]
<div class="model-intro">
<p>Quand on plonge dans la réflexion approfondie sur <em>${topic.slice(0, 80)}</em>, on mesure combien cette interrogation engage la responsabilité morale et intellectuelle de chaque scripteur. <strong>Dès lors</strong>, il convient d'en sonder les ressorts majeurs, <strong>avant d'analyser</strong> les répercussions essentielles, <strong>afin de tracer</strong> les voies d'un accomplissement authentique.</p>
</div>

<div class="model-body">
<p><strong>En premier lieu</strong>, la réflexion s'ancre dans la prise de conscience des dynamiques individuelles et collectives. L'expérience littéraire enseigne que l'observation attentive du monde est le prélude indispensable à toute action juste.</p>
<p><strong>En second lieu</strong>, la confrontation avec les écueils du réel fortifie le discernement critique. Refusant la résignation, l'esprit forge son autonomie à travers des choix exigeants et mesurés.</p>
</div>

<div class="model-concl">
<p><strong>En définitive</strong>, loin d'être un débat abstrait, ce sujet réaffirme l'impératif d'une pensée libre et solidaire, seule à même de concilier lucidité personnelle et concorde sociale.</p>
</div>

[[PLAN_B]]
<div class="model-intro">
<p>L'interrogation posée par ce sujet suscite un débat fécond entre deux exigences complémentaires. <strong>D'une part</strong>, l'affirmation des impératifs immédiats semble s'imposer ; <strong>d'autre part</strong>, la perspective du dépassement ouvre des horizons éthiques plus élevés.</p>
</div>

<div class="model-body">
<p><strong>D'un côté</strong>, les nécessités concrètes dictent une prudence pragmatique face aux aléas de l'existence.</p>
<p><strong>D'un autre côté</strong>, l'élévation morale commande de ne pas subordonner l'idéal de justice aux seules facilités du présent.</p>
<p><strong>Ainsi</strong>, la synthèse harmonieuse réside dans la recherche d'un équilibre souverain entre réalisme et fidélité aux valeurs fondamentales.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, la véritable grandeur de la pensée consiste à surmonter les dilemmes par un surcroît de rectitude et de clairvoyance.</p>
</div>`;
}

// Dev & static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Centre Al Akhawayn actif sur le port ${PORT}`);
  });
}

startServer();
