const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// INITIALISATION DE L'INTELLIGENCE ARTIFICIELLE
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// GESTION DE LA SESSION PROFESSEUR CÔTÉ SERVEUR
let professeurAuthentifie = false;

// SERVIR LES FICHIERS STATIQUES DE L'INTERFACE
app.use(express.static(path.join(__dirname, 'public')));

// ROUTE DE VÉRIFICATION DU MOT DE PASSE
app.post('/api/connexion', (req, res) => {
    const { password } = req.body;
    if (password === 'Akhawayn2026!') {
        professeurAuthentifie = true;
        return res.json({ success: true, message: 'Authentification réussie.' });
    }
    return res.status(403).json({ success: false, message: 'Mot de passe incorrect.' });
});

// ROUTE POUR VÉRIFIER SI LE PROFESSEUR EST CONNECTÉ
app.get('/api/verifier-session', (req, res) => {
    return res.json({ professeurAuthentifie });
});

// ANALYSE PÉDAGOGIQUE ET CORRECTION DE LA COPIE DE L'ÉLÈVE
app.post('/api/evaluer', async (req, res) => {
    const { texteEleve, niveauScolaire, sujet } = req.body;

    if (!texteEleve) {
        return res.status(400).json({ error: "Le texte de l'élève est requis." });
    }

    try {
        const promptSysteme = `
Tu es un expert en didactique du français et correcteur officiel pour le Centre Pro-Langues & Prépa Concours. 
Analyse la copie de l'élève pour le niveau "${niveauScolaire}" sur le sujet "${sujet}".

Tu dois impérativement répondre sous la forme d'un objet JSON strict contenant les clés suivantes :
1. "texteTranscrit": Le texte de l'élève corrigé et formaté en HTML. 
   - Les liens logiques doivent être en **noir et en gras** (ex: <strong>En premier lieu</strong>).
   - Les fautes d'orthographe, de grammaire, de conjugaison ou de syntaxe doivent apparaître en rouge (ex: <span style="color:red; font-weight:bold;">faute</span>).
2. "tableauErreurs": Un tableau d'objets listant chaque erreur détectée avec les clés "erreur" et "correction".
3. "recommandations": Un tableau de chaînes de caractères listant les remarques et recommandations pédagogiques.
4. "texteOptimise": Le texte modèle optimisé et unifié, rigoureusement structuré selon le plan analytique.
5. "titreTexteOptimise": Doit être exactement la chaîne de caractères : "Basé sur les reformulations recommandées".

Réponds uniquement avec le JSON valide, sans markdown superflu autour si possible, ou bien dans un bloc JSON standard.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [promptSysteme, `Copie de l'élève :\n${texteEleve}`],
            config: {
                responseMimeType: 'application/json'
            }
        });

        const resultJson = JSON.parse(response.text());
        return res.json(resultJson);

    } catch (error) {
        console.error("Erreur lors de l'évaluation avec Gemini :", error);
        return res.status(500).json({ error: "Erreur interne du serveur lors de l'analyse pédagogique." });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur additionnel du Centre Pro-Langues & Prépa Concours démarré sur le port ${PORT} !`);
});
