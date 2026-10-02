require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURATION SERVEUR ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Route pour afficher la page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- CONFIGURATION IA GOOGLE ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Aucun texte reçu." });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const instructions = `Tu es l'examinateur expert du Centre Al Akhawayn.
        Corrige cette production écrite pour le baccalauréat marocain.
        RÈGLES :
        1. Si hors-sujet : <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div>.
        2. Sinon, note sur 10 (Consigne 2, Plan 2, Arguments 2, Langue 2.5, Lexique 1.5).
        3. Transcription : Erreurs en <span class="error-highlight">...</span> et connecteurs en <b class="connector-bold">...</b>.
        4. Tableau : Erreur | Nature | Correction.
        5. Modèle d'excellence : Plan Dialectique ou Analytique selon le sujet.`;

        const fullPrompt = `${instructions}\n\nTravail de l'élève :\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        res.json({ result: response.text() });

    } catch (error) {
        console.error("DÉTAIL DE L'ERREUR GEMINI :", error.message);
        res.status(500).json({ error: "L'IA est indisponible.", message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});
