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

// Initialisation de l'API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    // Liste des modèles à essayer par ordre de priorité
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Tentative d'utilisation du modèle : ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const instructions = `Tu es l'expert du Centre Al Akhawayn. Analyse cette production écrite (Bac Maroc). 
            Note sur 10, souligne les erreurs en <span class='error-highlight'>...</span> et les connecteurs en <b class='connector-bold'>...</b>. 
            Affiche un tableau de correction et un modèle parfait.`;

            const result = await model.generateContent(`${instructions}\n\nTexte de l'élève :\n${req.body.prompt}`);
            const response = await result.response;
            const text = response.text();

            // Si on arrive ici, c'est que ça a marché !
            console.log(`Succès avec le modèle : ${modelName}`);
            return res.json({ result: text });

        } catch (error) {
            lastError = error;
            console.error(`Échec avec ${modelName} : ${error.message}`);
            // Si c'est une erreur 404, on passe au modèle suivant dans la boucle
            continue;
        }
    }

    // Si on arrive ici, aucun modèle n'a fonctionné
    res.status(500).json({ 
        error: "L'IA est indisponible.", 
        message: lastError ? lastError.message : "Erreur inconnue" 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur actif sur le port ${PORT}`);
});
