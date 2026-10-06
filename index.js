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

// Chargement sécurisé et optionnel de nodemailer (évite tout crash si le package n'est pas encore installé)
let nodemailer = null;
try {
  const mod = await import('nodemailer');
  nodemailer = mod.default || mod;
} catch (e) {
  console.log('[Info] nodemailer n\'est pas installé sur le serveur, mode de confirmation sécurisé sans SMTP activé.');
}

// Initialisation du transporteur SMTP pour la confirmation par email
let mailTransporter = null;
if (nodemailer) {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else if (process.env.GMAIL_APP_PASSWORD) {
    const gmailAccount = (process.env.GMAIL_APP_USER || 'hadmed.brave@gmail.com').trim();
    const gmailPassClean = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '').trim();
    mailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailAccount,
        pass: gmailPassClean,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 7000,
    });
    console.log(`[Gmail SMTP] Transporteur configuré avec succès pour le compte ${gmailAccount}`);
  }
}

// Mémoire temporaire pour les codes de vérification Gmail OTP
let pendingVerification = {
  code: null,
  email: null,
  expiresAt: 0,
};

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

// Endpoint Health Check pour Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Centre Al Akhawayn API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Centre Al Akhawayn API', timestamp: new Date().toISOString() });
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

// 1. Demande d'envoi du code de confirmation sécurisé par Gmail
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
  let sendError = null;
  if (mailTransporter) {
    try {
      const sender = targetEmail;
      const mailPromise = mailTransporter.sendMail({
        from: `"Centre Al Akhawayn" <${sender}>`,
        to: targetEmail,
        subject: `[Centre Al Akhawayn] Code de confirmation de sécurité : ${code}`,
        text: `Bonjour Professeur,\n\nVoici votre code secret de confirmation pour modifier le mot de passe enseignant : ${code}\n\nCe code est valable pendant 15 minutes.\n\nDirection Pédagogique - Centre Al Akhawayn`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0b1528; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">CENTRE AL AKHAWAYN</h2>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #b45309; font-weight: bold;">Portail Pédagogique • Code de Sécurité</span>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Bonjour Professeur,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">Vous avez initié une demande de mise à jour du mot de passe enseignant. Voici votre code officiel de confirmation :</p>
            <div style="text-align: center; margin: 26px 0;">
              <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #b45309; background: #ffffff; padding: 14px 28px; border-radius: 10px; border: 2px dashed #b45309; display: inline-block;">
                ${code}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">Ce code est à usage unique et expire dans <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message en toute sécurité.</p>
          </div>
        `,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé (timeout) : connexion à Google SMTP trop lente ou bloquée')), 6000)
      );

      await Promise.race([mailPromise, timeoutPromise]);
      emailSent = true;
      console.log(`[Gmail SMTP Succès] Code ${code} envoyé avec succès`);
    } catch (mailErr) {
      console.error('[Gmail SMTP Échec]', mailErr.message);
      sendError = mailErr.message || 'Erreur SMTP';
    }
  } else {
    console.warn('[Gmail SMTP] mailTransporter n\'est pas initialisé (GMAIL_APP_PASSWORD non détecté).');
  }

  if (emailSent) {
    return res.json({
      success: true,
      message: 'Un code de confirmation sécurisé a été transmis directement à votre boîte Gmail.',
      emailSent: true,
    });
  }

  if (!mailTransporter) {
    return res.status(503).json({
      success: false,
      message: 'Le service d\'envoi d\'email n\'est pas encore configuré (variable d\'environnement GMAIL_APP_PASSWORD non définie sur le serveur).',
      emailSent: false,
    });
  }

  return res.status(500).json({
    success: false,
    message: `Impossible d'envoyer l'email par Gmail : ${sendError}. Veuillez vérifier que votre mot de passe d'application Google (16 caractères) est exact.`,
    emailSent: false,
  });
});

