const express = require('express');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- LlamaIndex (vector DB integration) ---
require('dotenv').config();
const { VectorStoreIndex, Document, Settings } = require('llamaindex');
const { OpenAIEmbedding } = require('@llamaindex/openai');

// Configuration OpenAI Embedding
Settings.embedModel = new OpenAIEmbedding({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small' // ou 'text-embedding-ada-002' si besoin
});

// --- Orkes (workflow orchestration via HTTP API) ---
// Fonction pour obtenir le JWT token Orkes
const getOrkesToken = async () => {
  const response = await fetch(`${process.env.ORKES_SERVER_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      keyId: process.env.ORKES_KEY_ID,
      keySecret: process.env.ORKES_KEY_SECRET
    })
  });
  
  const responseText = await response.text();
  try {
    // Essaie de parser en JSON
    const result = JSON.parse(responseText);
    return result.token;
  } catch (e) {
    // Si ce n'est pas du JSON, utilise directement le texte comme token
    return responseText;
  }
};

// Fonctions pour appeler directement l'API REST Orkes
const startWorkflowHTTP = async (workflowName, input) => {
  const token = await getOrkesToken();
  const response = await fetch(`${process.env.ORKES_SERVER_URL}/workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': token
    },
    body: JSON.stringify({
      name: workflowName,
      input: input || {}
    })
  });
  
  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch (e) {
    // Si ce n'est pas du JSON, retourne le texte brut
    return responseText;
  }
};

const getWorkflowHTTP = async (workflowId) => {
  const token = await getOrkesToken();
  const response = await fetch(`${process.env.ORKES_SERVER_URL}/workflow/${workflowId}?includeTasks=true`, {
    method: 'GET',
    headers: {
      'X-Authorization': token
    }
  });
  
  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch (e) {
    // Si ce n'est pas du JSON, retourne le texte brut
    return responseText;
  }
};

// Endpoint pour démarrer un workflow Orkes
app.post('/start-workflow', async (req, res) => {
  try {
    const { name, input } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing workflow name in request body.' });
    
    const result = await startWorkflowHTTP(name, input);
    res.json({ workflowId: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint pour récupérer le status d'un workflow Orkes
app.get('/workflow-status/:id', async (req, res) => {
  try {
    const wf = await getWorkflowHTTP(req.params.id);
    res.json(wf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Datadog MCP (monitoring/telemetry) ---
const { v1: datadog } = require('@datadog/datadog-api-client');
const datadogMetrics = new datadog.MetricsApi();
const sendDatadogMetric = async (metric, value = 1) => {
  try {
    await datadogMetrics.submitMetrics({
      body: {
        series: [
          {
            metric: metric,
            type: 1, // gauge
            points: [[Math.floor(Date.now() / 1000), value]],
            tags: ['app:movemind']
          }
        ]
      }
    });
  } catch (e) {
    console.error('Datadog metric error:', e.message);
  }
};

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, MoveMind!');
});

// Onboarding simulation: lecture du CSV
const fs = require('fs');
const csv = require('csv-parser');

// Stockage de l'index en mémoire (singleton pour la session serveur)
let onboardingIndex = null;

// LlamaIndex: indexation du CSV onboarding
app.post('/index-onboarding', async (req, res) => {
  const results = [];
  try {
    fs.createReadStream('./onboarding.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Conversion des champs numériques
        const parsed = results.map(row => ({
          timestamp: row.timestamp,
          heart_rate: parseInt(row.heart_rate, 10),
          steps: parseInt(row.steps, 10)
        }));
        // Création du document pour LlamaIndex
        const doc = new Document({
          id_: 'Agent Data',
          text: JSON.stringify(parsed, null, 2)
        });
        // Indexation dans LlamaIndex
        try {
          onboardingIndex = await VectorStoreIndex.fromDocuments([doc]);
          res.json({ success: true, message: 'Onboarding data indexed in LlamaIndex as Agent Data.' });
        } catch (err) {
          res.status(500).json({ error: 'Erreur lors de l\'indexation LlamaIndex', details: err.message });
        }
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Erreur lecture CSV', details: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: 'Erreur générale', details: err.message });
  }
});

// Ajout OpenAI LLM pour génération de réponse coach
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/query-onboarding', async (req, res) => {
  try {
    if (!onboardingIndex) {
      return res.status(400).json({ error: 'Onboarding index not initialized. Please POST /index-onboarding first.' });
    }
    const query = req.body.query;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body.' });
    }
    const retriever = onboardingIndex.asRetriever();
    const results = await retriever.retrieve(query);
    const passages = results.map(r => r.node.text).join('\n');
    // Génération de la réponse coach avec OpenAI LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: "system", content: "You are a friendly, supportive fitness coach. Always answer in the same language as the user's question (English or French). Give clear explanations, personalized advice, and motivation based on the user's data. Be concise, positive, and precise." },
        { role: "user", content: `Question : ${query}\nDonnées :\n${passages}` }
      ]
    });
    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la recherche ou de la génération IA', details: err.message });
  }
});

// --- Envoi quotidien de messages motivation/conseil (MVP : console.log) ---
const motivationalMessages = [
  "N'oublie pas : chaque pas compte !",
  "Hydrate-toi et bouge un peu aujourd'hui !",
  "Ta régularité fait la différence.",
  "Bravo pour tes efforts, continue comme ça !",
  "Un petit entraînement vaut mieux que rien."
];
const sendDailyMotivation = () => {
  const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  const now = new Date().toLocaleString();
  console.log(`[Motivation ${now}] ${msg}`);
};
// Planifie l'envoi chaque jour à 8h (MVP: toutes les 60s pour démo)
setInterval(sendDailyMotivation, 60 * 1000);

app.get('/onboarding', (req, res) => {
  const results = [];
  fs.createReadStream('./onboarding.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Convertit les champs numériques
      const parsed = results.map(row => ({
        timestamp: row.timestamp,
        heart_rate: parseInt(row.heart_rate, 10),
        steps: parseInt(row.steps, 10)
      }));
      res.json({ onboarding: parsed });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'Erreur lecture CSV', details: err.message });
    });
});

// Endpoint stub: /data-ingest
app.post('/data-ingest', (req, res) => {
  // Simule l'indexation des données utilisateur
  res.json({ indexedData: { userId: 1, summary: 'User data indexed!' } });
});

// Endpoint stub: /generate-plan
app.post('/generate-plan', async (req, res) => {
  // Simule la génération d'un plan
  await sendDatadogMetric('plan.generated');
  res.json({ plan: { days: [
    { day: 'Monday', activity: 'Cardio' },
    { day: 'Tuesday', activity: 'Strength' }
  ], message: 'Plan generated!' } });
});

// Endpoint stub: /send-plan
app.post('/send-plan', (req, res) => {
  // Simule l'envoi du plan
  res.json({ status: 'Plan sent to user!' });
});

// Endpoint stub: /collect-feedback
app.post('/collect-feedback', async (req, res) => {
  // Simule la collecte de feedback
  await sendDatadogMetric('feedback.received');
  res.json({ feedbackReceived: true, message: 'Feedback collected!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
