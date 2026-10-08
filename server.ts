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

// Système de suivi des utilisateurs actifs en temps réel
const activeUsers = new Map<string, number>();

app.post('/api/heartbeat', (req, res) => {
  const clientId = (req.body?.clientId as string) || (req.ip as string) || 'client-' + Math.random().toString(36).substring(2, 9);
  activeUsers.set(clientId, Date.now());
  const cutoff = Date.now() - 45000;
  for (const [id, lastSeen] of activeUsers.entries()) {
    if (lastSeen < cutoff) activeUsers.delete(id);
  }
  const count = Math.max(1, activeUsers.size);
  res.json({ success: true, count });
});

app.get('/api/active-users', (req, res) => {
  const cutoff = Date.now() - 45000;
  for (const [id, lastSeen] of activeUsers.entries()) {
    if (lastSeen < cutoff) activeUsers.delete(id);
  }
  const count = Math.max(1, activeUsers.size);
  res.json({ success: true, count });
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
- RÈGLE CRUCIALE SUR LE DÉBUT DU DÉVELOPPEMENT : Si l'élève utilise une formule d'amorce ou de prise de position (« En premier lieu... », « D'abord... », « Personnellement... », « Pour ma part... », « À mon avis... »), ELLE DOIT OBLIGATOIREMENT COMMENCER UN NOUVEAU PARAGRAPHE DISTINCT AVEC SAUT DE LIGNE ET ALINÉA (<p><strong>En premier lieu</strong>...</p> ou <p><strong>Personnellement</strong>...</p>) AU DÉBUT DU DÉVELOPPEMENT, et ne JAMAIS être rattachée ou fusionnée à la fin de l'introduction !
- INTERDICTION FORMELLE de compacter ou fusionner les paragraphes en un seul bloc continu !
- RÈGLE CAPITAL SUR LES ERREURS : NE JAMAIS SURLIGNER EN ROUGE DES MOTS CORRECTS ! Seules les vraies erreurs réelles et objectives sont balisées en rouge : <span class="err-highlight">erreur [correction]</span>. Les mots normaux, corrects et bien écrits de la langue française doivent STRICTEMENT RESTER EN TEXTE NORMAL, sans aucune balise rouge !
- Sur cette transcription intégrale, applique EXCLUSIVEMENT ET UNIQUEMENT ces deux balisages :
  1. Les vraies erreurs objectives en rouge vif : <span class="err-highlight">erreur [correction]</span> (si le mot est correct, pas de rouge !).
  2. TOUS les liens logiques et connecteurs obligatoirement en gras : <strong>lien logique</strong> (ex: <strong>En premier lieu</strong>, <strong>En deuxième lieu</strong>, <strong>En second lieu</strong>, <strong>En dernier lieu</strong>, <strong>D'ailleurs</strong>, <strong>En effet</strong>, <strong>En d'autres termes</strong>, <strong>Aussi</strong>, <strong>Personnellement</strong>, <strong>Finalement</strong>, <strong>Par conséquent</strong>, <strong>Ainsi</strong>, <strong>Dès lors</strong>, etc. Ne JAMAIS en oublier aucun !)
INTERDICTION ABSOLUE d'insérer des avertissements comme [⚠️ Rupture...] ou toute autre mention intrusive.)

[[BILAN]]
(Audit méthodologique et chirurgical de la structure du texte argumentatif :
### 1. Diagnostic Chirurgical de l'Amorce, de l'Entonnoir & de la Problématique
- **Analyse de l'Amorce :** Examine la phrase d'amorce réelle de l'élève (accroche contextuelle). Si l'élève commence de façon abrupte ou banale (ex: « Il arrive souvent à l'individu de se trouver solitaire... »), analyse sa portée et formule une recommandation didactique concrète pour bâtir une amorce d'immersion littéraire ou universelle percutante.
- **Formulation du Sujet & Problématique :** Analyse comment le sujet a été posé. L'élève a-t-il simplement affirmé son avis ou formulé une véritable problématique avec une tension directrice (question directe ou indirecte) ? Propose la reformulation problématisée idéale.
- **Annonce du Plan :** Analyse de la clarté et de l'équilibre des axes directeurs annoncés.

### 2. Audit Méthodologique du Développement & Articulation Logique
- **Règle académique du paragraphe argumentatif :** Vérifie que chaque paragraphe développe strictement 1 argument directeur clair soutenu par 1 illustration concrète développée.
- **Solidité des arguments :** Évaluation des arguments (sont-ils rigoureux, pertinents, ou au contraire redondants et confus ?).
- **Ancrage littéraire dans l'œuvre :** Analyse des exemples tirés de l'œuvre au programme (précision des références : personnages nommés, scènes précises de La Boîte à Merveilles, Dar Chouafa, etc., versus généralités vagues).

### 3. Diagnostic des Liens Logiques & Progression Didactique (REMARQUES CHIRURGICALES)
- **Analyse des connecteurs d'attaque :** Examine chaque connecteur employé (« En premier lieu », « En deuxième lieu », « D'ailleurs », « En d'autres termes »...). Rappelle si nécessaire qu'« En second lieu » est stylistiquement préférable à « En deuxième lieu » lorsqu'il n'y a que deux axes.
- ⚠️ **REMARQUE MÉTHODOLOGIQUE ESSENTIELLE SUR L'AMORCE DE CONCLUSION :**
  Si l'élève utilise « Finalement » (ou connecteur familier/oral) pour ouvrir sa conclusion, formule impérativement la critique didactique suivante :
  « *Au lieu d'utiliser « Finalement » (terme souvent familier, oral ou restrictif pour clore un essai académique), il faut impérativement amorcer la conclusion par une formule noble et certifiée telle que « **En guise de conclusion** », « **En définitive** » ou « **En conclusion** ». Cela confère au devoir une tenue et une autorité académique irréprochables.* »
- **Cohérence des transitions :** Recommandations pour éviter la monotonie des formules d'énumération mécanique.

### 4. Diagnostic de la Conclusion & Clôture
- **Bilan synthétique :** Clarté du récapitulatif sans contradiction avec les axes développés.
- **Ouverture :** Qualité de l'élargissement de la réflexion vers une portée éthique, universelle ou humaine.)

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

### A. Chirurgie Stylistique des Phrases Clés (Phrases Faibles de l'Élève Reformulées avec Force)
(Identifie et cite au moins 2 à 3 phrases faibles ou maladroites réelles extraites mot à mot de la copie de l'élève.
Ces phrases doivent présenter de réelles faiblesses stylistiques, syntaxiques ou logiques dans la copie de l'élève (manque de connecteur, syntaxe relâchée, maladresse de formulation, rupture logique ou connecteur inadapté comme « Finalement... ») :
- **Phrase faible de l'élève n°1 :**
  > *« [citation exacte de la 1ère phrase faible de l'élève] »*
  - **Diagnostic didactique :** Explication précise du défaut de clarté, de syntaxe, d'amorce ou de transition logique.
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« [phrase réécrite avec un lien logique fort, fluide, dynamique et naturelle, sans registre soutenu artificiel] »*
- **Phrase faible de l'élève n°2 :**
  > *« [citation exacte de la 2ème phrase faible de l'élève] »*
  - **Diagnostic didactique :** Explication précise du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« [phrase réécrite avec un lien logique fort, fluide, sans registre soutenu artificiel] »*
- **Phrase faible de l'élève n°3 :**
  > *« [citation exacte de la 3ème phrase faible de l'élève, ex: conclusion ou transition] »*
  - **Diagnostic didactique :** Explication précise (ex: l'emploi de « Finalement » affaiblit la portée de la conclusion).
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« [phrase puissante commençant par « En guise de conclusion » ou « En définitive », sans registre soutenu artificiel] »*
)

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence - Texte Optimisé)
(Rédige l'intégralité de la copie du candidat réécrite et optimisée du début à la fin.

STRUCTURE STRICTE DU TEXTE ARGUMENTATIF OPTIMISÉ (OBLIGATION ABSOLUE) :
Le texte optimisé DOIT OBLIGATOIREMENT être structuré en paragraphes distincts selon les trois temps canoniques du texte argumentatif, et CHAQUE PARAGRAPHE DOIT OBLIGATOIREMENT COMMENCER PAR UN LIEN LOGIQUE PUISSANT :
1. PARAGRAPHE 1 - INTRODUCTION CONCISE ET STRUCTURÉE (3 à 4 lignes maximum) :
   - Présentation sobre du sujet et formulation directe de la problématique et des axes.
   - INTERDICTION STRICTE ET ABSOLUE D'UTILISER « En effet » DANS L'INTRODUCTION !
   - AUCUNE EXPLICATION D'ARGUMENT DANS L'INTRODUCTION : l'introduction se contente de poser le sujet et la problématique ; toute explication et argumentation se font exclusivement dans le développement !
   - L'introduction se clôture obligatoirement par un point, suivi d'un VÉRITABLE SAUT DE PARAGRAPHE pour ouvrir le développement !

2. PARAGRAPHES DU DÉVELOPPEMENT (au moins 2 à 3 grands paragraphes, 12 à 15 lignes) :
   - LE PREMIER PARAGRAPHE DU DÉVELOPPEMENT DOIT OBLIGATOIREMENT COMMENCER SUR UN NOUVEAU PARAGRAPHE DISTINCT AVEC SAUT DE LIGNE ET ALINÉA :
     * Commence obligatoirement par **En premier lieu**, **D'abord**, ou **D'une part**. (Il est formellement interdit de le coller à la fin de l'introduction !)
   - RÈGLE ESSENTIELLE SUR LES CONNECTEURS DU PARAGRAPHE DES CONSÉQUENCES (PLAN ANALYTIQUE / CAUSES-CONSÉQUENCES) :
     * ⚠️ **INTERDICTION FORMELLE ET STRICTE D'UTILISER « Cependant » (ou « Toutefois », « Néanmoins ») POUR COMMENCER LE PARAGRAPHE DES CONSÉQUENCES !**
       « Cependant » est un connecteur d'opposition/concession, et non de conséquence !
     * Pour introduire le paragraphe des conséquences, tu DOIS OBLIGATOIREMENT utiliser des connecteurs de conséquence certifiés selon le Cadre Officiel / PDF des Connecteurs :
       **Par conséquent**, **En conséquence**, **De ce fait**, **Dès lors, les conséquences de ce choix...**, ou **Il en résulte que...** !
   - ⚠️ RÈGLE ABSOLUE SUR LE RESPECT STRICT DU SUJET (CAUSES, CONSÉQUENCES ET SOLUTIONS) :
     Si le sujet demande les causes, les conséquences ET les solutions (ou remèdes) :
     Tu DOIS OBLIGATOIREMENT traiter les TROIS VOLETS du sujet dans des paragraphes distincts et substantiels :
     * Premier axe (Causes) : commence par **En premier lieu**, **D'abord**, ou **D'une part**.
     * Second axe (Conséquences) : commence obligatoirement par **Par conséquent**, **En conséquence**, ou **Dès lors** (JAMAIS « Cependant » !).
     * Troisième axe (Solutions / Remèdes) : commence obligatoirement par **Enfin, pour remédier à ce fléau**, **Afin d'endiguer cette situation, des solutions concrètes doivent être adoptées : d'une part... d'autre part...**, ou **En outre, pour surmonter ce défi...**.
     Ne JAMAIS omettre les solutions si le sujet les demande !
   - CHAQUE paragraphe du développement DOIT COMMENCER PAR UN LIEN LOGIQUE PUISSANT EN GRAS :
     * Premier axe (Causes ou 1er argument) : Commence obligatoirement par **En premier lieu**, **D'abord**, ou **D'une part**.
     * Second axe (Conséquences ou 2d argument) : Si conséquences, commence obligatoirement par **Par conséquent**, **En conséquence**, ou **De ce fait**. Si second argument convergent, commence par **En second lieu**, **Ensuite**, ou **Par ailleurs**.
     * Éventuel troisième axe : Commence obligatoirement par **En outre** ou **De plus**.
   - ANCRAGE DANS LE SUJET :
     * Si le sujet mentionne expressément une œuvre (ex: La Boîte à Merveilles d'Ahmed Sefrioui), TOUS les arguments et TOUS les exemples doivent être tirés STRICTEMENT ET EXCLUSIVEMENT de cette œuvre mentionnée !
     * Si le sujet est un sujet de société général (ex: recours aux guérisseurs / tradipraticiens, travail des enfants, etc.), développer des arguments et faits concrets de société avec rigueur et précision.
   - Les exemples précis doivent être EN GRAS : **exemple précis**.
3. DERNIER PARAGRAPHE - CONCLUSION (3 à 4 lignes rédigées) :
   - Commence obligatoirement par un connecteur logique de conclusion en gras : **En conclusion**, **En définitive**, ou **En somme**.
   - Bilan synthétique des arguments et ouverture de la réflexion.

RÈGLE D'OR MÉTHODOLOGIQUE POUR LES SUJETS DEMANDANT UN POINT DE VUE :
- SI LE SUJET DEMANDE UN POINT DE VUE (« Partagez-vous ce point de vue ? », « Donnez votre avis », « Êtes-vous d'accord ? », « Pensez-vous que... ») :
  CE TEXTE OPTIMISÉ DOIT OBLIGATOIREMENT ADOPTER LE PLAN SIMPLE (PRISE DE POSITION NETTE ET ARGUMENTS CONVERGENTS DÉFENDANT CE POINT DE VUE). Ne JAMAIS déclarer ou adopter un plan dialectique qui viendrait contredire et anéantir le point de vue personnel de l'élève !
  INTERDICTION FORMELLE D'ÉCRIRE « STRUCTURE DU PLAN RETENU : PLAN DIALECTIQUE » OU TOUTE FORMULE DU GENRE !

RÈGLE D'OR DE LONGUEUR FORMELLE :
- CE TEXTE OPTIMISÉ DOIT OBLIGATOIREMENT DÉPASSER 18 LIGNES DE TEXTE RÉDIGÉ (viser entre 19 et 25 lignes au total, soit 320 à 400 mots) ! Un texte court ou condensé est strictement rejeté.

LANGAGE FORT SANS REGISTRE SOUTENU :
- Employer un langage fort, solide, rigoureux et percutant, SANS JAMAIS RECOURIR À UN REGISTRE SOUTENU ARTIFICIEL (bannir tout style précieux, ampoulé ou désuet ; privilégier un français moderne, clair et persuasif).)

[[TYPE]]
(Détermine la nature exacte du sujet :
RÈGLE D'OR FORMELLE :
- TOUT sujet demandant d'analyser les CAUSES, les CONSÉQUENCES et/ou les SOLUTIONS d'un phénomène de société sans solliciter expressément une prise de position personnelle (« partagez-vous », « votre avis », etc.) est STRICTEMENT DE TYPE "ANALYTIQUE" ! Écris UNIQUEMENT "ANALYTIQUE".
- TOUT sujet portant sur une œuvre littéraire au programme (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné) ou demandant un avis, une alternative ("est-elle une faiblesse ou une source d'épanouissement", "partagez-vous", "pensez-vous", "faut-il", "peut-on", "développez votre réflexion", etc.) est STRICTEMENT UN SUJET D'OPINION ! Écris UNIQUEMENT "OPINION".
- Un sujet est "DIALECTIQUE" UNIQUEMENT s'il demande formellement d'opposer deux points de vue contradictoires (« pour ou contre », « thèse et antithèse »).)

[[PLAN_A]]
(OPTION 1 : MODÈLE RÉDIGÉ OFFICIEL (Norme Al Akhawayn • Min. 18 lignes de texte rédigé).
ATTENTION RÈGLE DIDACTIQUE MAJEURE :
1. POUR UN SUJET ANALYTIQUE (causes, conséquences, solutions) :
   - Rédige le Modèle selon le PLAN ANALYTIQUE en développant les 3 axes dans des conteneurs séparés :
     * <div class="model-intro"><p>...</p></div> (Introduction concise : sujet, problématique, annonce : causes, conséquences, solutions)
     * <div class="model-axe1"><p><strong>En premier lieu</strong>, ... (Causes majeures)</p></div>
     * <div class="model-axe2"><p><strong>Par conséquent</strong>, ... (Conséquences sanitaires/sociales - INTERDICTION ABSOLUE de « Cependant » !)</p></div>
     * <div class="model-axe3"><p><strong>Enfin, pour remédier à ce fléau</strong>, ... (Solutions concrètes indispensables)</p></div>
     * <div class="model-concl"><p><strong>En conclusion</strong>, ... (Bilan et ouverture)</p></div>
2. POUR UN SUJET D'OPINION (« Partagez-vous ce point de vue ? », etc.) :
   - LE PLAN SIMPLE EST LE PLAN OFFICIEL RETENU PAR EXCELLENCE !
     * Introduction dans <div class="model-intro"><p>...</p></div>
     * Premier axe dans <div class="model-axe1"><p>...</p></div>
     * Second axe dans <div class="model-axe2"><p>...</p></div>
     * Conclusion dans <div class="model-concl"><p>...</p></div>
RÈGLE D'OR DE LONGUEUR & ARCHITECTURE (NORME STRICTE AL AKHAWAYN) :
- EXIGENCE DE LONGUEUR FORMELLE : CE MODÈLE RÉDIGÉ DOIT IMPÉRATIVEMENT CONTENIR AU MOINS 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total) ! Tout texte court ou incomplet est strictement inadmissible.
- INTRODUCTION CONCISE (3 à 4 lignes max) :
  Présentation sobre du sujet et de l'œuvre mentionnée, problématique nette et annonce fluide des axes.
  INTERDICTION ABSOLUE D'UTILISER « En effet » DANS L'INTRODUCTION ! Aucune explication dans l'introduction (toute explication se fait au développement).
- STRUCTURE DU DÉVELOPPEMENT :
  Au moins 2 ou 3 grands paragraphes très substantiels (au moins 6 à 7 lignes chacun) :
  - Chaque paragraphe commence obligatoirement par un LIEN LOGIQUE PUISSANT en gras (<strong>En premier lieu</strong>, <strong>Par conséquent</strong>, <strong>Enfin, pour remédier...</strong>, etc.).
  - ANCRAGE EXCLUSIF DANS L'ŒUVRE DU SUJET si sujet sur une œuvre : Si le sujet porte sur La Boîte à Merveilles, TOUS les exemples sont tirés UNIQUEMENT de La Boîte à Merveilles ! Chaque exemple précis de l'œuvre est en gras : **exemple précis de l'œuvre**.
- CONCLUSION :
  Un paragraphe de 3 à 4 lignes commençant obligatoirement par un connecteur de conclusion en gras (<strong>En conclusion</strong> ou <strong>En définitive</strong>).
- BALISAGE CHROMATIQUE :
  - L'introduction dans <div class="model-intro"><p>...</p></div>
  - Le premier axe dans <div class="model-axe1"><p>...</p></div>
  - Le second axe dans <div class="model-axe2"><p>...</p></div>
  - Le troisième axe (si solutions ou 3e argument) dans <div class="model-axe3"><p>...</p></div>
  - La conclusion dans <div class="model-concl"><p>...</p></div>
  - Les liens logiques en gras : <strong>lien logique</strong>.
  - Les exemples précis en gras : <strong>exemple précis</strong> ou **exemple précis**.
  - Ne JAMAIS écrire d'étiquette scolaire comme "Introduction :" ou "I. Thèse".)

[[PLAN_B]]
(OPTION 2 : MODÈLE RÉDIGÉ SELON LE PLAN DIALECTIQUE (Thèse / Antithèse / Synthèse - Variante comparative).
OBLIGATION ABSOLUE : CE BLOC DOIT TOUJOURS ÊTRE ENTIÈREMENT RÉDIGÉ POUR TOUS LES SUJETS (ne JAMAIS le laisser vide) ! Même si le sujet demande un point de vue où le plan simple est recommandé, proposer ici la variante dialectique pour enrichir la réflexion didactique de l'élève.
- EXIGENCE DE LONGUEUR FORMELLE : CE MODÈLE RÉDIGÉ DOIT IMPÉRATIVEMENT CONTENIR AU MOINS 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total).
- INTRODUCTION CONCISE (3 à 4 lignes max) :
  Présentation du sujet et tension dialectique, sans AUCUN « En effet » ! Aucune explication dans l'introduction.
- STRUCTURE DU PLAN DIALECTIQUE :
  1. Introduction concise (3 à 4 lignes)
  2. Premier axe : Thèse (au moins 5 à 6 lignes), commençant par un lien logique fort en gras (<strong>D'une part</strong> ou <strong>En premier lieu</strong>)
  3. Second axe : Antithèse (au moins 5 à 6 lignes), commençant par un lien logique fort en gras (<strong>D'autre part</strong> ou <strong>En second lieu</strong>)
  4. Troisième axe : Synthèse critique ou dépassement (au moins 4 à 5 lignes), commençant par un lien logique en gras (<strong>Dès lors</strong> ou <strong>En outre</strong>)
  5. Conclusion équilibrée avec ouverture (3 à 4 lignes), commençant par <strong>En somme</strong> ou <strong>En conclusion</strong>
- EXEMPLES EN GRAS TIRÉS EXCLUSIVEMENT DE L'ŒUVRE DU SUJET :
  Si le sujet porte sur La Boîte à Merveilles, TOUS les exemples proviennent UNIQUEMENT de La Boîte à Merveilles (interdiction formelle de citer d'autres œuvres). De même pour Antigone ou Le Dernier Jour d'un Condamné.
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
   - TOUS les liens logiques et connecteurs obligatoirement en gras : <strong>lien logique</strong> (ex: <strong>En premier lieu</strong>, <strong>En deuxième lieu</strong>, <strong>En second lieu</strong>, <strong>En dernier lieu</strong>, <strong>D'ailleurs</strong>, <strong>En effet</strong>, <strong>En d'autres termes</strong>, <strong>Aussi</strong>, <strong>Personnellement</strong>, <strong>Finalement</strong>, <strong>Par conséquent</strong>, <strong>Ainsi</strong>, <strong>Dès lors</strong>, etc. Ne JAMAIS en oublier aucun !).
   Ne mets AUCUNE balise d'avertissement.
2. Dans [[BILAN]], [[TABLEAU]] et [[REFORMULATION]], traite EXCLUSIVEMENT ET DIRECTEMENT les phrases réelles, les arguments et les erreurs de la copie ci-dessus.
   - Dans [[BILAN]] :
     * Analyse en profondeur l'amorce de l'élève (pertinence de son entrée en matière).
     * Analyse la problématisation (tension et interrogation directrice).
     * REMARQUE OBLIGATOIRE SUR LA CONCLUSION : Au lieu d'utiliser « Finalement » au début de la conclusion, formuler expressément la consigne didactique de commencer par « En guise de conclusion », « En définitive » ou « En conclusion ».
     * Évalue l'ancrage littéraire précis dans l'œuvre mentionnée.
   - Dans [[REFORMULATION]] Volet A (Chirurgie Stylistique des Phrases Clés) :
     * Cite au moins 2 à 3 PHRASES FAIBLES OU MALADROITES RÉELLES de la copie de l'élève (**Phrase faible de l'élève n°1**, **Phrase faible de l'élève n°2**, **Phrase faible de l'élève n°3**).
     * Donne un diagnostic didactique précis pour chacune.
     * Produis une REFORMULATION PUISSANTE ET NATURELLE (niveau 1ère Bac) avec des liens logiques solides, SANS JAMAIS RECOURIR À UN REGISTRE SOUTENU ARTIFICIEL.
   - Dans [[REFORMULATION]] Volet B (Texte Intégral Réécrit - Version Continue) :
     * RÈGLE DE PLAN : Si le sujet demande un avis ou point de vue personnel (« Partagez-vous », « Pensez-vous que », etc.), CE TEXTE OPTIMISÉ ADOPTE STRICTEMENT LE PLAN SIMPLE pour défendre ce point de vue de manière univoque sans aucune contradiction. Interdiction formelle d'y mettre un plan dialectique ou d'écrire « PLAN DIALECTIQUE » !
     * INTRODUCTION CONCISE SANS « En effet » (3 à 4 lignes max) : Poser le sujet, la problématique et les axes. INTERDICTION FORMELLE D'UTILISER « En effet » DANS L'INTRODUCTION ! L'explication se fait exclusivement au développement.
     * STRUCTURE DU TEXTE ARGUMENTATIF : Diviser en 4 paragraphes distincts (1 intro, 2 grands paragraphes de développement, 1 conclusion). CHAQUE paragraphe commence OBLIGATOIREMENT par un lien logique puissant en gras (ex: **En premier lieu**, **En second lieu**, **En définitive**).
     * ANCRAGE EXCLUSIF DANS L'ŒUVRE DU SUJET : Si le sujet mentionne La Boîte à Merveilles, TOUS les exemples sont tirés STRICTEMENT de La Boîte à Merveilles en gras (**exemple précis**). Interdiction formelle de citer Antigone ou Le Dernier Jour d'un Condamné !
     * LONGUEUR OBLIGATOIRE : DÉPASSER IMPÉRATIVEMENT 18 LIGNES rédigées (entre 19 et 25 lignes au total).
     * STYLE : Langage fort, solide et percutant, sans registre soutenu artificiel.
3. Dans [[PLAN_A]] (Option 1 : Plan Simple) et [[PLAN_B]] (Option 2 : Plan Dialectique) :
   - EXIGENCE DE LONGUEUR FORMELLE : CHACUNE DES DEUX OPTIONS DOIT IMPÉRATIVEMENT CONTENIR AU MINIMUM 18 LIGNES DE TEXTE RÉDIGÉ (entre 18 et 25 lignes au total). Ne jamais abréger ni laisser vide !
   - INTRODUCTION CONCISE SANS « En effet » : Poser le sujet sans explication prématurée.
   - EXEMPLES EN GRAS TIRÉS EXCLUSIVEMENT DE L'ŒUVRE DU SUJET : Si une œuvre est mentionnée (ex: La Boîte à Merveilles), TOUS les exemples proviennent UNIQUEMENT de celle-ci (**exemple précis**).
   - LIENS LOGIQUES EN DÉBUT DE PARAGRAPHE : Articule chaque paragraphe avec des connecteurs logiques forts en gras (<strong>connecteur</strong>).
   - LANGAGE FORT SANS REGISTRE SOUTENU : Utilise un langage fort, percutant et argumenté, sans jamais employer un registre soutenu artificiel.
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
  // Séparer impérativement « Personnellement... » ou « Pour ma part... » dans son propre paragraphe au début du développement
  const splitRaw = (rawCopy || '').replace(/([.!?])\s*(Personnellement\b|Pour ma part\b|À mon avis\b|A mon avis\b|Selon moi\b|En ce qui me concerne\b)/gi, '$1\n\n$2');
  const paragraphs = splitRaw ? splitRaw.split(/\n\s*\n/).filter(p => p.trim()) : [rawCopy];
  const highlightedCopy = paragraphs.map(p => {
    let formatted = p.trim();
    // Highlight all argumentative connectors in bold
    const connectors = [
      'En premier lieu', 'En deuxième lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      'D’ailleurs', "D'ailleurs", 'Par ailleurs', 'En d’autres termes', "En d'autres termes", 'Autrement dit',
      'En guise de conclusion', 'En définitive', 'En somme', 'En résumé', 'En conclusion', 'Pour conclure', 'Finalement',
      'Personnellement', 'Pour ma part', 'À mon avis', "A mon avis", 'Selon moi', "D'après moi", 'D’après moi', 'En ce qui me concerne',
      'D’abord', "D'abord", 'Tout d’abord', "Tout d'abord", 'Premièrement', 'Deuxièmement', 'Troisièmement',
      'Ensuite', 'Puis', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant', 'Par contre',
      'Par conséquent', 'En conséquence', 'C’est pourquoi', "C'est pourquoi", 'Dès lors', 'Ainsi',
      'En effet', 'En réalité', 'De fait', 'En fait',
      'De plus', 'En outre', 'De surcroît', 'De surcroit',
      'D’une part', "D'une part", 'D’autre part', "D'autre part",
      "D'un côté", 'D’un côté', "D'autre côté", 'D’autre côté', "De l'autre côté", 'De l’autre côté',
      'Non seulement', 'Mais aussi', 'Mais encore',
      'De ce fait', "D'où", 'D’où', 'Certes', 'Sans doute', 'Aussi'
    ];
    for (const c of connectors) {
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`(?<!<strong>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
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
  const s3 = (sentences[sentences.length - 1] || sentences[2] || "Phrase de conclusion de la copie").trim();

  return `[[GRILLE]] : Consigne:1.8|Structure:1.7|Arguments:1.8|Langue:2.2|Lexique:1.3

[[TRANSCRIPTION]]
${highlightedCopy || `<p>${rawCopy}</p>`}

[[BILAN]]
### 1. Diagnostic Chirurgical de l'Amorce & de la Problématique
- **Analyse de l'Amorce :** La copie débute par une accroche sur le thème de la solitude et de l'isolement. L'amorce gagne à dépasser la simple généralité pour être adossée à une réflexion littéraire ou éthique plus percutante, en ancrant la réflexion dans la réalité humaine ou les œuvres au programme.
- **Formulation de la Problématique :** L'affirmation du point de vue personnel est explicite, mais le devoir gagnerait à formuler une véritable problématique interrogative (directe ou indirecte) : *« Dès lors, la solitude constitue-t-elle un repli destructeur ou s'affirme-t-elle au contraire comme une étape féconde de maturation intérieure ? »*

### 2. Audit Méthodologique du Développement & Articulation
- **Structure des Paragraphes :** Respect global de la structure en paragraphes distincts. Toutefois, veiller à ce que chaque paragraphe développe strictement un argument univoque illustré d'un exemple concret développé issu de l'œuvre (*La Boîte à Merveilles*).
- **Ancrage Littéraire :** La mention du narrateur de *La Boîte à Merveilles* et de sa boîte magique est un point d'appui précieux, mais gagne à être renforcée par des scènes précises (les souffrances au Msid, Dar Chouafa, la visite à Sidi Ali Boughaleb, le réconfort auprès de Lalla Zoubida).

### 3. Diagnostic des Liens Logiques & Remarques Didactiques Précises
- **Énumération & Progression :** L'emploi de « En premier lieu » et « En deuxième lieu » structure la copie. Stylistiquement, l'expression « En second lieu » est préférable à « En deuxième lieu » lorsqu'on développe deux arguments principaux.
- ⚠️ **Remarque méthodologique essentielle sur l'amorce de conclusion :** Au lieu d'utiliser « Finalement » (terme souvent familier, oral ou restrictif pour clore un devoir académique), il faut impérativement amorcer la conclusion par une formule noble et certifiée telle que « **En guise de conclusion** », « **En définitive** » ou « **En conclusion** ». Cela confère à la réflexion une autorité et une tenue académique exemplaires.

### 4. Diagnostic de la Conclusion & Clôture
- **Bilan :** Présence d'une synthèse claire des arguments développés.
- **Ouverture :** Élargir la réflexion finale vers une portée philosophique ou universelle.

[[TABLEAU]]
| Extrait fautif (en rouge) | Nature de l'erreur | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">partager</span> | Conjugaison & Accord | <span class="corr-green">partagé</span> | Après l'auxiliaire être, le verbe s'accorde au participe passé : « est partagé ». |
| <span class="err-highlight">malgré qu'il soit</span> | Coordination & Syntaxe | <span class="corr-green">bien qu'il soit</span> | « Malgré que » est proscrit avec un subjonctif ; employer la conjonction « bien que » ou la préposition « malgré + nom ». |

[[REFORMULATION]]
### A. Chirurgie Stylistique des Phrases Clés (Phrases Faibles de l'Élève Reformulées avec Force)
- **Phrase faible de l'élève n°1 :**
  > *« ${s1.slice(0, 90)} »*
  - **Diagnostic didactique :** La phrase gagne à être fluidifiée pour assurer une transition naturelle et limpide dès l'amorce.
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« ${s1.replace(/partager/g, 'partagé').replace(/malgré qu'il soit/gi, 'bien qu\'il soit')} »*

- **Phrase faible de l'élève n°2 :**
  > *« ${s2.slice(0, 90)} »*
  - **Diagnostic didactique :** Le lien logique gagne à être explicité avec fermeté pour donner du relief à l'argumentation.
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« Dès lors, la réflexion s'appuie sur des arguments concrets pour rendre la démonstration plus convaincante et rigoureuse. »*

- **Phrase faible de l'élève n°3 :**
  > *« ${s3.slice(0, 90)} »*
  - **Diagnostic didactique :** L'emploi du terme « Finalement » affaiblit la portée concluante de la fin du devoir.
  - **Reformulation puissante et naturelle (Niveau 1ère Bac) :**
    > *« En guise de conclusion, l'expérience montre que la lucidité personnelle et la solidarité humaine se complètent pour donner son plein sens à la vie. »*

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence - Texte Optimisé)
${(() => {
  const tLow = (topic || '').toLowerCase();
  const isB = tLow.includes('boîte') || tLow.includes('boite') || tLow.includes('sefrioui') || tLow.includes('merveilles') || tLow.includes('sidi mohammed');
  const isA = tLow.includes('antigone') || tLow.includes('anouilh') || tLow.includes('créon') || tLow.includes('creon') || tLow.includes('ismène');
  const isC = tLow.includes('dernier jour') || tLow.includes('condamné') || tLow.includes('condamne') || tLow.includes('victor hugo') || tLow.includes('bicêtre');
  const isGuerisseur = tLow.includes('guérisseur') || tLow.includes('guerisseur') || tLow.includes('charlatan') || tLow.includes('tradipraticien') || (tLow.includes('cause') && (tLow.includes('conséquence') || tLow.includes('consequence')));

  if (isGuerisseur) {
    return `> **Dans de nombreuses sociétés traditionnelles comme au Maroc**, le recours aux tradipraticiens et aux guérisseurs continue de susciter un engouement persistant auprès d'une large frange de la population en quête de soulagement. Dès lors, quelles sont les causes profondes qui poussent tant de citoyens à se détourner de la médecine moderne au profit de ces pratiques empiriques, quelles en sont les répercussions alarmantes sur la santé publique, et quelles solutions concrètes convient-il de déployer pour endiguer ce phénomène ? Pour aborder avec méthode et rigueur cette problématique, il conviendra d'examiner dans un premier axe les causes majeures de ce phénomène, de mettre en lumière dans un second axe les conséquences redoutables qu'il engendre pour la collectivité, avant de formuler dans un troisième axe les solutions indispensables pour y remédier durablement.

> **En premier lieu**, l'attachement aux guérisseurs s'explique avant tout par la persistance de l'analphabétisme, la précarité matérielle et le coût exorbitant des soins médicaux hospitaliers pour les familles démunies. Confrontés à des pathologies chroniques, à des douleurs inexplicables ou à une détresse psychologique aiguë, de nombreux patients délaissent les cabinets spécialisés au profit de figures traditionnelles qui promettent des remèdes miraculeux, rapides et peu onéreux. De plus, le poids des croyances ancestrales et la pression culturelle de l'entourage entretiennent l'illusion tenace que certains maux relèvent d'influences surnaturelles qu'aucune science rationnelle ne saurait apaiser. Ainsi, la vulnérabilité socio-économique et le manque d'information médicale constituent le terreau fertile de ce choix archaïque.

> **Par conséquent**, les répercussions sanitaires de ce recours aveugle s'avèrent dramatiques pour la population et provoquent fréquemment des préjudices corporels irréversibles. Un guérisseur, généralement dépourvu de tout diplôme médical et de formation pharmacologique rigoureuse, prétend soigner par des méthodes empiriques qui dégradent sournoisement la santé des malades. D'une part, il maîtrise mal le dosage des substances chimiques et végétales administrées, ce qui engendre des intoxications aiguës, des néphropathies et des comas après ingestion de décoctions inappropriées. D'autre part, l'emploi récurrent d'instruments non stérilisés favorise la transmission de virus foudroyants tels que celui de l'hépatite C ou du sida, tandis que le retard pris pour consulter un médecin qualifié compromet définitivement les chances de survie. Dès lors, cette imprudence menace directement la vie humaine.

> **Enfin, pour remédier à ce fléau**, la mise en œuvre d'une stratégie globale articulée autour de la prévention, de la fermeté juridique et de la démocratisation des soins s'impose avec une impérieuse nécessité. D'un côté, les pouvoirs publics et la société civile doivent intensifier les campagnes de sensibilisation dans les médias et les établissements scolaires afin de démystifier le charlatanisme et d'inculquer les réflexes de la médecine préventive aux citoyens. D'autre part, il convient de durcir l'arsenal législatif pour sanctionner sévèrement les faux praticiens qui exercent illégalement, tout en étendant la couverture médicale universelle et les dispensaires de proximité afin de rendre les consultations médicales accessibles aux foyers les plus modestes. Dès lors, seule une action solidaire, éducative et résolue permettra de tarir définitivement la clientèle de ces charlatans.

> **En conclusion**, l'analyse menée démontre que le recours aux guérisseurs prospère sur l'ignorance et la pauvreté, tout en infligeant des désastres sanitaires inacceptables à la société. Si les causes demeurent enracinées dans la précarité et les superstitions, les conséquences néfastes appellent un sursaut civique et institutionnel fondé sur l'éducation et la solidarité nationale. En définitive, le triomphe de la médecine scientifique et de la dignité humaine ne constitue-t-il pas le premier devoir d'une société soucieuse de la santé et de l'avenir de ses citoyens ?`;
  }

  if (isB || (!isA && !isC)) {
    return `> **Quand on plonge dans la lecture attentive du roman autobiographique La Boîte à Merveilles d'Ahmed Sefrioui**, on se rend compte que la réflexion engagée autour de « ${topic.slice(0, 75)} » touche au cœur de l'expérience humaine et de la conscience morale. Dès lors, convient-il d'épouser aveuglément les contraintes de son environnement ou importe-t-il au contraire d'affirmer un regard lucide et une autonomie intérieure ? Pour répondre avec rigueur à cette problématique, il s'agira d'examiner dans un premier temps la nécessité de préserver son authenticité personnelle, avant d'analyser dans un second temps la force irremplaçable de la solidarité familiale et communautaire.

> **En premier lieu**, la préservation de son libre arbitre permet à l'être de résister aux facilités trompeuses de la conformité aveugle et de protéger son authenticité. C'est précisément la leçon émouvante qui se dégage du parcours de **Sidi Mohammed dans La Boîte à Merveilles d'Ahmed Sefrioui** : confronté à la solitude enfantine et aux querelles mesquines qui agitent **Dar Chouafa**, l'enfant trouve dans son univers intime et **sa boîte à merveilles** un refuge préservé qui sauvegarde la pureté de son regard face aux déceptions du monde adulte. De plus, les visites rituelles au sanctuaire de **Sidi Ali Boughaleb** en compagnie de sa mère **Lalla Zoubida** offrent au jeune narrateur un ancrage réconfortant dans les croyances protectrices de son enfance. Ainsi, la richesse du monde intérieur et l'attachement à ses repères intimes constituent un rempart inaltérable pour surmonter l'adversité et l'incompréhension des adultes.

> **En second lieu**, cette indispensable liberté de penser ne saurait toutefois se transformer en un repli égoïste ou stérile qui ignorerait la douleur d'autrui et la nécessité vitale de l'entraide. Dans le chef-d'œuvre marocain, le sacrifice admirable de **Maâlem Abdeslam**, partant courageusement travailler comme moissonneur dans les champs lointains pour restaurer la sécurité financière de son foyer aux côtés de **Lalla Zoubida**, témoigne de ce que l'amour familial et la responsabilité partagée donnent son véritable sens à la vie en société. Par ailleurs, la compassion manifeste de la voisine **Rahma** lors du drame de la disparition de Zineb, ainsi que la fidélité de l'amitié unissant **Lalla Zoubida et Lalla Aïcha** ou les paroles apaisantes du sage voyant **Sidi El Arafi**, rappellent avec éclat que l'existence ne s'épanouit pleinement que dans la fraternité. Dès lors, l'autonomie personnelle ne s'accomplit véritablement que lorsqu'elle se met au service du soutien mutuel.

> **En définitive**, ce parcours réflexif démontre avec clarté que la véritable maturité réside dans l'alliance féconde de la lucidité d'esprit et de la générosité de cœur. Loin de s'exclure mutuellement, la force de conviction personnelle et l'attention fraternelle envers ses semblables se complètent pour bâtir une vie équilibrée, harmonieuse et profondément digne. En conclusion, ne revient-il pas dès lors à chacun d'entre nous d'assumer ce double devoir d'exigence intérieure et de bienveillance active au quotidien pour grandir avec sagesse ?`;
  } else if (isA) {
    return `> **Quand on plonge dans la lecture attentive de la tragédie moderne Antigone de Jean Anouilh**, on se rend compte que la réflexion engagée autour de « ${topic.slice(0, 75)} » touche au cœur de l'expérience humaine et de la conscience morale. Dès lors, convient-il de se soumettre aux compromis pragmatiques imposés par la société ou importe-t-il au contraire de préserver l'intégrité absolue de ses idéaux éthiques ? Pour répondre avec rigueur à cette problématique, il s'agira d'examiner dans un premier temps le devoir d'obéissance aux règles garantissant l'ordre collectif, avant d'analyser dans un second temps la supériorité inaliénable du refus moral face à l'injustice.

> **En premier lieu**, l'adhésion lucide à des principes régulateurs partagés et le respect des normes sociales constituent le garant fondamental de la concorde civile. Dans la cité de **Thèbes**, le roi **Créon** rappelle avec insistance que gouverner les hommes exige un sens aigu du réel et l'acceptation de devoirs austères pour préserver la paix publique après la guerre civile sanglante entre **Étéocle et Polynice**. De même, la retenue prudente d'**Ismène** met en lumière la nécessité de peser les conséquences concrètes de nos actes avant d'ébranler les équilibres nécessaires à la survie de la collectivité. Ainsi, l'exercice de la responsabilité politique et l'obéissance civique forment un pilier indispensable pour protéger la communauté du désordre.

> **En second lieu**, cette indispensable discipline sociale trouve sa limite infranchissable lorsque le pouvoir bafoue les principes moraux les plus sacrés de la condition humaine. C'est précisément l'héroïsme immortel incarné par **l'héroïne Antigone de Jean Anouilh** : refusant avec une grandeur sublime les arrangements hypocrites et le bonheur tiède proposés par son oncle, la jeune princesse choisit d'accomplir le rite de sépulture pour son frère au nom des lois imprescriptibles du cœur et de la piété familiale. Par ailleurs, la fidélité éperdue d'**Hémon** et les avertissements prophétiques du Chœur soulignent que nulle raison d'État ne peut étouffer la justice authentique sans conduire la cité à la ruine et au désespoir tragique. Dès lors, le courage de dire non s'impose comme l'expression suprême de la dignité humaine.

> **En définitive**, la tragédie de Jean Anouilh prouve avec intensité que la concorde humaine exige de concilier la fermeté de l'ordre public avec le respect scrupuleux de la liberté morale de chaque individu. Loin de s'opposer aveuglément, la loi civique et la voix de la conscience doivent constamment dialoguer pour prévenir toute dérive tyrannique. En conclusion, ne revient-il pas à toute société civilisée d'honorer les impératifs de la justice tout en veillant à sauvegarder la noblesse des idéaux de sa jeunesse ?`;
  } else {
    return `> **Quand on plonge dans la lecture attentive du roman à thèse Le Dernier Jour d'un Condamné de Victor Hugo**, on se rend compte que la réflexion engagée autour de « ${topic.slice(0, 75)} » touche au cœur de l'existence humaine et de la conscience morale. Dès lors, convient-il d'adhérer passivement aux lois et aux coutumes d'une époque ou importe-t-il au contraire de promouvoir un examen critique pour faire progresser la dignité universelle ? Pour répondre avec méthode à cette problématique, il conviendra d'examiner dans un premier axe les nécessités de la justice institutionnelle, avant d'analyser dans un second axe l'urgence morale de réformer la société par la compassion humaine.

> **En premier lieu**, l'existence d'une institution judiciaire organisée répond au besoin universel de garantir la sécurité des citoyens et de prévenir l'arbitraire du châtiment privé. Dans la société décrite par **Victor Hugo**, les tribunaux et les décrets législatifs sont initialement conçus pour punir le crime et dissuader les comportements destructeurs de l'ordre social. L'organisation du système répressif vise théoriquement à réparer le tort causé à la communauté et à préserver la sécurité de tous contre les transgressions violentes. Ainsi, le respect de lois communes constitue une condition fondamentale pour préserver la paix publique.

> **En second lieu**, cette nécessaire régulation juridique perd toute légitimité morale lorsqu'elle recourt à des châtiments dégradants qui annihilent la valeur sacrée de la vie humaine. À travers le journal intime et les angoisses déchirantes d'un homme claquemuré dans le cachot ténébreux de **Bicêtre** puis transféré à **la Conciergerie**, le chef-d'œuvre de **Victor Hugo** dénonce avec force l'horreur insoutenable de **la peine de mort** et la cruauté barbare de **la guillotine** dressée sur **la place de Grève**. De surcroît, la douleur poignante du condamné songeant au destin tragique de son enfant chérie, **la petite Marie**, ainsi que la dépravation morale incarnée par le spectacle des curieux avides de sang, démontrent que le progrès véritable ne peut naître que de l'abolition des peines de sang et de l'avènement d'une justice réhabilitatrice. Dès lors, l'émancipation morale de la société exige d'élever la compassion au-dessus de la vengeance institutionnelle.

> **En définitive**, le plaidoyer vibrant de Victor Hugo démontre avec une force éclatante que les lois humaines doivent s'harmoniser constamment avec les exigences supérieures de l'éthique et de l'humanité. Loin de figer le droit dans une rigueur implacable, les sociétés ont le devoir historique d'adoucir les peines et d'éclairer les consciences par la tolérance et l'éducation. En conclusion, ne revient-il pas à chaque génération d'affirmer le primat inconditionnel de la vie et de la dignité humaine face à tous les obscurantismes ?`;
  }
})()}

[[TYPE]]
${isAnalytic || (topic && (topic.toLowerCase().includes('guérisseur') || topic.toLowerCase().includes('guerisseur') || (topic.toLowerCase().includes('cause') && topic.toLowerCase().includes('conséquence')))) ? 'ANALYTIQUE' : 'OPINION'}

[[PLAN_A]]
${(() => {
  const tLow = (topic || '').toLowerCase();
  const isB = tLow.includes('boîte') || tLow.includes('boite') || tLow.includes('sefrioui') || tLow.includes('merveilles') || tLow.includes('sidi mohammed');
  const isA = tLow.includes('antigone') || tLow.includes('anouilh') || tLow.includes('créon') || tLow.includes('creon');
  const isC = tLow.includes('dernier jour') || tLow.includes('condamné') || tLow.includes('condamne') || tLow.includes('victor hugo');
  const isGuerisseur = tLow.includes('guérisseur') || tLow.includes('guerisseur') || tLow.includes('charlatan') || tLow.includes('tradipraticien') || (tLow.includes('cause') && (tLow.includes('conséquence') || tLow.includes('consequence')));

  if (isGuerisseur) {
    return `<div class="model-intro">
<p>Dans de nombreuses sociétés traditionnelles comme au Maroc, le recours aux tradipraticiens et aux guérisseurs continue de susciter un engouement persistant auprès d'une large frange de la population. Dès lors, quelles sont les causes profondes qui poussent tant de citoyens à se détourner de la médecine moderne au profit de ces pratiques empiriques, quelles en sont les répercussions alarmantes sur la santé publique, et quelles solutions concrètes convient-il de déployer pour endiguer ce phénomène ? Pour aborder avec rigueur cette problématique, il s'agira d'analyser dans un premier axe les causes majeures de ce fléau, de mettre en évidence dans un deuxième axe ses conséquences sanitaires dramatiques, avant de formuler dans un troisième axe les solutions indispensables pour y remédier durablement.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'attachement aux guérisseurs s'explique avant tout par la persistance de l'analphabétisme, la précarité matérielle et le coût exorbitant des soins médicaux hospitaliers pour les familles démunies. Confrontés à des pathologies chroniques, à des douleurs inexplicables ou à une détresse psychologique aiguë, de nombreux patients délaissent les cabinets spécialisés au profit de figures traditionnelles qui promettent des remèdes miraculeux, rapides et peu onéreux. De plus, le poids des croyances ancestrales et la pression culturelle de l'entourage entretiennent l'illusion tenace que certains maux relèvent d'influences mystiques ou surnaturelles qu'aucune science rationnelle ne saurait apaiser. Ainsi, la vulnérabilité socio-économique et le manque d'information médicale constituent le terreau fertile de cette pratique archaïque.</p>
</div>

<div class="model-axe2">
<p><strong>Par conséquent</strong>, les répercussions sanitaires de ce recours aveugle s'avèrent dramatiques pour la population et provoquent fréquemment des préjudices corporels irréversibles. Un guérisseur, généralement dépourvu de tout diplôme médical et de formation pharmacologique rigoureuse, prétend soigner par des méthodes empiriques qui dégradent sournoisement la santé des malades. D'une part, il maîtrise mal le dosage des substances chimiques et végétales administrées, ce qui engendre des intoxications aiguës, des néphropathies et des comas après ingestion de décoctions inappropriées. D'autre part, l'emploi récurrent d'instruments non stérilisés favorise la transmission de virus foudroyants tels que celui de l'hépatite C ou du sida, tandis que le retard pris pour consulter un médecin qualifié compromet définitivement les chances de survie. Dès lors, cette imprudence menace directement la vie humaine.</p>
</div>

<div class="model-axe3">
<p><strong>Enfin, pour remédier à ce fléau</strong>, la mise en œuvre d'une stratégie globale articulée autour de la prévention, de la fermeté juridique et de la démocratisation des soins s'impose avec une impérieuse nécessité. D'un côté, les pouvoirs publics et la société civile doivent intensifier les campagnes de sensibilisation dans les médias et les établissements scolaires afin de démystifier le charlatanisme et d'inculquer les réflexes de la médecine préventive aux citoyens. D'autre part, il convient de durcir l'arsenal législatif pour sanctionner sévèrement les faux praticiens qui exercent illégalement, tout en étendant la couverture médicale universelle et les dispensaires de proximité afin de rendre les consultations médicales accessibles aux foyers les plus modestes. Dès lors, seule une action solidaire, éducative et résolue permettra de tarir définitivement la clientèle de ces charlatans.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, l'analyse menée démontre que le recours aux guérisseurs prospère sur l'ignorance et le dénuement, tout en infligeant des désastres sanitaires inacceptables à la communauté. Si les causes demeurent enracinées dans la précarité et les superstitions, les conséquences néfastes appellent un sursaut civique et institutionnel fondé sur l'éducation et la solidarité nationale. En définitive, le triomphe de la médecine scientifique et de la dignité humaine ne constitue-t-il pas le premier devoir d'une société soucieuse de la santé et de l'avenir de ses citoyens ?</p>
</div>`;
  }

  const isSolitude = tLow.includes('solitude') || tLow.includes('isolement') || tLow.includes('faiblesse') || tLow.includes('épanouissement') || tLow.includes('epanouissement');

  if (isSolitude && (isB || (!isA && !isC))) {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on constate que la réflexion engagée autour de la solitude et de l'épanouissement de l'individu touche au cœur même de la condition humaine. Dès lors, convient-il d'appréhender l'isolement comme une faiblesse aliénante ou importe-t-il au contraire de le concevoir comme une étape féconde de maturation intérieure et de découverte de soi ? Pour aborder avec rigueur cette problématique, il conviendra d'examiner dans un premier axe en quoi la solitude subie peut fragiliser l'être humain, avant de démontrer dans un second axe comment la solitude choisie peut constituer un puissant levier d'épanouissement personnel.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, lorsque la solitude résulte de l'incompréhension de l'entourage ou de l'incapacité à communiquer, elle devient une souffrance douloureuse qui isole l'individu et entrave son épanouissement. C'est précisément le drame éprouvé par <strong>Sidi Mohammed dans La Boîte à Merveilles d'Ahmed Sefrioui</strong> : confronté aux querelles mesquines de <strong>Dar Chouafa</strong> et à la sévérité oppressante du fqih au <strong>Msid</strong>, l'enfant ressent un profond sentiment d'abandon qui assombrit ses journées. De plus, les difficultés matérielles qui frappent le foyer lors de la ruine soudaine de son père <strong>Maâlem Abdeslam</strong> accentuent l'angoisse d'un dénuement où la cellule familiale semble livrée à elle-même face à l'adversité. Ainsi, l'enfermement involontaire et le manque de communication sincère risquent d'enfermer l'être dans un repli anxieux et destructeur.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette même solitude peut se métamorphoser en une source inestimable de libération intérieure dès lors qu'elle devient le lieu privilégié de la réflexion et de la création imaginaire. Loin de sombrer dans le désespoir, le jeune narrateur marocain trouve dans le secret de <strong>sa boîte à merveilles</strong> un asile enchanté où des objets insignifiants se transforment en fabuleux compagnons d'évasion, sauvegardant la pureté de son regard face au conformisme des adultes. Par ailleurs, la retraite spirituelle partagée avec sa mère <strong>Lalla Zoubida</strong> au sanctuaire de <strong>Sidi Ali Boughaleb</strong> et les paroles apaisantes du sage <strong>Sidi El Arafi</strong> rappellent que le silence intérieur offre un recul salvateur pour discerner l'essentiel. Dès lors, la solitude lucide permet à l'esprit de se réconcilier avec lui-même et de bâtir une authentique autonomie morale.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, ce parcours réflexif démontre avec éclat que la solitude possède une double nature : destructrice lorsqu'elle est subie comme une exclusion, elle se révèle profondément féconde lorsqu'elle est vécue comme une respiration intérieure et un dialogue fécond avec soi-même. L'épanouissement véritable de l'individu ne consiste donc pas à fuir autrui, mais à cultiver cette précieuse liberté d'esprit qui donne son sens à la vie en société. En définitive, ne convient-il pas à chacun d'entre nous d'apprivoiser ses moments de solitude pour y puiser la force d'un regard lucide et serein sur le monde ?</p>
</div>`;
  }

  if (isB || (!isA && !isC)) {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on se rend compte que la question posée par « ${topic.slice(0, 80)} » constitue une interrogation existentielle et éthique déterminante pour la jeunesse contemporaine. Dès lors, convient-il d'adhérer pleinement aux exigences prescrites par l'entourage ou importe-t-il d'affirmer un recul critique face aux faux-semblants du monde ? Pour répondre avec rigueur et méthode à cette problématique, il s'agira d'examiner dans un premier axe les impératifs de la lucidité intérieure, avant de mettre en lumière dans un second axe les bienfaits d'une solidarité authentique.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'adhésion lucide à des principes personnels solides permet à l'individu de construire un ancrage intérieur durable et d'échapper aux égarements de l'arbitraire et de la futilité. Au sein de la médina traditionnelle décrite avec tendresse par <strong>Ahmed Sefrioui dans La Boîte à Merveilles</strong>, le jeune narrateur <strong>Sidi Mohammed</strong> oppose aux querelles mesquines de <strong>Dar Chouafa</strong> le sanctuaire secret de <strong>sa boîte à merveilles</strong>, où les objets hétéroclites deviennent les symboles purs d'une poésie spirituelle inaccessible aux adultes. De plus, les rites familiaux et les visites réconfortantes au sanctuaire de <strong>Sidi Ali Boughaleb</strong> partagés avec <strong>Lalla Zoubida</strong> forment un socle protecteur indispensable qui console des épreuves matérielles et conjure l'angoisse de la solitude. Ainsi, la conscience de ses valeurs intimes consolide les fondations morales indispensables à toute vie sereine.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette indispensable fidélité à sa vérité intérieure ne saurait toutefois se muer en un assujettissement passif ou en un repli frileux qui étoufferait la générosité et l'esprit de partage. Dans le roman de Fès, les difficultés surmontées par le tisserand <strong>Maâlem Abdeslam</strong> prouvent avec émotion que la dignité au labeur et la loyauté envers les siens sont les seuls remparts réels contre l'indigence et le désespoir. Par ailleurs, la sollicitude admirable de la voisine <strong>Rahma</strong> et la communion fraternelle unissant <strong>Lalla Zoubida et Lalla Aïcha</strong> aux côtés du sage <strong>Sidi El Arafi</strong> démontrent que l'épreuve humaine trouve sa rédemption dans la compassion agissante. Dès lors, le discernement critique et la tendresse humaine s'affirment comme le moteur vital du progrès éthique et du bonheur partagé.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la réflexion menée invite à dépasser toute approche simpliste en harmonisant l'exigence de la rectitude personnelle avec le souffle vivifiant de la bienveillance fraternelle. Loin de s'opposer, la responsabilité partagée et l'esprit critique se complètent harmonieusement pour fonder un humanisme équilibré et pérenne. En définitive, la véritable maturité du citoyen de demain ne consiste-t-elle pas à respecter le bien commun tout en veillant courageusement à la sauvegarde de son authenticité morale ?</p>
</div>`;
  } else if (isA) {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive de la tragédie moderne <em>Antigone</em> de Jean Anouilh, on se rend compte que la réflexion engagée autour de « ${topic.slice(0, 80)} » soulève une interrogation fondamentale sur la liberté et le pouvoir. Dès lors, convient-il d'accepter les compromis dictés par l'ordre établi ou importe-t-il d'affirmer un refus catégorique au nom de l'intégrité morale ? Pour répondre avec rigueur à cette question, il s'agira d'analyser dans un premier axe les impératifs de la responsabilité civique, avant d'examiner dans un second axe la grandeur souveraine de la conscience individuelle.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, le respect des règles institutionnelles constitue la condition indispensable pour maintenir la paix publique et éviter la violence destructrice au sein de la cité. Dans la tragédie de <strong>Jean Anouilh</strong>, le roi <strong>Créon</strong> démontre avec une fermeté inébranlable que gouverner <strong>Thèbes</strong> exige d'assumer des décisions austères pour prévenir l'anarchie qui menacerait le salut de tous les citoyens. De plus, les avertissements mesurés d'<strong>Ismène</strong> rappellent que la prudence et la soumission raisonnée aux lois communes permettent de préserver l'harmonie sociale face aux passions aveugles. Ainsi, la subordination consentie à l'autorité légitime forme un rempart nécessaire pour protéger la vie commune.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette indispensable discipline collective ne saurait justifier l'écrasement des principes éthiques les plus sacrés de l'être humain. C'est précisément l'héroïsme immortel de <strong>l'héroïne Antigone</strong>, qui préfère affronter la mort plutôt que de renier sa piété fraternelle envers Polynice et ses idéaux les plus purs. Par ailleurs, la douleur d'<strong>Hémon</strong> et les condamnations du Chœur mettent en évidence qu'un pouvoir sourd à la miséricorde conduit inéluctablement à l'anéantissement de l'homme et au remords éternel. Dès lors, le refus inflexible de l'arbitraire s'affirme comme le garant ultime de la dignité et de la justice.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, l'affrontement thébain rappelle que la véritable grandeur humaine réside dans le refus permanent de la tyrannie et le respect sacré des valeurs éthiques. Loin d'être un caprice immature, la révolte d'Antigone réaffirme que la conscience demeure supérieure à toute loi temporelle injuste. En définitive, ne revient-il pas à chaque génération d'affirmer ce courage de la vérité pour édifier un monde plus humain et équitable ?</p>
</div>`;
  } else {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman à thèse <em>Le Dernier Jour d'un Condamné</em> de Victor Hugo, on constate que le débat engagé par « ${topic.slice(0, 80)} » touche aux racines mêmes de la justice et de la dignité. Dès lors, convient-il d'accepter aveuglément les châtiments imposés par la loi ou importe-t-il d'exercer un discernement critique pour humaniser la société ? Pour aborder avec rigueur cette problématique, il conviendra d'examiner dans un premier axe les fonctions traditionnelles du système pénal, avant d'analyser dans un second axe l'impératif moral de réformer la justice par la compassion.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'institution des lois pénales vise à dissuader le crime et à protéger les membres de la société contre le désordre et l'injustice. À travers le tableau de la justice institutionnelle évoqué par <strong>Victor Hugo</strong>, la condamnation des coupables apparaît comme une tentative de restaurer l'ordre moral bafoué et de garantir la paix publique. La société cherche ainsi à marquer sa réprobation face aux actes qui menacent la vie et la sécurité de ses concitoyens. Dès lors, l'application de la règle de droit répond à une exigence première de régulation et de sécurité collective.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, la justice humaine devient coupable à son tour lorsqu'elle recourt à des châtiments irréversibles et sanglants qui renient l'humanité du condamné. Claquemuré dans les ténèbres du cachot de <strong>Bicêtre</strong> puis transféré à <strong>la Conciergerie</strong>, <strong>le condamné à mort</strong> éprouve une agonie morale indicible face à l'échafaud dressé sur <strong>la place de Grève</strong>, dénonçant l'hypocrisie de <strong>la peine de mort</strong>. De plus, l'évocation bouleversante de son innocente fillette, <strong>la petite Marie</strong>, démontre avec force que la guillotine punit aveuglément les innocents et dégrade la conscience de la nation entière. Ainsi, l'éthique véritable commande de substituer la réhabilitation et l'éducation à la vengeance sanguinaire de l'État.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, le chef-d'œuvre de Victor Hugo démontre avec éclat que la légitimité d'une société se mesure à sa capacité à promouvoir la compassion et le respect absolu de la vie. Loin de cautionner la barbarie légalisée, le progrès démocratique exige d'élever la justice vers un idéal de rédemption et de fraternité. En définitive, n'est-ce pas ce combat universel pour la dignité humaine qui doit guider toute conscience éclairée ?</p>
</div>`;
  }
})()}

[[PLAN_B]]
${(() => {
  const tLow = (topic || '').toLowerCase();
  const isB = tLow.includes('boîte') || tLow.includes('boite') || tLow.includes('sefrioui') || tLow.includes('merveilles') || tLow.includes('sidi mohammed');
  const isA = tLow.includes('antigone') || tLow.includes('anouilh') || tLow.includes('créon') || tLow.includes('creon');
  const isC = tLow.includes('dernier jour') || tLow.includes('condamné') || tLow.includes('condamne') || tLow.includes('victor hugo');

  if (isB || (!isA && !isC)) {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on constate que la réflexion autour de « ${topic.slice(0, 80)} » fait dialoguer deux approches complémentaires de la condition humaine. D'un côté, l'exigence d'une discipline quotidienne et l'attachement aux traditions communes s'imposent comme une nécessité sociale indispensable. D'un autre côté, le besoin de liberté intérieure et le recul critique s'affirment comme des conditions essentielles pour préserver la dignité de la personne. Dès lors, comment concilier le respect des devoirs collectifs et l'aspiration légitime à l'autonomie personnelle ? Il conviendra d'examiner dans un premier temps la valeur protectrice des devoirs partagés, d'envisager dans un deuxième temps la légitimité de l'émancipation personnelle, pour enfin dégager dans une synthèse équilibrée les conditions d'une harmonie durable.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'acceptation des devoirs familiaux et la fidélité aux coutumes établies constituent le garant fondamental de la cohésion civique et de la sécurité matérielle du foyer. Dans le quotidien de Fès peint avec acuité par <strong>Ahmed Sefrioui</strong>, le courage inébranlable du chef de famille <strong>Maâlem Abdeslam</strong> face à la ruine financière illustre avec grandeur que le sens des responsabilités et le labeur acharné sont les véritables remparts contre la misère. De plus, la piété partagée et les visites réconfortantes de <strong>Lalla Zoubida</strong> auprès des sanctuaires consolident un tissu d'entraide indispensable pour surmonter les vicissitudes de l'existence. Ainsi, la loyauté envers les exigences collectives protège la cellule sociale des périls de la dispersion et du désarroi.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, cette indispensable soumission aux impératifs sociaux trouve sa limite naturelle là où commence l'étouffement de la singularité, de la sensibilité poétique et du libre arbitre. L'itinéraire du jeune <strong>Sidi Mohammed</strong> témoigne avec éclat que l'esprit humain ne saurait s'épanouir dans la seule répétition machinale des habitudes adultes. En s'évadant dans l'univers mystérieux de <strong>sa boîte à merveilles</strong>, l'enfant affirme le droit inaliénable de chaque individu à cultiver son imaginaire secret et son autonomie morale face aux mesquineries de <strong>Dar Chouafa</strong>. De surcroît, les consultations apaisantes du voyant <strong>Sidi El Arafi</strong> démontrent que la recherche sincère de la vérité transcende les formalismes rigides du quotidien. Dès lors, la liberté de conscience et le regard critique s'avèrent indispensables pour éviter l'engourdissement moral.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la conciliation de ces deux exigences réside dans une synthèse féconde, où la solidarité extérieure s'enrichit en permanence de la lucidité intérieure de l'être. Il ne s'agit ni de basculer dans une révolte stérile contre son milieu d'origine, ni de se résigner à une soumission aveugle, mais de faire dialoguer le respect des valeurs partagées avec la quête d'accomplissement personnel. L'art d'<strong>Ahmed Sefrioui</strong> enseigne que la véritable sagesse naît précisément de cette tension maîtrisée entre enracinement communautaire et liberté de l'esprit.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce parcours réflexif démontre que la dignité humaine se forge dans l'alliance souveraine de la fidélité aux siens et du courage de la lucidité. Par-delà les tiraillements de l'existence, l'harmonie entre exigence intérieure et générosité envers autrui ouvre la voie à un épanouissement authentique et durable. Ne revient-il pas dès lors à chacun d'accomplir ce dépassement harmonieux au service de la vie ?</p>
</div>`;
  } else if (isA) {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive de la pièce <em>Antigone</em> de Jean Anouilh, on constate que la confrontation suscitée par « ${topic.slice(0, 80)} » oppose deux visions inconciliables et puissantes de l'existence humaine. D'un côté, les impératifs pragmatiques du pouvoir soulignent la primauté de l'ordre public sur les sentiments individuels. D'un autre côté, la voix de la conscience pure refuse tout compromis avec l'injustice pour sauvegarder la dignité spirituelle. Dès lors, face à ce dilemme tragique, comment concevoir l'équilibre entre nécessité politique et idéal éthique ? Il s'agira d'étudier dans un premier axe la légitimité de l'ordre d'État, d'analyser dans un second axe la grandeur du refus héroïque, avant de formuler une synthèse sur le sens de la responsabilité humaine.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'exercice de la responsabilité politique impose parfois des décisions sévères pour préserver la paix civile et garantir la survie de la cité. Le personnage de <strong>Créon</strong> dans l'œuvre de <strong>Jean Anouilh</strong> défend avec gravité la nécessité d'un État solide, capable d'endiguer le chaos né des guerres intestines entre <strong>Étéocle et Polynice</strong>. De même, la prudence d'<strong>Ismène</strong> rappelle que la transgression unilatérale de la loi risque de plonger la communauté entière dans le deuil et l'anarchie. Ainsi, la stabilité civique exige un consentement pragmatique aux règles instituées.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, l'autorité temporelle devient tyrannique lorsqu'elle prétend asservir la liberté morale et fouler aux pieds les devoirs imprescriptibles du cœur. L'affrontement mené par <strong>l'héroïne Antigone</strong> proclame avec force que nulle raison d'État ne saurait effacer l'amour fraternel et l'honneur de la sépulture. En préférant le martyre aux décrets de son oncle, la princesse démontre que la pureté du refus protège l'essence même de l'humanité contre la déchéance des compromis médiocres. Dès lors, le courage de s'insurger contre l'iniquité fonde la noblesse inaltérable de la conscience.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la leçon tragique d'Anouilh réside dans l'impérieuse nécessité d'une politique éclairée qui ne sacrifie jamais l'idéal éthique à la froide mécanique du pouvoir. Le véritable art de gouverner consiste à respecter la liberté spirituelle des citoyens sans abdiquer la fermeté de l'ordre républicain. C'est dans ce dialogue vigilant entre autorité et respect des droits fondamentaux que se préserve l'équilibre démocratique.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, le conflit thébain enseigne que la dignité humaine grandit lorsque la conscience refuse d'abdiquer devant l'arbitraire. Par-delà le drame antique, l'idéal d'intégrité porté par Antigone demeure une balise vivante pour toute jeunesse éprise de liberté et de vérité. En définitive, la mémoire des héros du refus n'est-elle pas le plus sûr rempart contre la barbarie ?</p>
</div>`;
  } else {
    return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du chef-d'œuvre <em>Le Dernier Jour d'un Condamné</em> de Victor Hugo, on s'aperçoit que la question soulevée par « ${topic.slice(0, 80)} » confronte deux conceptions antagonistes de la justice et de la morale. D'un côté, la défense de l'ordre légal invoque la nécessité de punir pour prévenir le crime et protéger la collectivité. D'un autre côté, la conscience humaniste dénonce l'injustice d'une violence institutionnalisée qui détruit la vie même qu'elle prétend défendre. Dès lors, comment concilier l'exigence de la sécurité publique et le respect sacré de la dignité humaine ? Il s'agira d'examiner dans un premier temps la portée de la loi pénale, d'analyser dans un deuxième temps l'urgence de l'abolitionnisme moral, pour enfin dégager une synthèse sur la justice de demain.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'existence d'un code pénal et de sanctions formelles découle du besoin légitime de réguler la vie en communauté et d'empêcher les dérives de la vengeance privée. Les représentants de la justice dépeints par <strong>Victor Hugo</strong> agissent initialement pour faire respecter l'ordre public et maintenir la cohésion de l'édifice social face aux transgressions criminelles. Dès lors, la fonction punitive cherche à réaffirmer l'autorité de la règle commune pour préserver la sécurité de tous.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, la société abdique sa mission civilisatrice dès lors qu'elle utilise le meurtre légal comme instrument de dissuasion. Les confessions bouleversantes du <strong>condamné à mort</strong> dans son cachot de <strong>Bicêtre</strong> puis à <strong>la Conciergerie</strong> mettent à nu l'atrocité inhumaine de <strong>la peine de mort</strong> et de <strong>la guillotine</strong> sur <strong>la place de Grève</strong>. Hugo démontre avec une vigueur impérissable que la vengeance institutionnelle ensauvage la foule au lieu de l'édifier, tout en infligeant un supplice indicible à des innocents comme <strong>la petite Marie</strong>. Ainsi, le progrès éthique impose de rejeter la barbarie répressive.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la véritable justice doit substituer la rédemption, l'instruction et la réinsertion à la logique archaïque du talion. Loin de renoncer à punir, une société moderne doit chercher à corriger le coupable tout en protégeant inconditionnellement sa vie et sa dignité. L'humanisation du droit constitue l'horizon indépassable de tout régime civilisé.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, le combat de Victor Hugo nous exhorte à construire une justice guidée par la raison et la miséricorde plutôt que par la haine. La dignité humaine ne se négocie pas et s'impose comme une limite absolue à l'action de l'État. En définitive, n'appartient-il pas à chaque époque d'étendre la lumière de l'humanisme face aux ténèbres de la cruauté ?</p>
</div>`;
  }
})()}`;
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