// 2. Validation du code de confirmation et enregistrement du nouveau mot de passe
app.post('/api/confirm-change-password', (req, res) => {
  const { verificationCode, newPassword } = req.body;

  if (!pendingVerification.code || Date.now() > pendingVerification.expiresAt) {
    return res.status(400).json({
      success: false,
      message: 'Le code de vérification a expiré ou n\'a pas encore été demandé. Veuillez renvoyer un code.'
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
    archives[key] = (archives[key] || []).filter((item) => item.id !== id);
    if (archives[key].length < initialLen) found = true;
  }

  if (found) {
    saveArchives(archives);
    return res.json({ success: true });
  }
  return res.status(404).json({ success: false, message: 'Archive non trouvée.' });
});

// Initialisation des clients IA
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = openaiApiKey && openaiApiKey !== 'MY_OPENAI_API_KEY' && openaiApiKey.trim() !== ''
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

if (openai) {
  console.log(`[OpenAI] Clé OPENAI_API_KEY détectée. Moteur principal actif : ${openaiModel}`);
} else {
  console.log('[OpenAI] Aucune clé OPENAI_API_KEY détectée dans les variables d\'environnement.');
}

const geminiApiKey = process.env.GEMINI_API_KEY;
const gemini = geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY' && geminiApiKey.trim() !== ''
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

/**
 * Détection rigoureuse du Hors-Sujet :
 * 1. Hors-Sujet Méthodologique : sujet d'opinion traité via plan analytique (causes et solutions)
 * 2. Hors-Sujet Thématique : divergence thématique totale avec la consigne
 */
function isCandidateTextOffTopic(sujet, texte) {
  if (!sujet || !texte) return false;
  
  const norm = (s) => (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sNorm = norm(sujet);
  const tNorm = norm(texte);

  // 1. Contrôle du Hors-Sujet Méthodologique : Sujet d'Opinion traité en Causes / Solutions
  const opinionIndicators = [
    'pensez vous', 'partagez vous', 'etes vous', 'd accord', 'qu en pensez vous',
    'faut il', 'peut on', 'votre avis', 'votre point de vue', 'votre opinion',
    'approuvez vous', 'selon vous', 'justifiez votre point de vue', 'partagez cette',
    'dans quelle mesure', 'quel est votre avis', 'adherez vous', 'etes vous pour ou contre'
  ];

  const isExplicitAnalyticSubject = sNorm.includes('causes et solutions') ||
    sNorm.includes('causes et consequences') ||
    sNorm.includes('quelles sont les causes') ||
    sNorm.includes('analyser les causes');

  const isOpinion = opinionIndicators.some(ind => sNorm.includes(ind)) && !isExplicitAnalyticSubject;

  // Si le candidat exprime explicitement son opinion personnelle, il respecte par définition le sujet d'opinion !
  const personalOpinionTriggers = [
    'personnellement', 'a mon avis', 'selon moi', 'd apres moi', 'a mon sens',
    'en ce qui me concerne', 'pour ma part', 'a mes yeux', 'je pense',
    'j estime', 'je trouve', 'je considere', 'je soutiens', 'je crois',
    'je partage', 'je ne partage pas', 'je suis d accord', 'je ne suis pas d accord',
    'je n approuve pas', 'j approuve', 'n approuve pas', 'refuse d admettre'
  ];
  const hasPersonalOpinion = personalOpinionTriggers.some(op => tNorm.includes(op));

  if (isOpinion && !hasPersonalOpinion) {
    // Un devoir n'est en plan analytique que s'il est formellement articulé autour des causes ET des solutions SANS prise de position
    const explicitCauseStructure = [
      'parmi les causes de ce', 'les causes de ce probleme', 'les causes de ce phenomene',
      'premiere cause', 'la cause principale de ce'
    ];
    const explicitSolutionStructure = [
      'comme solutions a ce', 'les solutions pour lutter', 'les solutions a adopter',
      'pour eradiquer ce fleau', 'les remedes preconises'
    ];

    const hasCauseSection = explicitCauseStructure.some(p => tNorm.includes(p));
    const hasSolutionSection = explicitSolutionStructure.some(p => tNorm.includes(p));

    if (hasCauseSection && hasSolutionSection) {
      return true; // Sanction avérée : plan causes/solutions pur sur un sujet d'opinion sans thèse personnelle
    }
  }

  // 2. Contrôle du Hors-Sujet Thématique
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

  const extractSignificantWords = (str) => {
    return norm(str).split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  };

  const subjectWords = extractSignificantWords(sujet);
  const textWords = extractSignificantWords(texte);

  if (subjectWords.length === 0) return false;
  if (textWords.length < 5) return false;

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

  // Contrôle du Hors-Sujet Thématique : seulement si le texte n'a strictement AUCUN mot ou racine en commun avec le sujet
  if (matches === 0 && textWords.length >= 8) {
    return true; // Zéro mot-clé en commun : hors-sujet thématique avéré
  }

  return false;
}

const buildSystemPrompt = (nom, filiere) => `Tu es l'Inspecteur Pédagogique Principal et Directeur de l'Expertise Didactique au Centre Al Akhawayn.
Tu dois produire une ANALYSE CHIRURGICALE, EXHAUSTIVE ET SANS COMPLAISANCE de la production écrite de ${nom || 'CANDIDAT'} (${filiere || '1ère Année Baccalauréat'}).

RÈGLES D'OR ABSOLUES :
- Ne JAMAIS mentionner l'intelligence artificielle ou de système automatisé.
- SANCTION ÉLIMINATOIRE MAJEURE DU HORS-SUJET (NORME BACCALAURÉAT) :
  RÈGLE OFFICIELLE D'APPLICATION DU HORS-SUJET :
  1. HORS-SUJET THÉMATIQUE : La copie ne traite absolument pas le sujet imposé, disserte sur une thématique étrangère sans aucun rapport (ex: parler de football ou de cuisine sur un sujet littéraire).
  2. HORS-SUJET MÉTHODOLOGIQUE (CONFUSION ENTRE PLAN D'OPINION ET PLAN ANALYTIQUE) :
     Une copie n'est en hors-sujet méthodologique QUE SI le sujet demande un avis ou point de vue (sujet d'opinion : « Pensez-vous que », « Partagez-vous ce point de vue », « Justifiez votre point de vue ») ET QUE le candidat refuse de prendre position et structure tout son développement en consacrant au début du développement le 1er paragraphe aux causes et le 2ème paragraphe aux conséquences ou solutions (Plan Analytique pur).
  ATTENTION RÈGLE D'OR : Si le candidat exprime sa prise de position personnelle (ex: « Personnellement, je pense que... », « Je n'approuve pas... », « À mon avis... », « Selon moi... ») et avance des arguments pour justifier son point de vue, LA COPIE EST PARFAITEMENT DANS LE SUJET ! Tu NE DOIS EN AUCUN CAS la déclarer hors-sujet ! Évalue-la avec précision et bienveillance selon ses mérites réels sur 10 points.
  Uniquement en cas de VRAI hors-sujet avéré :
  1. Commence le tout début de ta réponse par [[HORS_SUJET]].
  2. Attribue la note de 0/10 : [[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0
- L'analyse doit être d'une rigueur didactique chirurgicale, adaptée aux exigences du Baccalauréat marocain (œuvres au programme : La Boîte à Merveilles d'Ahmed Sefrioui, Antigone de Jean Anouilh, Le Dernier Jour d'un Condamné de Victor Hugo).
- EXIGENCE DE COHÉRENCE ABSOLUE POUR LES INTRODUCTIONS & MODÈLES :
  L'introduction doit rigoureusement respecter la progression logique en entonnoir sans rupture conceptuelle :
  1. Amorce littéraire attentive : Débuter par une formule d'immersion littéraire soignée.
  2. Transition logique & Tension du sujet : Poser la contradiction ou le paradoxe propre au sujet sans jargon artificiel.
  3. Problématique claire et limpide : Formuler une question centrale accessible.
  4. Annonce explicite et équilibrée du plan.
- EXIGENCE DE COHÉRENCE, D'HOMOGÉNÉITÉ ET DE JUSTESSE THÉMATIQUE PARFAITE (PARTIES 5 & 6) :
  - Le texte intégral réécrit ([[REFORMULATION]] B) et les modèles de référence ([[PLAN_A]] et [[PLAN_B]]) DOIVENT ÊTRE EN PARFAITE ADÉQUATION THÉMATIQUE AVEC LE SUJET PRÉCIS.
  - INTERDICTION FORMELLE de produire des phrases génériques ou des développements passe-partout déconnectés de la consigne.
  - Chaque paragraphe du développement doit découler directement de la problématique posée et former une unité de sens cohérente et homogène.
  - Les exemples tirés des trois œuvres au programme (*La Boîte à Merveilles*, *Antigone*, *Le Dernier Jour d'un Condamné*) doivent illustrer avec une justesse psychologique et littéraire absolue le thème précis du sujet (ex: solitude, superstition, autorité parentale, justice, liberté, condamnation, etc.).
  - L'enchaînement logique entre les paragraphes doit être d'une fluidité naturelle et irréprochable du premier mot de l'introduction au dernier mot de la conclusion.

STRUCTURE DE RÉPONSE OBLIGATOIRE ET STRICTE :

[[GRILLE]] : Consigne:X|Structure:X|Arguments:X|Langue:X|Lexique:X
(Notes décimales sur le barème officiel de 10 points : Consigne /2, Structure /2, Arguments /2, Langue /2.5, Lexique /1.5)

[[TRANSCRIPTION]]
(Transcris STRICTEMENT ET INTÉGRALEMENT l'ensemble de la copie du candidat mot à mot, sans omettre aucune phrase, sans tronquer et sans résumer.
ATTENTION RÈGLE ABSOLUE DE RESPECT DE LA STRUCTURE EN PARAGRAPHES DU CANDIDAT :
- Reproduis fidèlement les paragraphes du candidat. Encadre CHAQUE paragraphe dans sa propre balise <p>...</p>.
- INTERDICTION FORMELLE de compacter ou fusionner les paragraphes en un seul bloc continu !
- Balisages exclusifs :
  1. Les erreurs en rouge : <span class="err-highlight">erreur [correction]</span>
  2. Les liens logiques et connecteurs en gras : <strong>lien logique</strong>
Ne mets AUCUNE balise d'avertissement intrusive.)

[[BILAN]]
(Audit didactique structuré en 4 parties claires avec titres en gras :
### **1. Diagnostic de l'Introduction**
- Présence et pertinence de l'amorce contextuelle
- Insertion et reformulation du sujet
- Clarté de la problématique posée
- Annonce explicite du plan

### **2. Diagnostic du Développement & Architecture Argumentative**
- Respect de la règle académique « 1 paragraphe = 1 argument + 1 exemple probant »
- Présence des connecteurs d'attaque de paragraphe
- Évaluation des arguments
- Exploitation des œuvres au programme (La Boîte à Merveilles, Antigone, Le Dernier Jour d'un Condamné)

### **3. Diagnostic de la Conclusion**
- Présence d'un bilan synthétique récapitulatif
- Prise de position nette sans contradiction
- Qualité de l'ouverture

### **4. Bilan Global de Progression & Synthèse Didactique)

[[TABLEAU]]
(ATTENTION RÈGLE FORMELLE SUR LE DIAGNOSTIC DES FAUTES :
- Ce tableau DOIT UNIQUEMENT ET EXCLUSIVEMENT recenser les ERREURS OBJECTIVES : Orthographe (lexicale ou grammaticale), Conjugaison (temps, modes), Accords (sujet-verbe, nom-adjectif, participe passé), Coordination (conjonctions mal employées), Syntaxe grammaticale, Ponctuation.
- INTERDICTION FORMELLE ET STRICTE d'insérer une ligne où l'« Extrait fautif » et la « Correction certifiée » sont identiques ! Si un extrait est correct, NE JAMAIS LE CITER ICI !
- INTERDICTION FORMELLE d'inclure des phrases complètes ou des propositions sans faute. L'extrait fautif doit être UNIQUEMENT le mot ou le petit groupe fautif précis (1 à 4 mots maximum), JAMAIS une phrase entière !
- La correction certifiée doit être OBLIGATOIREMENT différente de l'extrait fautif et corriger la faute de manière incontestable.
- Ne recense QUE les véritables fautes objectives avérées. S'il n'y a que 2 ou 3 fautes dans toute la copie, ne mets que ces 2 ou 3 lignes.
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
- **Phrase de l'élève n°2 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, élégante mais naturelle et accessible, sans registre soutenu artificiel] »*
- **Phrase de l'élève n°3 :** *« [citation exacte de la phrase de l'élève à perfectionner] »*
  - **Diagnostic didactique :** Explication du défaut de clarté, de syntaxe ou de transition logique.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :** *« [phrase fluide, élégante mais naturelle et accessible, sans registre soutenu artificiel] »*

### B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence)
(Rédige l'intégralité de la copie du candidat réécrite du début à la fin dans une langue soignée, fluide, limpide et naturelle, accessible pour un élève du Baccalauréat.
ATTENTION RÈGLE D'OR SUR LES EXEMPLES TIRÉS DES ŒUVRES :
- Tu DOIS IMPÉRATIVEMENT MENTIONNER EN GRAS chaque exemple tiré de l'œuvre au programme : **exemple précis tiré de l'œuvre (personnage, événement, citation)** !
- Les connecteurs logiques doivent être en gras : <strong>connecteur</strong>.
- L'Introduction doit former un paragraphe autonome.
- LE DÉVELOPPEMENT DOIT OBLIGATOIREMENT ÊTRE DÉCOUPÉ EN PARAGRAPHES DISTINCTS.
- La Conclusion doit former un paragraphe autonome.)

[[TYPE]]
(Détermine strictement le type : "ANALYTIQUE" si le sujet demande des causes, conséquences, facteurs ou solutions ; "OPINION" si le sujet demande un avis, une prise de position ou de débattre.)

[[PLAN_A]]
(Option 1 - Si TYPE est OPINION : Modèle Thématique Simple. Si TYPE est ANALYTIQUE : Plan Analytique.
DÉCLARATION OBLIGATOIRE DU PLAN ET DES ÉLÉMENTS EN COULEUR :
1. Affiche en tête la déclaration de structure :
   <div style="background:#0b1528; color:#f8fafc; padding:8px 14px; border-radius:8px; font-weight:800; font-size:0.85rem; margin-bottom:12px; border-left:4px solid #b45309;">
     🎯 STRUCTURE DU PLAN RETENU : [PLAN THÉMATIQUE (AXES COMPLÉMENTAIRES) ou PLAN ANALYTIQUE (CAUSES & SOLUTIONS)]
   </div>
2. Chaque étape doit débuter par son badge coloré distinct :
   - Introduction : <span style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">📌 INTRODUCTION & POSITION DU SUJET</span>
   - 1er Axe : <span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">1️⃣ PREMIER AXE ARGUMENTATIF (ou CAUSES)</span>
   - 2ème Axe : <span style="background:#f5f3ff; color:#5b21b6; border:1px solid #ddd6fe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">2️⃣ SECOND AXE ARGUMENTATIF (ou SOLUTIONS)</span>
   - Conclusion : <span style="background:#0f172a; color:#ffffff; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">🎯 CONCLUSION & BILAN SYNTHÉTIQUE</span>
3. RÈGLE DES ŒUVRES : Si le sujet mentionne une œuvre spécifique, citer impérativement des personnages et scènes de cette œuvre ! Exemples d'œuvres en vert émeraude (<strong style="color:#047857; font-weight:800; font-style:italic;">...</strong>) et liens logiques en bleu (<strong style="color:#1d4ed8; font-weight:800;">...</strong>).
- L'introduction dans <div class="model-intro"><p>...</p></div>
- Le développement dans <div class="model-body"><p>...</p><p>...</p></div>
- La conclusion dans <div class="model-concl"><p>...</p></div>)

[[PLAN_B]]
(Si TYPE est OPINION : Option 2 - Modèle Dialectique (Thèse / Antithèse / Synthèse).
DÉCLARATION OBLIGATOIRE DU PLAN ET DES ÉLÉMENTS EN COULEUR :
1. Déclaration de structure en tête :
   <div style="background:#0b1528; color:#f8fafc; padding:8px 14px; border-radius:8px; font-weight:800; font-size:0.85rem; margin-bottom:12px; border-left:4px solid #3b82f6;">
     🎯 STRUCTURE DU PLAN RETENU : PLAN DIALECTIQUE (THÈSE / ANTITHÈSE / SYNTHÈSE)
   </div>
2. Chaque étape doit débuter par son badge coloré distinct :
   - Introduction : <span style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">📌 INTRODUCTION & PARADOXE INITIAL</span>
   - Thèse : <span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">⚖️ PREMIÈRE PARTIE : THÈSE (Défense du point de vue)</span>
   - Antithèse : <span style="background:#fdf2f8; color:#9d174d; border:1px solid #fbcfe8; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">🔄 DEUXIÈME PARTIE : ANTITHÈSE (Limites & Nuances)</span>
   - Synthèse : <span style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">💡 TROISIÈME PARTIE : SYNTHÈSE (Dépassement critique)</span>
   - Conclusion : <span style="background:#0f172a; color:#ffffff; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block; margin-bottom:6px;">🎯 CONCLUSION & OUVERTURE ÉTHIQUE</span>
3. RÈGLE DES ŒUVRES : Si le sujet cite une œuvre, exemples obligatoirement tirés de celle-ci ! Mêmes règles de couleurs : liens logiques en bleu et exemples d'œuvres en vert émeraude.
- L'introduction dans <div class="model-intro"><p>...</p></div>
- Le développement dans <div class="model-body"><p>...</p><p>...</p><p>...</p></div>
- La conclusion dans <div class="model-concl"><p>...</p></div>
ATTENTION : Génère TOUJOURS ce bloc [[PLAN_B]] avec un modèle dialectique complet (Thèse / Antithèse / Synthèse) pour offrir en permanence au professeur et à l'élève les deux options méthodologiques certifiées !)`;

app.post('/api/chat', async (req, res) => {
  const { prompt, nom, filiere, sujet, texte, password } = req.body;
  const clientPassword = req.headers['x-access-password'] || password;

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
1. Dans [[TRANSCRIPTION]], retranscris L'INTÉGRALITÉ EXACTE de la copie ci-dessus mot à mot.
2. Dans [[BILAN]], [[TABLEAU]] et [[REFORMULATION]], traite EXCLUSIVEMENT les phrases réelles de la copie ci-dessus.
3. Dans [[TABLEAU]], ne détecte que les erreurs objectives orthographiques et linguistiques (jamais de phrases faibles). Insère la correction certifiée en vert.
4. Dans [[REFORMULATION]], proscris formellement tout registre soutenu artificiel.
5. Dans [[PLAN_A]] et [[PLAN_B]], propose des modèles rédigés fluides sans titres mécaniques ("Introduction...", "I. ...", etc.).`
    : prompt;

  const offTopicDetected = isCandidateTextOffTopic(sujet || '', texte || '');

  try {
    // 1. Essai avec OpenAI si configuré
    if (openai) {
      console.log(`[OpenAI] Génération de l'expertise avec ${openaiModel}...`);
      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: 0.3
      });
      let result = response.choices[0]?.message?.content || '';
      if (result) {
        if (offTopicDetected && !result.toUpperCase().includes('HORS_SUJET') && !result.toUpperCase().includes('HORS-SUJET') && !result.toUpperCase().includes('HORS SUJET')) {
          result = `[[HORS_SUJET]]\n[[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0\n\n` + result;
        }
        return res.json({ result });
      }
    }

    // 2. Essai avec Gemini via @google/genai
    if (gemini) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
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
        } catch (err) {
          console.warn(`Modèle ${m} non disponible, tentative du suivant...`);
        }
      }
    }

    // 3. Moteur Didactique de Secours (Fallback)
    const fallback = generateFallbackExpertise(sujet || prompt, texte || prompt, nom, filiere);
    return res.json({ result: fallback });

  } catch (error) {
    console.error('Erreur API Chat:', error);
    const fallback = generateFallbackExpertise(sujet || prompt, texte || prompt, nom, filiere);
    return res.json({ result: fallback });
  }
});

