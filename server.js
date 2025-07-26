const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- LlamaIndex (vector DB integration) ---
const { VectorStoreIndex, SimpleDocument } = require('llamaindex');
// TODO: Configure your LlamaIndex provider, e.g. OpenAI, Cohere, etc.
// Example: const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });

// --- Orkes (workflow orchestration) ---
const { OrkesApiConfig, orkesConductorClient } = require('@io-orkes/conductor-javascript');
// TODO: Configure Orkes client with your API keys and endpoint
// Example:
// const orkesConfig = new OrkesApiConfig({
//   keyId: process.env.ORKES_KEY_ID,
//   keySecret: process.env.ORKES_KEY_SECRET,
//   serverUrl: process.env.ORKES_SERVER_URL
// });
// const orkesClient = orkesConductorClient(orkesConfig);

// --- Datadog MCP (monitoring/telemetry) ---
const { v1: datadog } = require('@datadog/datadog-api-client');
// TODO: Configure Datadog API client
// Example:
// const configuration = datadog.createConfiguration();
// const apiInstance = new datadog.MetricsApi(configuration);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, MoveMind!');
});

// Onboarding simulation: lecture du CSV
const fs = require('fs');
const csv = require('csv-parser');

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
app.post('/generate-plan', (req, res) => {
  // Simule la génération d'un plan
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
app.post('/collect-feedback', (req, res) => {
  // Simule la collecte de feedback
  res.json({ feedbackReceived: true, message: 'Feedback collected!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
