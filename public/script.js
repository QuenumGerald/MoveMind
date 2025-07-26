// Utility functions
function showLoading(outputId, button) {
  const output = document.getElementById(outputId);
  output.textContent = '⏳ Loading...';
  output.style.display = 'block';
  button.classList.add('loading');
  button.textContent = 'Loading...';
}

function showResult(outputId, button, data, originalText) {
  const output = document.getElementById(outputId);
  button.classList.remove('loading');
  button.textContent = originalText;
  
  if (typeof data === 'string') {
    output.textContent = data;
  } else {
    output.textContent = JSON.stringify(data, null, 2);
  }
  output.style.display = 'block';
}

function showError(outputId, button, error, originalText) {
  const output = document.getElementById(outputId);
  button.classList.remove('loading');
  button.textContent = originalText;
  output.textContent = `❌ Error: ${error.message || error}`;
  output.style.display = 'block';
  output.style.color = '#f56565';
  setTimeout(() => {
    output.style.color = '#2d3748';
  }, 3000);
}

async function fetchOnboarding() {
  const button = event.target;
  const originalText = button.textContent;
  
  try {
    showLoading('onboardingOutput', button);
    const res = await fetch('/onboarding');
    const data = await res.json();
    showResult('onboardingOutput', button, data, originalText);
  } catch (error) {
    showError('onboardingOutput', button, error, originalText);
  }
}

async function indexOnboarding() {
  const button = event.target;
  const originalText = button.textContent;
  
  try {
    showLoading('indexOutput', button);
    const res = await fetch('/index-onboarding', { method: 'POST' });
    const data = await res.json();
    showResult('indexOutput', button, data, originalText);
  } catch (error) {
    showError('indexOutput', button, error, originalText);
  }
}

async function queryOnboarding() {
  const button = event.target;
  const originalText = button.textContent;
  const query = document.getElementById('queryInput').value.trim();
  
  if (!query) {
    showError('queryOutput', button, 'Please enter a question', originalText);
    return;
  }
  
  try {
    showLoading('queryOutput', button);
    const res = await fetch('/query-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    
    // Format AI response nicely
    if (data.answer) {
      const output = document.getElementById('queryOutput');
      output.innerHTML = `<strong>🤖 AI Coach:</strong><br><br>${data.answer}`;
      output.style.fontFamily = 'inherit';
      output.style.lineHeight = '1.6';
    } else {
      showResult('queryOutput', button, data, originalText);
    }
    
    button.classList.remove('loading');
    button.textContent = originalText;
  } catch (error) {
    showError('queryOutput', button, error, originalText);
  }
}

async function startWorkflow() {
  const button = event.target;
  const originalText = button.textContent;
  const payload = document.getElementById('workflowInput').value.trim();
  
  if (!payload) {
    document.getElementById('workflowInput').value = '{ "name": "movemind", "input": { "userData": { "userId": 1, "goals": "Lose 5kg" } } }';
    return;
  }
  
  let json;
  try {
    json = JSON.parse(payload);
  } catch (e) {
    showError('workflowOutput', button, 'Invalid JSON format', originalText);
    return;
  }
  
  try {
    showLoading('workflowOutput', button);
    const res = await fetch('/start-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    });
    const data = await res.json();
    
    // Auto-fill workflow ID for status check
    if (data.workflowId) {
      document.getElementById('statusId').value = data.workflowId;
      const output = document.getElementById('workflowOutput');
      output.innerHTML = `<strong>✅ Workflow Started!</strong><br><br>Workflow ID: <code>${data.workflowId}</code><br><br>Click "Check Status" to monitor progress.`;
      output.style.fontFamily = 'inherit';
    } else {
      showResult('workflowOutput', button, data, originalText);
    }
    
    button.classList.remove('loading');
    button.textContent = originalText;
  } catch (error) {
    showError('workflowOutput', button, error, originalText);
  }
}

async function getWorkflowStatus() {
  const button = event.target;
  const originalText = button.textContent;
  const id = document.getElementById('statusId').value.trim();
  
  if (!id) {
    showError('statusOutput', button, 'Please enter a Workflow ID', originalText);
    return;
  }
  
  try {
    showLoading('statusOutput', button);
    const res = await fetch(`/workflow-status/${id}`);
    const data = await res.json();
    
    // Format workflow status nicely
    if (data.status) {
      const output = document.getElementById('statusOutput');
      const statusEmoji = {
        'COMPLETED': '✅',
        'RUNNING': '🔄',
        'FAILED': '❌',
        'PAUSED': '⏸️',
        'TERMINATED': '🛑'
      };
      
      output.innerHTML = `<strong>${statusEmoji[data.status] || '📊'} Status: ${data.status}</strong><br><br>`;
      
      if (data.tasks && data.tasks.length > 0) {
        output.innerHTML += '<strong>Tasks:</strong><br>';
        data.tasks.forEach(task => {
          const taskEmoji = statusEmoji[task.status] || '⚪';
          output.innerHTML += `${taskEmoji} ${task.taskType}: ${task.status}<br>`;
        });
      }
      
      output.innerHTML += `<br><details><summary>Full Details</summary><pre>${JSON.stringify(data, null, 2)}</pre></details>`;
      output.style.fontFamily = 'inherit';
    } else {
      showResult('statusOutput', button, data, originalText);
    }
    
    button.classList.remove('loading');
    button.textContent = originalText;
  } catch (error) {
    showError('statusOutput', button, error, originalText);
  }
}

// Auto-refresh workflow status every 5 seconds if there's an ID
setInterval(() => {
  const statusId = document.getElementById('statusId').value.trim();
  const statusOutput = document.getElementById('statusOutput');
  
  if (statusId && statusOutput.textContent.includes('RUNNING')) {
    getWorkflowStatus();
  }
}, 5000);

// Initialize default workflow JSON
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('workflowInput').value = JSON.stringify({
    "name": "movemind",
    "input": {
      "userData": {
        "userId": 1,
        "goals": "Lose 5kg",
        "currentWeight": "75kg",
        "targetWeight": "70kg"
      }
    }
  }, null, 2);
});