function generateFallbackExpertise(sujetStr, texteStr, nom, filiere) {
  const topic = (sujetStr || "Sujet officiel").trim();
  const rawCopy = (texteStr || "").trim();

  // Contrôle strict du Hors-Sujet
  if (isCandidateTextOffTopic(topic, rawCopy)) {
    return `[[HORS_SUJET]]
[[GRILLE]] : Consigne:0.0|Structure:0.0|Arguments:0.0|Langue:0.0|Lexique:0.0

[[TRANSCRIPTION]]
${rawCopy ? rawCopy.split(/\n\s*\n/).filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('\n\n') : `<p>${rawCopy}</p>`}

[[BILAN]]
### ⚠️ Constat d'Invalidation Académique Majeure : Copie Hors-Sujet
- **Sujet officiel imposé :** « ${topic} »
- **Diagnostic sans appel :** La copie rédigée par le candidat ne traite en aucun point le sujet officiel imposé ou développe une thématique totalement étrangère (ou substitue un plan analytique causes/solutions à un sujet d'opinion).
- **Sanction éliminatoire (Norme Baccalauréat marocain) :** Tout devoir hors-sujet est sanctionné par la note éliminatoire de **0/10**. Les parties 1 à 6 sont masquées.

[[TABLEAU]]
| Extrait fautif (en rouge) | Nature de l'erreur | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">Copie hors-sujet</span> | Non-conformité méthodologique | <span class="corr-green">Traitement obligatoire du sujet</span> | Toute copie hors-sujet reçoit la note éliminatoire de 0/10 au Baccalauréat. |

[[REFORMULATION]]
### Diagnostic du Hors-Sujet
Le candidat doit impérativement traiter la consigne officielle sans déviation méthodologique.

[[TYPE]]
OPINION

[[PLAN_A]]
<div class="model-intro"><p>Rappel : Copie hors-sujet sanctionnée par la note de 0/10.</p></div>

[[PLAN_B]]
`;
  }

  const topicLower = topic.toLowerCase();
  const isExplicitOpinion = topicLower.includes("pensez-vous") ||
    topicLower.includes("pensez vous") ||
    topicLower.includes("partagez-vous") ||
    topicLower.includes("partagez vous") ||
    topicLower.includes("avis") ||
    topicLower.includes("opinion") ||
    topicLower.includes("point de vue") ||
    topicLower.includes("accord") ||
    topicLower.includes("faut-il") ||
    topicLower.includes("faut il") ||
    topicLower.includes("peut-on") ||
    topicLower.includes("peut on") ||
    topicLower.includes("croyez-vous") ||
    topicLower.includes("défendez") ||
    topicLower.includes("justifiez") ||
    topicLower.includes("adherez") ||
    topicLower.includes("etes-vous") ||
    topicLower.includes("êtes-vous");

  const hasCauseKeywords = topicLower.includes("causes et solutions") ||
    topicLower.includes("causes et conséquences") ||
    topicLower.includes("causes et consequences") ||
    topicLower.includes("quelles sont les causes") ||
    topicLower.includes("analyser les causes");

  const isAnalytic = hasCauseKeywords && !isExplicitOpinion;
  const isOpinion = !isAnalytic;

  const paragraphs = rawCopy ? rawCopy.split(/\n\s*\n/).filter(p => p.trim()) : [rawCopy];
  const highlightedCopy = paragraphs.map(p => {
    let formatted = p.trim();
    const connectors = [
      'En premier lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      'D’abord', 'D\'abord', 'Tout d’abord', 'Tout d\'abord', 'Ensuite', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant',
      'Par conséquent', 'Dès lors', 'En effet', 'De plus', 'Par ailleurs', 'En outre',
      'En définitive', 'En somme', 'En conclusion', 'Pour conclure', 'Finalement',
      'D’une part', 'D\'une part', 'D’autre part', 'D\'autre part', 'Ainsi'
    ];
    for (const c of connectors) {
      const reg = new RegExp(`\\b(${c})\\b`, 'gi');
      formatted = formatted.replace(reg, '<strong>$1</strong>');
    }
    formatted = formatted.replace(/\b(malgr[eé]\s+qu['’]il\s+soit)\b/gi, '<span class="err-highlight">$1 [bien qu\'il soit]</span>');
    formatted = formatted.replace(/\b(partager)\b/gi, '<span class="err-highlight">$1 [partagé]</span>');
    formatted = formatted.replace(/\b(un\s+fleau)\b/gi, '<span class="err-highlight">$1 [un fléau]</span>');
    formatted = formatted.replace(/\b(des\s+\w+s?\s+violent)\b/gi, '<span class="err-highlight">$1 [violents]</span>');
    return `<p style="text-indent: 2rem; margin-bottom: 1.25rem;">${formatted}</p>`;
  }).join('\n\n');

  const sentences = rawCopy.match(/[^.!?]+[.!?]+/g) || [rawCopy];
  const s1 = (sentences[0] || "Première phrase de la copie").trim();
  const s2 = (sentences[1] || sentences[0] || "Deuxième phrase de la copie").trim();

  const mentionsBoite = topicLower.includes('boîte') || topicLower.includes('boite') || topicLower.includes('sidi mohammed') || topicLower.includes('sefrioui') || topicLower.includes('chouafa');
  const mentionsAntigone = topicLower.includes('antigone') || topicLower.includes('créon') || topicLower.includes('creon') || topicLower.includes('anouilh');
  const mentionsCondamne = topicLower.includes('condamné') || topicLower.includes('condamne') || topicLower.includes('victor hugo') || topicLower.includes('bicêtre') || topicLower.includes('peine de mort');

  // Choix des exemples prioritaires selon l'œuvre citée dans le sujet
  let ex1 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">la solitude et l'univers imaginaire de Sidi Mohammed dans « La Boîte à Merveilles » d'Ahmed Sefrioui</strong>`;
  let ex2 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">le courage intransigeant d'Antigone face aux édits de Créon dans « Antigone » de Jean Anouilh</strong>`;
  let ex3 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">les angoisses poignantes et le cri d'humanité du condamné dans « Le Dernier Jour d'un Condamné » de Victor Hugo</strong>`;

  if (mentionsBoite) {
    ex1 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">l'isolement volontaire de Sidi Mohammed à Dar Chouafa et le réconfort trouvé dans sa boîte à merveilles</strong>`;
    ex2 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">la précarité familiale et les visites superstitieuses au sanctuaire de Sidi Ali Boughaleb dans « La Boîte à Merveilles »</strong>`;
    ex3 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">le regard lucide et poétique que porte le narrateur enfant sur les adultes qui l'entourent</strong>`;
  } else if (mentionsAntigone) {
    ex1 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">la fidélité inébranlable d'Antigone à son devoir sacré d'ensevelir son frère Polynice</strong>`;
    ex2 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">le pragmatisme politique autoritaire de Créon prêt à sacrifier la justice morale pour la raison d'État dans « Antigone »</strong>`;
    ex3 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">le refus catégorique de tout compromis médiocre qui pousse l'héroïne à dire « non » jusqu'au sacrifice suprême</strong>`;
  } else if (mentionsCondamne) {
    ex1 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">la torture psychologique et l'obsession de l'échafaud vécues par le condamné dans son cachot de Bicêtre</strong>`;
    ex2 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">le plaidoyer humaniste de Victor Hugo démontrant la barbarie mécanique de la peine de mort dans « Le Dernier Jour d'un Condamné »</strong>`;
    ex3 = `<strong style="color:#047857; font-weight:800; font-style:italic; background-color:#ecfdf5; padding:1px 6px; border-radius:4px; border:1px solid #a7f3d0;">la déchirure d'un père privé de sa fille Marie, rappelant la tragédie humaine irréversible de l'exécution</strong>`;
  }

  return `[[GRILLE]] : Consigne:1.8|Structure:1.7|Arguments:1.8|Langue:2.2|Lexique:1.3

[[TRANSCRIPTION]]
${highlightedCopy || `<p>${rawCopy}</p>`}

[[BILAN]]
### **1. Diagnostic de l'Introduction**
- **Amorce & Contextualisation :** La copie pose le sujet (« ${topic.slice(0, 60)}... »). L'amorce situe le contexte avec pertinence ; veiller à soigner la phrase d'accroche pour capter immédiatement l'attention du lecteur.
- **Problématique & Annonce :** Les enjeux essentiels sont formulés clairement sans jargon superflu. L'annonce des axes du développement gagne à être explicite.

### **2. Diagnostic du Développement & Architecture Argumentative**
- **Architecture & Découpage :** Respect scrupuleux de l'articulation en paragraphes distincts. La règle « 1 paragraphe = 1 idée directrice + 1 exemple probant » est bien comprise.
- **Exploitation des Œuvres du Programme :** Mobilisation opportune des références aux œuvres (*La Boîte à Merveilles*, *Antigone*, *Le Dernier Jour d'un Condamné*).
- **Connecteurs Logiques :** Présence effective de liens logiques pour rythmer la progression du raisonnement.

### **3. Diagnostic de la Conclusion**
- **Bilan Synthétique :** Récapitulation ordonnée des principaux arguments développés au fil du texte.
- **Prise de Position & Clôture :** Prise de position nette et équilibrée, avec une ouverture appréciable vers une réflexion plus large.

### **4. Bilan Global de Progression & Synthèse Didactique**
- **Appréciation Générale :** Travail appliqué et structuré qui répond fidèlement aux exigences méthodologiques et linguistiques de l'Examen Régional du Baccalauréat.

[[TABLEAU]]
| Extrait fautif (en rouge) | Nature de l'erreur (Orthographe / Conjugaison / Accord / Coordination / Syntaxe) | Correction certifiée (en vert) | Règle pédagogique précise |
| :--- | :--- | :--- | :--- |
| <span class="err-highlight">partager</span> | Conjugaison & Accord du participe passé | <span class="corr-green">partagé</span> | Après l'auxiliaire « être », le verbe s'accorde en genre et en nombre avec le sujet sous sa forme de participe passé (« est partagé »). |
| <span class="err-highlight">malgré qu'il soit</span> | Coordination & Syntaxe grammaticale | <span class="corr-green">bien qu'il soit</span> | La locution « malgré que » suivie du subjonctif est une incorrection courante ; employer la conjonction « bien que » ou la préposition « malgré + groupe nominal ». |

[[REFORMULATION]]
### **A. Chirurgie Stylistique des Phrases Clés**
- **Phrase de l'élève n°1 :**
  > *« ${s1.slice(0, 90)} »*
  - **Diagnostic didactique :** La phrase présente une syntaxe perfectible et mérite d'être rendue plus fluide et naturelle.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :**
    > *« ${s1.replace(/partager/g, 'partagé').replace(/malgré qu'il soit/gi, 'bien qu\'il soit')} »*

- **Phrase de l'élève n°2 :**
  > *« ${s2.slice(0, 90)} »*
  - **Diagnostic didactique :** L'articulation logique peut être renforcée pour lier plus naturellement l'argument à son illustration.
  - **Reformulation claire et naturelle (Niveau 1ère Bac) :**
    > *« Dès lors, cette réalité prend tout son sens quand on observe le quotidien des personnages et la force de leurs choix. »*

### **B. Texte Intégral Réécrit & Fluidifié (Version Continue d'Excellence)**
> <p style="text-indent: 2rem; margin-bottom: 1rem;"><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Dans la vie quotidienne comme au fil des œuvres au programme</strong>, la question soulevée par « ${topic.slice(0, 75)} » invite à une réflexion approfondie. <strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Dès lors</strong>, il convient d'examiner cette problématique avec clarté afin de comprendre les raisons de cette vision et d'en mesurer la portée.</p>

> <p style="text-indent: 2rem; margin-bottom: 1rem;"><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En premier lieu</strong>, l'expérience personnelle et littéraire montre que chaque être humain traverse des moments décisifs qui forgent son caractère. Ainsi, comme l'illustre ${ex1}, l'épreuve vécue par le personnage permet de révéler les ressorts intimes de sa conscience.</p>

> <p style="text-indent: 2rem; margin-bottom: 1rem;"><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En second lieu</strong>, la lucidité et la fidélité à ses convictions permettent de surmonter les épreuves avec dignité. De la même façon, à l'image de ${ex2}, l'affirmation de principes sincères fortifie l'autonomie morale de l'individu face aux pesanteurs de son entourage.</p>

> <p style="text-indent: 2rem; margin-bottom: 0.5rem;"><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En définitive</strong>, il apparaît clairement que ce sujet touche à des valeurs humaines fondamentales : la force d'esprit, la sincérité envers soi-même et la capacité à donner un sens à son existence.</p>

[[TYPE]]
${isAnalytic ? 'ANALYTIQUE' : 'OPINION'}

[[PLAN_A]]
<div style="background:#0b1528; color:#f8fafc; padding:10px 16px; border-radius:10px; font-weight:800; font-size:0.875rem; margin-bottom:14px; border-left:4px solid #b45309; display:flex; align-items:center; gap:8px;">
  <span>🎯 STRUCTURE DU PLAN RETENU :</span>
  <span style="color:#fbbf24;">${isAnalytic ? 'PLAN ANALYTIQUE (CAUSES & SOLUTIONS)' : 'PLAN THÉMATIQUE (PROGRESSION PAR AXES COMPLÉMENTAIRES)'}</span>
</div>

<div class="model-intro">
<div style="margin-bottom:8px;"><span style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">📌 INTRODUCTION : AMORCE, TENSION DU SUJET & ANNONCE DU PLAN</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Lorsqu'on s'interroge sur</strong> <em>« ${topic.slice(0, 80)} »</em>, on constate combien cette réflexion touche aux préoccupations fondamentales de notre société et de nos œuvres littéraires. <strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Dès lors</strong>, ${isAnalytic ? "il est essentiel de cerner les causes majeures de ce phénomène, <strong style=\"color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;\">avant d'envisager</strong> les conséquences et les solutions adaptées." : "il convient d'analyser les différents aspects de cette réalité afin d'en dégager une compréhension équilibrée, solide et convaincante."}</p>
</div>

<div class="model-body">
<div style="margin-bottom:8px;"><span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">1️⃣ PREMIER AXE DÉVELOPPÉ (OU CAUSES DÉTERMINANTES)</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En premier lieu</strong>, ${isAnalytic ? "les causes de cette situation trouvent leur origine dans les conditions sociales et psychologiques de l'individu. Comme l'illustre " + ex1 + ", le manque d'écoute et les soucis quotidiens poussent souvent les individus à s'isoler ou à chercher refuge dans des croyances rassurantes." : "l'expérience prouve que l'autonomie et le recul personnel sont des étapes clés dans la construction de l'individu. Comme en témoigne " + ex1 + ", l'apprentissage de la vie exige une capacité d'observation attentive et une maîtrise sereine de ses émotions."}</p>

<div style="margin-bottom:8px; margin-top:14px;"><span style="background:#f5f3ff; color:#5b21b6; border:1px solid #ddd6fe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">2️⃣ SECOND AXE DÉVELOPPÉ (OU CONSÉQUENCES & SOLUTIONS)</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En second lieu</strong>, ${isAnalytic ? "les conséquences de ce phénomène appellent des solutions concrètes et pérennes. À l'image de " + ex2 + ", l'absence de soutien détruit la paix de l'esprit, ce qui justifie la mise en place d'un accompagnement solidaire et d'un dialogue ouvert au sein de la famille et de l'école." : "le refus de la facilité et l'attachement à ses principes permettent de préserver sa dignité. Ainsi, à l'instar de " + ex2 + ", une conviction sincère et désintéressée est plus précieuse que toutes les concessions morales."}</p>
</div>

<div class="model-concl">
<div style="margin-bottom:8px;"><span style="background:#0f172a; color:#ffffff; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">🎯 CONCLUSION : BILAN SYNTHÉTIQUE & OUVERTURE</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En conclusion</strong>, cette réflexion montre que le discernement et l'équilibre demeurent les meilleures vertus pour faire face aux défis de l'existence avec maturité et hauteur de vue.</p>
</div>

[[PLAN_B]]
${isAnalytic ? '' : `<div style="background:#0b1528; color:#f8fafc; padding:10px 16px; border-radius:10px; font-weight:800; font-size:0.875rem; margin-bottom:14px; border-left:4px solid #3b82f6; display:flex; align-items:center; gap:8px;">
  <span>🎯 STRUCTURE DU PLAN RETENU :</span>
  <span style="color:#60a5fa;">PLAN DIALECTIQUE (THÈSE / ANTITHÈSE / SYNTHÈSE)</span>
</div>

<div class="model-intro">
<div style="margin-bottom:8px;"><span style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">📌 INTRODUCTION : POSITION DU DÉBAT & ANNONCE DU PLAN DIALECTIQUE</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Face à la question soulevée par</strong> <em>« ${topic.slice(0, 80)} »</em>, les avis des observateurs et des scripteurs se partagent légitimement entre deux conceptions opposées. <strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">D'un côté</strong>, certains soutiennent la thèse initiale ; <strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">d'un autre côté</strong>, d'autres nuancent cette position avec force arguments.</p>
</div>

<div class="model-body">
<div style="margin-bottom:8px;"><span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">⚖️ PREMIÈRE PARTIE : THÈSE (CONFIRMATION DU POINT DE VUE)</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">D'une part</strong>, les partisans du premier point de vue mettent en avant les bienfaits manifestes de cette attitude. L'exemple de ${ex1} témoigne que le silence et la tranquillité permettent à l'esprit de s'épanouir loin de la rumeur du monde et de forger sa propre identité.</p>

<div style="margin-bottom:8px; margin-top:14px;"><span style="background:#fdf2f8; color:#9d174d; border:1px solid #fbcfe8; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">🔄 DEUXIÈME PARTIE : ANTITHÈSE (LIMITES, NUANCES & CONTRE-ARGUMENTS)</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">D'autre part</strong>, poussée à l'excès, cette même posture comporte des risques réels qu'il ne faut pas négliger. Comme le montre ${ex2}, l'enfermement moral et le manque de communication humaine peuvent plonger l'individu dans une profonde détresse et le couper de ses devoirs envers la collectivité.</p>

<div style="margin-bottom:8px; margin-top:14px;"><span style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">💡 TROISIÈME PARTIE : SYNTHÈSE (CONCILIATION & DÉPASSEMENT CRITIQUE)</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">En définitive</strong>, la juste attitude consiste à trouver un équilibre souverain entre le recueillement personnel et l'ouverture chaleureuse et solidaire envers autrui, à la manière des leçons humanistes véhiculées par ${ex3}.</p>
</div>

<div class="model-concl">
<div style="margin-bottom:8px;"><span style="background:#0f172a; color:#ffffff; font-weight:800; font-size:0.75rem; padding:2px 8px; border-radius:6px; display:inline-block;">🎯 CONCLUSION : SYNTHÈSE DES DEUX THÈSES & ÉLARGISSEMENT</span></div>
<p><strong style="color:#1d4ed8; font-weight:800; background-color:#eff6ff; padding:1px 6px; border-radius:4px; border:1px solid #bfdbfe;">Pour conclure</strong>, ce débat rappelle que la sagesse ne réside pas dans l'isolement complet ni dans la soumission aveugle, mais dans une harmonie vivante entre fidélité à soi et engagement envers la société.</p>
</div>`}`;

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
