require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURATION ---
app.use(express.json());
app.use(cors()); // Autorise la communication entre centrealakhawayn.com et Railway

// Initialisation de l'IA Google avec la clé API que vous allez mettre sur Railway
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- LOGIQUE DE L'EXPERT PÉDAGOGIQUE ---
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Aucune donnée reçue de l'élève." });
        }

        // Configuration du modèle Gemini 1.5 Flash (Rapide et précis)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `Tu es l'examinateur en chef du Centre Al Akhawayn. Ton rôle est de corriger les productions écrites du baccalauréat marocain avec une rigueur absolue.

            PLAN DE RÉPONSE OBLIGATOIRE (en Markdown) :

            1. DÉTECTION HORS-SUJET : 
               Si le texte ne répond pas au sujet, affiche uniquement : 
               <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div>
               Puis explique pourquoi brièvement. Ne fais pas la suite de la correction.

            2. BILAN DE NOTATION (Si sujet respecté) : 
               Établis une note sur 10 selon ce barème :
               - Consigne & organisation : /2.0
               - Structure argumentative du plan : /2.0
               - Force argumentative & exemples : /2.0
               - Correction de la langue : /2.5
               - Richesse lexicale : /1.5

            3. TRANSCRIPTION ANNOTÉE :
               Réécris le texte de l'élève en appliquant ce balisage :
               - Erreurs (orthographe, grammaire, conjugaison) : <span class="error-highlight">...</span>
               - Liens logiques et connecteurs : <b class="connector-bold">...</b>

            4. TABLEAU DES CORRECTIONS :
               | Erreur | Nature de l'erreur | Correction proposée |

            5. REFORMULATIONS D'EXCELLENCE :
               Identifie les phrases faibles et propose 3 reformulations de haut niveau.

            6. MODÈLE OPTIMISÉ :
               Rédige le texte parfait. 
               - Si le sujet demande une opinion : utilise un PLAN DIALECTIQUE (Thèse/Antithèse/Synthèse) ou un PLAN SIMPLE structuré.
               - Si le sujet demande des causes et conséquences : utilise un PLAN ANALYTIQUE.`
        });

        // Appel à l'IA
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Envoi de la réponse au site web
        res.json({ result: text });

    } catch (error) {
        console.error("Erreur avec l'API Gemini:", error);
        res.status(500).json({ error: "Le serveur pédagogique Google Gemini ne répond pas. Vérifiez la clé API sur Railway." });
    }
});

// --- DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Centre Al Akhawayn (Gemini) opérationnel sur le port ${PORT}`);
});
