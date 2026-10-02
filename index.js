// On tente de charger dotenv pour le local, Railway l'ignorera si le fichier est absent
require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();

// --- CONFIGURATION ---
app.use(express.json());
app.use(cors()); // INDISPENSABLE pour que votre HTML puisse communiquer avec Railway

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Railway récupère la clé ici
});

// --- LOGIQUE D'ÉVALUATION ---
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Aucune donnée reçue." });
        }

        const systemPrompt = `
        Tu es un examinateur expert et intransigeant du Centre Al Akhawayn pour le baccalauréat au Maroc.
        
        TES MISSIONS :
        1. VÉRIFICATION DU SUJET : Si le texte de l'élève ne traite absolument pas du sujet demandé, tu dois renvoyer IMMEDIATEMENT :
           <div class="hors-sujet-alert">⚠️ HORS-SUJET DÉTECTÉ - NOTE : 00/10</div>
           Explique brièvement pourquoi c'est hors-sujet et arrête-toi là.

        2. NOTATION (Si sujet respecté) : Applique strictement ce barème sur 10 :
           - Consigne & organisation : 2.0 Pts
           - Structure argumentative du plan : 2.0 Pts
           - Force argumentative & exemples : 2.0 Pts
           - Correction de la langue : 2.5 Pts
           - Richesse lexicale : 1.5 Pts

        3. TRANSCRIPTION VISUELLE : 
           Réécris le texte de l'élève. 
           - Entoure les fautes par : <span class="error-highlight">...</span> (ex: <span class="error-highlight">J'ai allé</span>)
           - Entoure les connecteurs logiques par : <b class="connector-bold">...</b> (ex: <b class="connector-bold">Cependant</b>)

        4. TABLEAU DES ERREURS : Crée un tableau Markdown avec les colonnes : Erreur | Nature | Correction.

        5. REFORMULATIONS : Propose 3 phrases clés à améliorer pour un niveau de langue soutenu.

        6. MODÈLE D'EXCELLENCE : Rédige la version optimale.
           - Choix du plan : Si le sujet demande une opinion (Partagez-vous... / Pensez-vous...), utilise un PLAN DIALECTIQUE (Thèse/Antithèse/Synthèse) ou SIMPLE.
           - Si le sujet demande les causes et les conséquences, utilise un PLAN ANALYTIQUE.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Ou "gpt-3.5-turbo" selon votre budget
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.3, // Température basse pour une correction plus stable et sérieuse
        });

        res.json({ result: response.choices[0].message.content });

    } catch (error) {
        console.error("Erreur serveur:", error);
        res.status(500).json({ error: "L'IA ne répond pas. Vérifiez la clé API sur Railway." });
    }
});

// --- DÉMARRAGE DU SERVEUR ---
// Railway utilise process.env.PORT, en local on utilise 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Centre Al Akhawayn actif sur le port ${PORT}`);
});
