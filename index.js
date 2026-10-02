require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialisation de l'API avec la clé Railway
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        // CHANGEMENT ICI : On utilise le nom court "gemini-1.5-flash"
        // C'est le nom le plus compatible avec l'endpoint v1beta
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash" 
        });

        const instructions = `Tu es l'expert du Centre Al Akhawayn. Analyse cette production écrite (Bac Maroc). 
        1. Si hors-sujet, alerte rouge et note 0. 
        2. Sinon note sur 10. 
        3. Souligne les erreurs en <span class='error-highlight'>...</span> et les connecteurs en <b class='connector-bold'>...</b>. 
        4. Tableau de correction et modèle parfait.`;

        // Configuration de sécurité pour éviter les blocages par erreur
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${instructions}\n\nTexte : ${prompt}` }] }],
            safetySettings
        });

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
