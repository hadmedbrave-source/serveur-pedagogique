import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- INITIALISATION AVEC CLÉ AQ ---
const client = createClient({ 
    apiKey: process.env.GOOGLE_API_KEY 
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        const response = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                role: "user",
                parts: [{
                    text: `Tu es l'expert du Centre Al Akhawayn. Analyse cette production écrite (Bac Maroc).
                    
                    CONSIGNES DE MISE EN FORME :
                    1. Si hors-sujet : <div class="hors-sujet-alert">⚠️ HORS-SUJET - NOTE : 00/10</div>.
                    2. Sinon, note sur 10.
                    3. Transcription : Souligne les erreurs en <span class="error-highlight">...</span> et les connecteurs en <b class="connector-bold">...</b>.
                    4. Tableau : Erreur | Nature | Correction.
                    5. Modèle d'excellence : Plan Dialectique ou Analytique.

                    Texte de l'élève : ${prompt}`
                }]
            }]
        });

        // Récupération du texte pour le nouveau SDK
        const text = response.candidates[0].content.parts[0].text;
        res.json({ result: text });

    } catch (error) {
        console.error("ERREUR CLÉ AQ :", error.message);
        res.status(500).json({ error: "L'IA est indisponible.", message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Centre Al Akhawayn (Clé AQ) prêt sur le port ${PORT}`);
});
