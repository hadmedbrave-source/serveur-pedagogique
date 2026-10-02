require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
// On utilise la bibliothèque installée dans votre package.json
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialisation avec la clé que vous avez mise sur Railway
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        // On utilise le modèle STABLE : gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const instructions = `Tu es l'expert du Centre Al Akhawayn. Analyse cette production écrite. 
        Note sur 10, souligne les erreurs en <span class='error-highlight'>...</span> et les connecteurs en <b class='connector-bold'>...</b>. 
        Affiche un tableau de correction et un modèle parfait.`;

        // La méthode officielle Google est generateContent
        const result = await model.generateContent(`${instructions}\n\nTexte : ${prompt}`);
        const response = await result.response;
        const text = response.text();

        res.json({ result: text });

    } catch (error) {
        console.error("ERREUR :", error.message);
        res.status(500).json({ error: "L'IA est indisponible.", message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur prêt sur le port ${PORT}`);
});
