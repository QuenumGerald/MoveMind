# MoveMind

## Onboarding (Simulation CSV)

Le projet inclut un onboarding simulé via un fichier CSV. Ce fichier contient les mesures de base de l'utilisateur lors de son arrivée (timestamp, heart_rate, steps).

### Format attendu du CSV

- `timestamp` : date et heure ISO 8601 (UTC)
- `heart_rate` : fréquence cardiaque moyenne en BPM (entier)
- `steps` : nombre de pas depuis le dernier relevé (entier)

### Exemple de données (`onboarding.csv`)

```csv
timestamp,heart_rate,steps
2025-07-25T08:00:00Z,72,1200
2025-07-25T12:00:00Z,80,3400
2025-07-25T18:30:00Z,65,2100
2025-07-26T08:15:00Z,78,1800
2025-07-26T13:00:00Z,85,4100
2025-07-26T19:00:00Z,70,2300
```

### Tester l'endpoint onboarding

Lance le serveur puis accède à :
```
GET http://localhost:3000/onboarding
```
Tu obtiendras un JSON structuré avec toutes les mesures du CSV, prêt à être utilisé pour simuler l'onboarding MoveMind.

---


## Orkes Workflow (POC)

Ce projet utilise un workflow Orkes pour simuler un pipeline de coaching fitness personnalisé, orchestré de bout en bout. Le workflow enchaîne ingestion de données, génération de plan, envoi et feedback, le tout via des endpoints Express locaux stubés.

### À quoi sert ce workflow ?
- **POC (Proof of Concept)** pour MoveMind : permet de tester l'orchestration sans microservices réels.
- **Démo** : chaque étape du coaching (ingest, plan, feedback) est simulée pour valider l'intégration Orkes.
- **Facilement remplaçable** : il suffira plus tard de changer les URLs pour brancher les vrais services.

### Structure du workflow Orkes

```json
{
  "name": "movemind",
  "description": "End-to-end MoveMind POC: ingest -> plan -> feedback",
  "version": 1,
  "schemaVersion": 2,
  "restartable": true,
  "workflowStatusListenerEnabled": false,
  "inputParameters": ["userData"],
  "tasks": [
    {
      "name": "DataIngestTask",
      "taskReferenceName": "dataIngest",
      "type": "HTTP",
      "inputParameters": {
        "http_request": {
          "uri": "http://localhost:3000/data-ingest",
          "method": "POST",
          "body": "${workflow.input.userData}"
        }
      },
      "outputParameters": {
        "indexedData": "${httpResponse.body.indexedData}"
      }
    },
    {
      "name": "GeneratePlanTask",
      "taskReferenceName": "genPlan",
      "type": "HTTP",
      "inputParameters": {
        "http_request": {
          "uri": "http://localhost:3000/generate-plan",
          "method": "POST",
          "body": "${dataIngest.output.indexedData}"
        }
      },
      "outputParameters": {
        "plan": "${httpResponse.body.plan}"
      }
    },
    {
      "name": "SendPlanTask",
      "taskReferenceName": "sendPlan",
      "type": "HTTP",
      "inputParameters": {
        "http_request": {
          "uri": "http://localhost:3000/send-plan",
          "method": "POST",
          "body": "${genPlan.output.plan}"
        }
      }
    },
    {
      "name": "CollectFeedbackTask",
      "taskReferenceName": "collectFb",
      "type": "HTTP",
      "inputParameters": {
        "http_request": {
          "uri": "http://localhost:3000/collect-feedback",
          "method": "POST",
          "body": "${workflow.input.userData}"
        }
      }
    }
  ],
  "outputParameters": {},
  "ownerEmail": "geraldquenum9@gmail.com",
  "timeoutPolicy": "ALERT_ONLY",
  "timeoutSeconds": 0,
  "failureWorkflow": "",
  "enforceSchema": true
}
```

### Explication des étapes

- **DataIngestTask** :
  - Appelle `/data-ingest` (POST) avec les données utilisateur.
  - Simule l'indexation (retourne `indexedData`).
- **GeneratePlanTask** :
  - Appelle `/generate-plan` (POST) avec les données indexées.
  - Simule la génération d'un plan personnalisé.
- **SendPlanTask** :
  - Appelle `/send-plan` (POST) avec le plan généré.
  - Simule l'envoi du plan à l'utilisateur.
- **CollectFeedbackTask** :
  - Appelle `/collect-feedback` (POST) avec les données utilisateur ou un feedback simulé.
  - Simule la collecte du feedback.

### Utilisation

1. **Lancer le serveur Express local** (voir server.js).
2. **Importer ce workflow JSON dans Orkes** (menu Import Workflow).
3. **Exécuter le workflow** en fournissant un objet `userData` en entrée, par exemple :
   ```json
   {
     "userData": {
       "userId": 1,
       "goals": "Perdre 5kg",
       "history": []
     }
   }
   ```
4. **Vérifier dans Orkes** que chaque étape passe (statut success).

---

Quand tes microservices seront prêts, il suffira de remplacer les URLs dans ce workflow.


## 📊 Monitoring & Datadog MCP

MoveMind envoie des métriques personnalisées à Datadog pour le monitoring et le dashboarding en temps réel.

### Métriques envoyées
- `plan.generated` : incrémentée à chaque appel de `/generate-plan`
- `feedback.received` : incrémentée à chaque appel de `/collect-feedback`
- Tag commun : `app:movemind`

### Configuration Datadog
1. **Créer une API Key Datadog** :
   - Va dans [Datadog > Organization Settings > API Keys](https://app.datadoghq.com/organization-settings/api-keys)
   - Clique sur "New Key", donne-lui un nom, copie la valeur.
2. **Ajoute la clé dans `.env`** :
   ```
   DD_API_KEY=ta_cle_api_datadog
   ```
3. **Redémarre le serveur** :
   ```bash
   npm start
   ```

### Visualiser les métriques
- Va dans [Datadog Metrics Explorer](https://app.datadoghq.com/metrics/explorer)
- Recherche `plan.generated` ou `feedback.received`
- Filtre par le tag `app:movemind` pour isoler les métriques MoveMind
- Ajoute des widgets à un dashboard pour suivre l'activité en temps réel


## 🚦 Endpoints & Effet Monitoring

| Endpoint                | Effet Datadog                | Description                                 |
|------------------------|------------------------------|---------------------------------------------|
| `/generate-plan`       | +1 sur `plan.generated`      | Génère un plan sportif (stub/demo)          |
| `/collect-feedback`    | +1 sur `feedback.received`   | Simule la collecte de feedback utilisateur  |

Chaque appel à ces endpoints envoie automatiquement la métrique correspondante à Datadog MCP.

---