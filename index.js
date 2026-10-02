import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- INITIALISATION ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // On utilise le modèle Flash 1.5 (le plus rapide)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const instructions = `Tu es l'expert du Centre Al Akhawayn. Analyse cette production écrite (Bac Maroc).
        1. Si hors-sujet : alerte rouge <div class="hors-sujet-alert"> et note 0.
        2. Sinon note sur 10.
        3. Transcription : Erreurs en <span class="error-highlight"> et connecteurs en <b class="connector-bold">.
        4. Tableau de correction et modèle parfait.`;

        const result = await model.generateContent(`${instructions}\n\nTexte : ${prompt}`);
        const response = await result.response;
        res.json({ result: response.text() });

    } catch (error) {
        console.error("ERREUR IA :", error.message);
        res.status(500).json({ error: "L'IA est indisponible.", message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur prêt sur le port ${PORT}`);
});
