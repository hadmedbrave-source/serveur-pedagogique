require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURATION SERVEUR ---
app.use(express.json());
app.use(cors());

// Affiche votre page index.html automatiquement
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- CONFIGURATION IA GOOGLE ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Aucun texte reçu." });
        }

        // Utilisation du modèle le plus récent pour éviter l'erreur 404
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // On intègre les instructions directement dans le message envoyé à l'IA
        const instructions = `
        Tu es l'examinateur expert et rigoureux du Centre Al Akhawayn. 
        Ton rôle est de corriger la production écrite d'un élève (Baccalauréat Marocain).

        RÈGLES DE RÉPONSE (Format Markdown) :

        1. VÉRIFICATION DU SUJET
