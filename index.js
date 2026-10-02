require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialisation sécurisée
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("ERREUR : La variable GOOGLE_API_KEY est manquante dans Railway !");
}
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash"
        });

        // Version simplifiée pour assurer la compatibilité
        const systemInstruction = "Tu es l'examinateur expert du Centre Al Akhawayn. Corrige cette production écrite au Maroc. Utilise du HTML pour les fautes (<span class='error-highlight'>) et les connecteurs (<b>). Donne une note sur 10, un tableau de correction et un modèle parfait.";
        
        const fullPrompt = `${systemInstruction}\n\nVoici le texte à corriger :\n${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ result: text });

    } catch (error) {
        // C'EST ICI QUE VOUS VERREZ L'ERREUR DANS LES LOGS RAILWAY
        console.error("DÉTAIL DE L'ERREUR GEMINI :", error.message);
        
        res.status(500).json({ 
            error: "L'IA est indisponible.", 
            details: error.message // On renvoie le détail pour vous aider à débugger
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});
