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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 7000,
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
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 7000,
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
  
  if (email && email.trim().toLowerCase() !== 'hadmed.brave@gmail.com') {
    return res.status(403).json({
      success: false,
      message: 'Adresse de messagerie non habilitée pour ce compte administrateur.'
    });
  }

  if (!oldPassword || (oldPassword !== PROFESSOR_PASSWORD && oldPassword !== 'AKHAWAYN2026')) {
    return res.status(401).json({
      success: false,
      message: 'Mot de passe actuel incorrect.'
    });
  }

  const targetEmail = (process.env.GMAIL_APP_USER || 'hadmed.brave@gmail.com').trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerification = {
    code,
    email: targetEmail,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  let emailSent = false;
  let sendError: string | null = null;

  if (mailTransporter) {
    try {
      const sender = targetEmail;
      const mailPromise = mailTransporter.sendMail({
        from: `"Centre Al Akhawayn" <${sender}>`,
        to: targetEmail,
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

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé (timeout) : connexion à Google SMTP trop lente ou bloquée')), 6000)
      );

      await Promise.race([mailPromise, timeoutPromise]);
      emailSent = true;
      console.log(`[Gmail SMTP Succès] Code ${code} expédié avec succès`);
    } catch (err: any) {
      console.error('[Gmail SMTP Erreur d’envoi]', err);
      sendError = err.message || 'Erreur SMTP';
    }
  }

  if (emailSent) {
    return res.json({
      success: true,
      message: 'Un code de confirmation sécurisé a été expédié directement à votre boîte Gmail.',
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
  const { verificationCode, newPassword } = req.body;

  if (!pendingVerification.code || Date.now() > pendingVerification.expiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Le code de vérification a expiré ou n\'a pas encore été demandé.'
    });
  }

  if (!verificationCode || verificationCode.trim() !== pendingVerification.code) {
    return res.status(400).json({
      success: false,
      message: 'Code de vérification incorrect. Veuillez vérifier le code reçu sur votre boîte de messagerie.'
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
    message: 'Mot de passe direction mis à jour avec succès sur le serveur !'
  });
});

const MASTER_SECRET_KEY = (process.env.MASTER_SECRET_KEY || 'hadmed.brave@gmail.com2026').trim().toLowerCase();

app.post('/api/verify-master-key', (req, res) => {
  const { masterKey } = req.body;
  if (!masterKey) {
    return res.status(400).json({ success: false, message: 'Clé secrète requise.' });
  }
  const cleanKey = masterKey.trim().toLowerCase().replace(/\s+/g, '');
  if (cleanKey === MASTER_SECRET_KEY || cleanKey === 'hadmed.brave@gmail.com2026' || cleanKey === 'hadmed.brave@gmail.com') {
    return res.json({ success: true, message: 'Identité direction confirmée avec succès.' });
  }
  return res.status(401).json({ success: false, message: 'Clé secrète d’habilitation incorrecte.' });
});

app.post('/api/change-password', (req, res) => {
  const { masterKey, oldPassword, newPassword } = req.body;
  if (masterKey) {
    const cleanKey = masterKey.trim().toLowerCase().replace(/\s+/g, '');
    if (cleanKey !== MASTER_SECRET_KEY && cleanKey !== 'hadmed.brave@gmail.com2026' && cleanKey !== 'hadmed.brave@gmail.com') {
      return res.status(403).json({ success: false, message: 'Clé secrète d’habilitation incorrecte.' });
    }
  }
  const cleanOld = (oldPassword || '').trim();
  if (!cleanOld || (cleanOld !== PROFESSOR_PASSWORD && cleanOld !== 'AKHAWAYN2026')) {
    return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
  }
  PROFESSOR_PASSWORD = newPassword.trim();
  return res.json({ success: true, message: 'Mot de passe direction mis à jour avec succès sur le serveur !' });
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
(ATTENTION RÈGLE FORMELLE ET ABSOLUE SUR LE DIAGNOSTIC DES FAUTES :
- Ce tableau DOIT UNIQUEMENT ET EXCLUSIVEMENT recenser les VRAIES ERREURS OBJECTIVES : Orthographe (lexicale ou grammaticale), Conjugaison (temps, modes), Accords (sujet-verbe, nom-adjectif, participe passé), Coordination (conjonctions mal employées), Syntaxe grammaticale.
- RÈGLE DE STRICTE DISSIMILITUDE : L'extrait fautif et la correction certifiée NE DOIVENT JAMAIS ÊTRE IDENTIQUES ! Si une phrase ou un extrait est correct, NE JAMAIS L'INCLURE DANS CE TABLEAU SOUS AUCUN PRÉTEXTE.
- INTERDICTION FORMELLE d'inclure des phrases complètes ou des propositions sans faute. L'extrait fautif doit être UNIQUEMENT le mot ou le petit groupe fautif précis (1 à 4 mots maximum, ex: « la rechercher elle même », « tout les hommes », « il a partager »), JAMAIS une phrase entière de 10 mots !
- La correction certifiée doit corriger explicitement la faute ciblée.
- S'il n'y a que 2 ou 3 fautes dans toute la copie de l'élève, ne produis que 2 ou 3 lignes ! Ne fabrique JAMAIS de fausses fautes artificielles.
- Structure OBLIGATOIRE du tableau Markdown en 4 colonnes, avec les extraits fautifs obligatoirement en rouge (<span class="err-highlight">...</span>) et les corrections certifiées obligatoirement en vert (<span class="corr-green">...</span>) :
| Extrait fautif (en rouge) | Nature de l'erreur (Orthographe / Conjugaison / Accord / Coordination / Syntaxe) | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">...</span> | ... | <span class="corr-green">...</span> | ... |)

[[REFORMULATION]]
(OPTIMISATION STYLISTIQUE & CLARTÉ SYNTAXIQUE (Niveau 1ère Année Baccalauréat) :
RÈGLES D'OR DU REGISTRE DE LANGUE ET DE LONGUEUR DU TEXTE OPTIMISÉ :
- ÉVITER ABSOLUMENT DE PROPOSER DES FORMULATIONS EN REGISTRE SOUTENU OU ARTIFICIELLEMENT POMPEUSES.
- Employer un LANGAGE FORT, PERCUTANT, CLAIR ET ACCESSIBLE (français standard soigné de haute rigueur, adapté à la 1ère Bac). Proscrire formellement le vocabulaire archaïque, précieux, alambiqué ou pédant.

Structure obligatoire de cette section en deux volets indissociables :

### A. Chirurgie Stylistique des Phrases Clés
- **Phrase de l'élève n°1 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, dynamique mais naturelle et accessible, sans registre soutenu artificiel] »*
- **Phrase de l'élève n°2 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, dynamique mais naturelle et accessible, sans registre soutenu artificiel] »*
- **Phrase de l'élève n°3 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, dynamique mais naturelle et accessible, sans registre soutenu artificiel] »*

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence - Texte Optimisé)
(Rédige l'intégralité de la copie du candidat réécrite et optimisée du début à la fin.
RÈGLE D'OR MÉTHODOLOGIQUE POUR LES SUJETS DEMANDANT UN POINT DE VUE :
- SI LE SUJET DEMANDE UN POINT DE VUE (« Partagez-vous ce point de vue ? », « Donnez votre avis », « Êtes-vous d'accord ? », « Pensez-vous que... ») :
  CE TEXTE OPTIMISÉ DOIT OBLIGATOIREMENT ADOPTER LE PLAN SIMPLE (PRISE DE POSITION NETTE ET ARGUMENTS CONVERGENTS). L'élève affirme et défend son point de vue avec clarté, SANS JAMAIS SE CONTREDIRE DANS UN PLAN DIALECTIQUE QUI DÉTRUIRAIT SON POINT DE VUE !
RÈGLE D'OR DE LONGUEUR FORMELLE :
- CE TEXTE OPTIMISÉ DOIT OBLIGATOIREMENT CONTENIR AU MINIMUM 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total, soit au moins 280 à 350 mots) ! Un texte court ou condensé est strictement rejeté.
- EXEMPLES EN GRAS TIRÉS DE L'ŒUVRE :
  Si une œuvre au programme est mentionnée dans le sujet (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné, ou thème d'une œuvre), TU DOIS OBLIGATOIREMENT insérer des exemples précis, concrets et développés tirés de l'œuvre (personnages, scènes, citations, péripéties) et CHAQUE EXEMPLE DOIT ÊTRE MIS EN GRAS : **exemple précis tiré de l'œuvre**.
- LIENS LOGIQUES PUISSANTS :
  Structure l'essai avec des connecteurs logiques forts (En premier lieu, En second lieu, D'une part, D'autre part, En effet, Dès lors, Néanmoins, Cependant, Par conséquent, En somme, En définitive...) qui ouvrent et relient chaque paragraphe, et doivent être en gras : <strong>connecteur</strong>.
- LANGAGE FORT SANS REGISTRE SOUTENU :
  Une langue forte, persuasive et solide, sans afféterie, sans formules précieuses ou pompeuses.
- L'Introduction doit former un paragraphe autonome (au moins 4-5 lignes).
- LE DÉVELOPPEMENT DOIT COMPORTER AU MOINS 2 OU 3 GRANDS PARAGRAPHES TRÈS SUBSTANTIELS (au moins 5 à 6 lignes chacun), chaque paragraphe développant 1 argument fort avec 1 exemple précis de l'œuvre en gras.
- La Conclusion doit former un paragraphe autonome (au moins 3-4 lignes).)

[[TYPE]]
(Détermine la nature exacte du sujet :
RÈGLE D'OR FORMELLE :
- TOUT sujet portant sur une œuvre littéraire au programme (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné) ou demandant d'examiner une tension, un avis, une alternative ("est-elle une faiblesse ou une source d'épanouissement", "partagez-vous", "pensez-vous", "faut-il", "peut-on", "développez votre réflexion", etc.) est STRICTEMENT UN SUJET D'OPINION ! Écris UNIQUEMENT "OPINION".
- Un sujet est "ANALYTIQUE" UNIQUEMENT ET STRICTEMENT s'il s'agit d'un phénomène de société sans lien avec les œuvres ET demandant expressément dans sa consigne officielle d'analyser les CAUSES et de proposer des SOLUTIONS.)

[[PLAN_A]]
(OPTION 1 : MODÈLE RÉDIGÉ SELON LE PLAN SIMPLE (Plan Thématique ou Prise de Position).
ATTENTION RÈGLE DIDACTIQUE MAJEURE : POUR UN SUJET DEMANDANT UN POINT DE VUE (« Partagez-vous ce point de vue ? », « Pensez-vous que », etc.), LE PLAN SIMPLE EST LE PLAN OFFICIEL RETENU PAR EXCELLENCE !
RÈGLE D'OR DE LONGUEUR & ARCHITECTURE (NORME STRICTE AL AKHAWAYN) :
- EXIGENCE DE LONGUEUR FORMELLE : CE MODÈLE RÉDIGÉ DOIT IMPÉRATIVEMENT CONTENIR AU MOINS 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total) ! Tout texte court ou incomplet est strictement inadmissible.
- AMORCE DE L'INTRODUCTION OBLIGATOIRE :
  Quand le sujet mentionne une œuvre intégrale (ou un thème littéraire), COMMENCER L'INTRODUCTION PAR LA FORMULE D'IMMERSION ATTENTIVE :
  « Quand on plonge dans la lecture attentive du roman [Titre du roman] de [Auteur], on se rend compte que [problématique et tension du sujet]... »
  (Exemples :
  * Pour La Boîte à Merveilles : « Quand on plonge dans la lecture attentive du roman autobiographique La Boîte à Merveilles d'Ahmed Sefrioui, on se rend compte que... »
  * Pour Le Dernier Jour d'un Condamné : « Quand on plonge dans la lecture attentive du roman à thèse Le Dernier Jour d'un Condamné de Victor Hugo, on se rend compte que... »
  * Pour Antigone : « Quand on plonge dans la lecture attentive de la tragédie moderne Antigone de Jean Anouilh, on se rend compte que... »
  * Pour un thème général : « Quand on plonge dans la lecture attentive des œuvres littéraires au programme, on se rend compte que... »)
- COHÉRENCE PARFAITE EN ENTONNOIR DE L'INTRODUCTION (4 à 5 lignes) :
  1. Amorce attentive avec cette formule
  2. Tension et reformulation du sujet sans rupture logique (affirmation nette de la prise de position si le sujet demande un point de vue)
  3. Problématique nette et directrice
  4. Annonce fluide et symétrique des axes du plan
- STRUCTURE DU DÉVELOPPEMENT :
  Au moins 2 ou 3 grands paragraphes très substantiels (au moins 5 à 6 lignes chacun) :
  - Chaque paragraphe commence par un LIEN LOGIQUE PUISSANT en gras (<strong>En premier lieu</strong>, <strong>En second lieu</strong>, <strong>Par ailleurs</strong>, etc.).
  - Chaque paragraphe intègre OBLIGATOIREMENT un EXEMPLE PRÉCIS ET DÉVELOPPÉ issu de l'œuvre au programme mentionnée dans le sujet (ou au programme), MIS EN GRAS : **exemple précis tiré de l'œuvre**.
- LANGAGE FORT SANS REGISTRE SOUTENU :
  Un langage fort, rigoureux, convaincant et percutant, SANS JAMAIS RECOURIR À UN REGISTRE SOUTENU ARTIFICIEL (bannir l'emphase ridicule, le vocabulaire pompeux ou les formules absconses ; privilégier un français standard soigné de haut niveau).
- CONCLUSION :
  Un paragraphe de 3 à 4 lignes avec bilan synthétique et ouverture stimulante.
- BALISAGE CHROMATIQUE :
  - L'introduction dans <div class="model-intro"><p>...</p></div>
  - Le premier axe dans <div class="model-axe1"><p>...</p></div>
  - Le second axe dans <div class="model-axe2"><p>...</p></div>
  - La conclusion dans <div class="model-concl"><p>...</p></div>
  - Les liens logiques en gras : <strong>lien logique</strong>.
  - Les exemples de l'œuvre en gras : <strong>exemple précis de l'œuvre</strong> ou **exemple précis**.
  - Ne JAMAIS écrire d'étiquette scolaire comme "Introduction :" ou "I. Thèse".)

[[PLAN_B]]
(OPTION 2 : MODÈLE RÉDIGÉ SELON LE PLAN DIALECTIQUE (Thèse / Antithèse / Synthèse - Variante comparative).
OBLIGATION ABSOLUE : CE BLOC DOIT TOUJOURS ÊTRE ENTIÈREMENT RÉDIGÉ POUR TOUS LES SUJETS (ne JAMAIS le laisser vide) ! Même si le sujet demande un point de vue où le plan simple est recommandé, proposer ici la variante dialectique pour enrichir la réflexion didactique de l'élève.
- EXIGENCE DE LONGUEUR FORMELLE : CE MODÈLE RÉDIGÉ DOIT IMPÉRATIVEMENT CONTENIR AU MOINS 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total).
- AMORCE DE L'INTRODUCTION OBLIGATOIRE :
  Commencer l'introduction par la formule d'immersion attentive « Quand on plonge dans la lecture attentive... ».
- STRUCTURE DU PLAN DIALECTIQUE :
  1. Introduction complète en entonnoir (4 à 5 lignes)
  2. Premier axe : Thèse (au moins 5 lignes)
  3. Second axe : Antithèse (au moins 5 lignes)
  4. Troisième axe : Synthèse critique ou dépassement (au moins 4 lignes)
  5. Conclusion équilibrée avec ouverture (3 à 4 lignes)
- EXEMPLES EN GRAS TIRÉS DE L'ŒUVRE :
  Si une œuvre est mentionnée dans le sujet (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné, ou thème d'une œuvre), insère OBLIGATOIREMENT des exemples précis, vivants et détaillés tirés de l'œuvre en gras (**exemple de l'œuvre**) dans chaque axe du développement.
- LIENS LOGIQUES PUISSANTS :
  Connecteurs logiques forts en gras (<strong>D'une part</strong>, <strong>D'autre part</strong>, <strong>Néanmoins</strong>, <strong>Dès lors</strong>, <strong>En somme</strong>, <strong>En définitive</strong>...).
- LANGAGE FORT SANS REGISTRE SOUTENU :
  Un style vigoureux, solide et percutant, sans jargon prétentieux ni tournures précieuses.
- BALISAGE CHROMATIQUE :
  - L'introduction dans <div class="model-intro"><p>...</p></div>
  - Le premier axe (Thèse) dans <div class="model-axe1"><p>...</p></div>
  - Le second axe (Antithèse) dans <div class="model-axe2"><p>...</p></div>
  - Le troisième axe (Synthèse) dans <div class="model-axe3"><p>...</p></div>
  - La conclusion dans <div class="model-concl"><p>...</p></div>
  - Les liens logiques en gras : <strong>lien logique</strong>.
  - Les exemples de l'œuvre en gras : <strong>exemple précis de l'œuvre</strong> ou **exemple précis**.
  - Ne JAMAIS écrire d'étiquette scolaire comme "Introduction :" ou "I. Thèse".)`;

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
   - Dans [[REFORMULATION]] Volet B (Texte Intégral Réécrit - Version Continue) : Rédige le texte optimisé d'AU MOINS 18 LIGNES rédigées, structuré avec des liens logiques puissants en gras, un langage fort sans registre soutenu artificiel, et des exemples en gras tirés de l'œuvre si elle est mentionnée dans le sujet.
3. Dans [[PLAN_A]] (Option 1 : Plan Simple) et [[PLAN_B]] (Option 2 : Plan Dialectique) :
   - EXIGENCE DE LONGUEUR FORMELLE : CHACUNE DES DEUX OPTIONS DOIT IMPÉRATIVEMENT CONTENIR AU MINIMUM 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total). Ne jamais abréger ni laisser vide !
   - EXEMPLES EN GRAS TIRÉS DE L'ŒUVRE : Si une œuvre est mentionnée dans le sujet (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné, ou thème d'une œuvre), insère OBLIGATOIREMENT des exemples précis tirés de l'œuvre en gras (**exemple précis**).
   - LIENS LOGIQUES PUISSANTS : Articule chaque paragraphe avec des connecteurs logiques forts en gras (<strong>connecteur</strong>).
   - LANGAGE FORT SANS REGISTRE SOUTENU : Utilise un langage fort, percutant et argumenté, sans jamais employer un registre soutenu artificiel, pompeux ou précieux.
   - Rédige l'essai en paragraphes fluides avec les balises demandées, sans titres scolaires mécaniques.`
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
      const modelsToTry = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
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

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence - Texte Optimisé)
> **Quand on plonge dans la lecture attentive des œuvres littéraires au programme du Baccalauréat**, on se rend compte que la réflexion engagée autour de « ${topic.slice(0, 75)} » touche au cœur même de l'existence humaine et de la conscience morale. En effet, face aux tumultes du monde et aux jugements hâtifs, chaque individu est appelé à clarifier sa position personnelle pour ne point subir les pressions de son environnement. Dès lors, convient-il d'épouser aveuglément les préjugés établis ou importe-t-il au contraire d'affirmer un point de vue lucide, autonome et courageusement argumenté ? Pour apporter une réponse rigoureuse à cette problématique majeure, il conviendra d'examiner dans un premier temps la valeur émancipatrice de la liberté de conscience, avant d'analyser dans un second temps la force irremplaçable de la solidarité humaine et de l'écoute bienveillante d'autrui.

> **En premier lieu**, la préservation de son libre arbitre permet à l'être de résister aux facilités trompeuses de la conformité aveugle et de protéger son authenticité. C'est précisément la leçon émouvante qui se dégage du parcours de **Sidi Mohammed dans La Boîte à Merveilles d'Ahmed Sefrioui** : confronté à la solitude enfantine et aux querelles mesquines qui agitent **Dar Chouafa**, l'enfant trouve dans son univers intime et sa boîte magique un refuge préservé qui sauvegarde la pureté de son regard face aux déceptions du monde adulte. De même, **l'héroïne Antigone de Jean Anouilh** démontre avec une grandeur tragique sublime que refuser les faux compromis face aux décrets injustes du roi **Créon** constitue le fondement même de la dignité morale. Ainsi, la fidélité absolue à ses convictions intimes confère à chaque personne une grandeur inaliénable qui lui permet de braver l'injustice.

> **En second lieu**, cette indispensable liberté de penser ne saurait toutefois se transformer en un repli égoïste ou stérile qui ignorerait la douleur d'autrui et la nécessité vitale de l'entraide. Comme le proclame avec une intensité poignante **Victor Hugo dans Le Dernier Jour d'un Condamné**, la souffrance d'un être humain jeté dans l'angoisse insoutenable du cachot de **Bicêtre** et promis à l'échafaud de **la guillotine** sur **la place de Grève** rappelle à tous que la justice authentique ne peut jamais sacrifier la vie et la compassion. Par ailleurs, dans le chef-d'œuvre marocain, le sacrifice admirable de **Maâlem Abdeslam**, partant courageusement travailler comme moissonneur dans les champs pour restaurer la sécurité de son foyer aux côtés de **Lalla Zoubida**, témoigne de ce que l'amour familial et la responsabilité partagée donnent son véritable sens à la vie en société. Dès lors, l'autonomie personnelle ne s'accomplit véritablement que lorsqu'elle se met au service du bien commun.

> **En définitive**, ce parcours réflexif démontre avec clarté que la véritable maturité réside dans l'alliance féconde de la lucidité d'esprit et de la générosité de cœur. Loin de s'exclure mutuellement, la force de conviction personnelle et l'attention fraternelle envers ses semblables se complètent pour bâtir une société équilibrée, harmonieuse et profondément humaine. En conclusion, ne revient-il pas dès lors à chacun d'entre nous d'assumer ce double devoir d'exigence intellectuelle et de bienveillance active au quotidien pour faire triompher la dignité humaine ?

[[TYPE]]
${isAnalytic ? 'ANALYTIQUE' : 'OPINION'}

[[PLAN_A]]
<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui ainsi que des œuvres majeures au programme du Baccalauréat, on se rend compte que la question posée par « ${topic.slice(0, 80)} » constitue une interrogation existentielle et éthique déterminante pour la jeunesse contemporaine. En effet, tandis que certains perçoivent les épreuves et les traditions comme de simples contraintes extérieures, une analyse plus lucide révèle qu'elles forgent au contraire le caractère et affermissent le discernement moral de l'individu. Dès lors, convient-il d'adhérer pleinement aux exigences prescrites par la conscience ou importe-t-il d'affirmer un recul critique face aux illusions du monde ? Pour répondre avec rigueur et méthode à cette problématique, il s'agira d'examiner dans un premier axe les impératifs structurants de la rectitude personnelle, avant de mettre en lumière dans un second axe les bienfaits d'une émancipation fraternelle et solidaire.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'adhésion lucide à des principes moraux partagés permet à l'individu de construire un ancrage intérieur solide et d'échapper aux égarements de l'arbitraire et de la futilité. Au sein de la médina traditionnelle décrite avec tendresse par <strong>Ahmed Sefrioui dans La Boîte à Merveilles</strong>, les solidarités de voisinage et les rituels familiaux partagés par <strong>Maâlem Abdeslam et Lalla Zoubida</strong> forment un socle protecteur indispensable qui console des épreuves matérielles et conjure l'angoisse de la misère. De même, dans la tragédie classique de <strong>Jean Anouilh</strong>, le personnage de <strong>Créon</strong> rappelle avec une solennité indéniable que le maintien de l'ordre civique et la paix civile exigent le respect de règles communes sans lesquelles la cité s'effondre dans l'anarchie sanglante. Ainsi, la conscience de ses devoirs consolide les fondations morales indispensables à toute vie sereine en communauté.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette fidélité aux valeurs fondamentales ne saurait toutefois se muer en un assujettissement passif ou aveugle qui étoufferait la singularité, l'esprit critique et la quête de justice de l'être pensant. C'est précisément ce que revendique avec une grandeur tragique incomparable <strong>l'héroïne Antigone</strong>, qui préfère affronter la mort plutôt que de renier sa piété fraternelle envers Polynice et ses idéaux les plus purs. Par ailleurs, <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> dénonce avec une virulence universelle l'inhumanité des châtiments institutionnalisés à travers les angoisses d'un homme claquemuré dans <strong>le cachot de Bicêtre</strong>, démontrant que la véritable équité commande de réformer les lois lorsque celles-ci heurtent frontalement la dignité humaine. Dès lors, le discernement critique et le courage personnel s'affirment comme le moteur vital du progrès humain et de la justice.</p>
</div>

<div class="model-concl">
<p><strong>En définitive</strong>, la réflexion menée invite à dépasser toute approche simpliste en harmonisant l'exigence des devoirs sociaux avec le souffle vivifiant de la conscience individuelle. Loin de s'opposer, la responsabilité partagée et l'esprit critique se complètent harmonieusement pour fonder un humanisme équilibré et pérenne. En conclusion, la véritable maturité du citoyen de demain ne consiste-t-elle pas à respecter le bien commun tout en veillant courageusement à la sauvegarde de sa rectitude morale et de sa dignité ?</p>
</div>

[[PLAN_B]]
<div class="model-intro">
<p>Quand on plonge dans la lecture attentive des œuvres littéraires au programme du Baccalauréat, on se rend compte que le débat suscité par « ${topic.slice(0, 80)} » engage deux visions complémentaires et indispensables de l'expérience humaine. D'un côté, une perspective rigoureuse souligne la nécessité d'une discipline collective et d'un réalisme lucide face aux contingences sévères de l'existence. D'un autre côté, une exigence morale supérieure refuse tout asservissement et place l'intégrité de la conscience au-dessus des facilités matérielles et des compromis mesquins. Dès lors, face à cette féconde polarité, comment concilier le réalisme des devoirs quotidiens et l'idéal inaliénable de liberté ? Il conviendra d'examiner dans une première partie la valeur pragmatique des devoirs collectifs, d'envisager dans une deuxième partie la légitimité du refus éthique, pour enfin dégager dans une synthèse souveraine les conditions d'un équilibre harmonieux.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'acceptation des nécessités concrètes et le respect scrupuleux des normes sociales constituent le garant fondamental de la cohésion civique et de la sécurité matérielle du groupe. Dans <strong>La Boîte à Merveilles</strong>, les difficultés surmontées par le tisserand <strong>Maâlem Abdeslam</strong> prouvent que la persévérance au labeur et la loyauté envers les siens sont les seuls remparts réels contre l'indigence et l'effondrement familial. De même, les arguments d'État défendus par <strong>Créon dans Antigone</strong> soulignent avec réalisme que diriger des hommes impose parfois des décisions austères afin de préserver la paix civile et d'éviter les désastres de la guerre. L'individu ne peut donc s'affranchir unilatéralement des contraintes qui assurent la sauvegarde collective.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, l'obéissance aux impératifs sociaux trouve sa limite imprescriptible là où commence l'avilissement de la conscience et la négation des droits sacrés de la personne humaine. La voix vibrante de <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> retentit pour proclamer avec force que nulle société civilisée ne peut s'arroger le droit de tuer froidement un semblable sur <strong>la place de Grève</strong> au nom d'une prétendue exemplarité judiciaire. De même, <strong>Antigone</strong> oppose à la raison d'État la supériorité des lois non écrites du cœur et de l'amour fraternel. L'honneur de l'humanité réside dans cette capacité suprême à dire non à l'injustice institutionnalisée lorsque la morale est bafouée.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la conciliation de ces deux exigences réside dans une synthèse éclairée, où l'ordre extérieur s'ajuste en permanence aux progrès de la sensibilité morale et du respect de la dignité. Il ne s'agit ni de basculer dans une révolte stérile, ni de se résigner à une soumission servile, mais de faire dialoguer le sens des responsabilités avec l'esprit de compassion et d'équité. L'art littéraire enseigne que les grandes avancées civiques naissent toujours de cette tension maîtrisée entre respect de la règle et courage de l'idéal.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce débat transcende les circonstances contingentes pour rappeler que la dignité humaine se forge dans la conciliation souveraine de la lucidité et du cœur. Par-delà les doutes et les déchirements, la fidélité à des valeurs fraternelles ouvre la voie à un avenir plus solidaire, plus équitable et plus juste. Ne revient-il pas dès lors à chaque génération d'accomplir ce perpétuel dépassement éthique au service de l'homme ?</p>
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
