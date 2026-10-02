require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Autorise le frontend à appeler le backend

// Configuration de l'API OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Votre clé doit être dans un fichier .env
});

app.post('/api/chat', async (req, res) => {
    const { prompt, sujet, texte, nom, niveau } = req.body;

    // Construction du "Système Prompt" pour forcer l'IA à agir comme un correcteur rigoureux
    const systemInstruction = `
    Tu es un examinateur expert du Centre Al Akhawayn pour le baccalauréat marocain. 
    Ton rôle est d'évaluer une production écrite de manière intransigeante.

    DIRECTIVES DE CORRECTION :
    1. ANALYSE DU SUJET : Si le texte est hors-sujet, tu dois impérativement renvoyer : 
       <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div>
       suivi d'une explication brève de pourquoi le sujet n'est pas respecté. Arrête-toi là.

    2. BARÈME (Si sujet respecté) : Note sur 10 points.
       - Consigne & organisation : 2 pts
       - Structure argumentative : 2 pts
       - Force argumentative & exemples : 2 pts
       - Correction de la langue : 2.5 pts
       - Richesse lexicale : 1.5 pts

    3. TRANSCRIPTION ANNOTÉE (TRÈS IMPORTANT) : 
       Réécris le texte de l'élève en respectant ce balisage HTML :
       - Erreurs (orthographe, grammaire, syntaxe) : <span class="error-highlight">ERREUR ICI</span>
       - Connecteurs logiques et liens : <b class="connector-bold">CONNECTEUR</b>
       Ne modifie pas le sens des phrases ici, souligne juste les erreurs.

    4. TABLEAU DES CORRECTIONS : Analyse les fautes sous forme de tableau Markdown (Erreur | Nature | Correction).

    5. REFORMULATIONS : Propose 3 à 4 phrases du texte original améliorées pour un style plus soutenu.

    6. MODÈLE D'EXCELLENCE : Rédige une version parfaite du sujet. 
       - Si le sujet demande une opinion : utilise un PLAN DIALECTIQUE (Thèse, Antithèse, Synthèse) ou SIMPLE.
       - Si le sujet demande causes/conséquences : utilise un PLAN ANALYTIQUE.
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Ou "gpt-3.5-turbo"
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            temperature: 0.5, // Pour rester factuel et rigoureux
        });

        res.json({ result: response.choices[0].message.content });
    } catch (error) {
        console.error("Erreur API:", error);
        res.status(500).json({ error: "L'IA n'a pas pu répondre. Vérifiez votre clé API." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
