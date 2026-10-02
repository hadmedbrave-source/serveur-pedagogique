require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURATION DE BASE ---
app.use(express.json());
app.use(cors());

// --- SERVIR LE SITE WEB (FRONTEND) ---
// Cette ligne dit au serveur d'afficher vos fichiers (index.html, etc.) 
// présents dans le dossier actuel.
app.use(express.static(path.join(__dirname)));

// Route pour afficher la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- CONFIGURATION DE L'IA GOOGLE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Données manquantes." });
        }

        // Configuration du modèle "Flash" (Rapide et efficace pour la correction)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `Tu es l'examinateur expert et intransigeant du Centre Al Akhawayn. 
            Ton rôle est de corriger les productions écrites pour le baccalauréat marocain.

            RÈGLES DE RÉPONSE (Format Markdown obligatoire) :

            1. ALERTE HORS-SUJET : 
               Si le texte de l'élève ne correspond pas au sujet, renvoie UNIQUEMENT :
               <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div>
               suivi d'une explication brève. Ne pas faire la suite de la correction.

            2. BARÈME DE NOTATION (Sur 10 points) :
               - Respect de la consigne & organisation : /2.0
               - Structure argumentative (Plan) : /2.0
               - Force des arguments & exemples : /2.0
               - Correction de la langue (Grammaire/Conjugaison) : /2.5
               - Richesse du lexique : /1.5

            3. TRANSCRIPTION ANNOTÉE : 
               Réécris le texte de l'élève. 
               - Marque les erreurs avec : <span class="error-highlight">...</span>
               - Marque les connecteurs logiques avec : <b class="connector-bold">...</b>

            4. TABLEAU DES CORRECTIONS : 
               Crée un tableau : Erreur | Nature | Correction.

            5. REFORMULATIONS : 
               Propose 3 phrases du texte original reformulées de façon élégante.

            6. TEXTE MODÈLE D'EXCELLENCE : 
               Rédige le corrigé idéal. 
               - Si le sujet demande une opinion : utilise un PLAN DIALECTIQUE (Thèse/Antithèse/Synthèse).
               - Si le sujet demande causes/conséquences : utilise un PLAN ANALYTIQUE.`
        });

        // Génération du rapport
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ result: text });

    } catch (error) {
        console.error("Erreur Gemini:", error);
        res.status(500).json({ error: "L'IA est indisponible. Vérifiez la clé API Google dans Railway." });
    }
});

// --- DÉMARRAGE DU SERVEUR ---
// Railway définit automatiquement le PORT. En local, ce sera 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Centre Al Akhawayn lancé sur le port ${PORT}`);
});
