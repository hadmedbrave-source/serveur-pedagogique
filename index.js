import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@google/genai';

// Configuration pour gérer les dossiers avec le mode "ES Modules"
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- INITIALISATION DU CLIENT GOOGLE GEMINI ---
// Il utilise la clé API (AQ...) que vous avez mise dans Railway
const client = createClient({ 
    apiKey: process.env.GOOGLE_API_KEY 
});

// Route pour afficher votre interface index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LOGIQUE DE CORRECTION PÉDAGOGIQUE ---
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Aucun texte reçu." });
        }

        // On utilise le modèle Gemini 1.5 Flash (Ultra-rapide)
        const response = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                role: "user",
                parts: [{
                    text: `Tu es l'expert et examinateur du Centre Al Akhawayn. Ta mission est de corriger une production écrite pour le Baccalauréat Marocain.

                    RÈGLES STRICTES DE RÉPONSE :
                    1. HORS-SUJET : Si le texte ne respecte pas le sujet, affiche : <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div> et explique pourquoi.
                    
                    2. NOTATION : Donne une note sur 10 points (Barème : Consigne 2, Plan 2, Arguments 2, Langue 2.5, Lexique 1.5).
                    
                    3. TRANSCRIPTION ANNOTÉE : Réécris le texte de l'élève.
                       - Souligne les fautes en rouge avec : <span class="error-highlight">...</span>
                       - Met les connecteurs logiques en gras avec : <b class="connector-bold">...</b>
                    
                    4. TABLEAU : Erreur | Nature | Correction.
                    
                    5. MODÈLE D'EXCELLENCE : Rédige la version parfaite.
                       - Si opinion : Plan Dialectique (Thèse/Antithèse/Synthèse).
                       - Si causes/conséquences : Plan Analytique.

                    Voici le texte de l'élève : ${prompt}`
                }]
            }]
        });

        // Extraction de la réponse selon la structure du nouveau SDK
        const outputText = response.candidates[0].content.parts[0].text;
        
        res.json({ result: outputText });

    } catch (error) {
        console.error("ERREUR IA :", error);
        res.status(500).json({ 
            error: "L'IA est indispo
