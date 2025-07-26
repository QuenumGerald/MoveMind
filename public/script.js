async function fetchOnboarding() {
  const res = await fetch('/onboarding');
  const data = await res.json();
  document.getElementById('onboardingOutput').textContent = JSON.stringify(data, null, 2);
}

async function indexOnboarding() {
  const res = await fetch('/index-onboarding', { method: 'POST' });
  const data = await res.json();
  document.getElementById('indexOutput').textContent = JSON.stringify(data, null, 2);
}

async function queryOnboarding() {
  const query = document.getElementById('queryInput').value;
  const res = await fetch('/query-onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  document.getElementById('queryOutput').textContent = JSON.stringify(data, null, 2);
}

async function startWorkflow() {
  const payload = document.getElementById('workflowInput').value;
  let json;
  try { json = JSON.parse(payload); } catch (e) {
    document.getElementById('workflowOutput').textContent = 'Invalid JSON';
    return;
  }
  const res = await fetch('/start-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json)
  });
  const data = await res.json();
  document.getElementById('workflowOutput').textContent = JSON.stringify(data, null, 2);
}

async function getWorkflowStatus() {
  const id = document.getElementById('statusId').value;
  if (!id) return;
  const res = await fetch(`/workflow-status/${id}`);
  const data = await res.json();
  document.getElementById('statusOutput').textContent = JSON.stringify(data, null, 2);
}
