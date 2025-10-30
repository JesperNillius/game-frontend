const IS_LIVE = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// The backend URL from your Render environment variables.
// ✅ Replace this placeholder with your actual backend URL from Render.
const LIVE_API_URL = 'https://aqten-game-backend.onrender.com'; // Example URL
const LOCAL_API_URL = 'http://localhost:3000';
export const API_URL = IS_LIVE ? LIVE_API_URL : LOCAL_API_URL;

// --- Auth Endpoints ---
export async function registerUser(username, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response;
}

export async function loginUser(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include' // This is essential for receiving the cookie
  });
  return response;
}

export async function logoutUser() {
  await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function checkAuthStatus() {
  const response = await fetch(`${API_URL}/api/auth/status`, {
    credentials: 'include' 
  });
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  return response.json();
}

export async function getCaseHistory() {
  const response = await fetch(`${API_URL}/api/auth/history`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Could not fetch case history.');
  }
  return response.json();
}

export async function getLeaderboard() {
    const response = await fetch(`${API_URL}/api/auth/leaderboard`);
    if (!response.ok) {
        throw new Error('Could not fetch leaderboard data.');
    }
    return response.json();
}

export async function getUserSettings() {
    const response = await fetch(`${API_URL}/api/auth/settings`, {
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('Could not fetch user settings.');
    }
    return response.json();
}

export async function saveUserSettings(settings) {
    const response = await fetch(`${API_URL}/api/auth/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include'
    });
    return response.json();
}

// --- Game Data Endpoints ---
export async function getGameData() {
  const response = await fetch(`${API_URL}/api/game-data`);
  return response.json();
}

export async function resetGame() {
    await fetch(`${API_URL}/api/reset`, { method: 'POST' });
}

export async function getNewPatient() {
    const response = await fetch(`${API_URL}/api/random-patient`, { credentials: 'include' });
    return response;
}

// --- Patient Action Endpoints ---
export async function getPatientStatus(patientId) {
  const response = await fetch(`${API_URL}/api/patient/${patientId}/status`);
  return response.json();
}

export async function assignPatientToRoom(patientId, roomName) {
  console.log(`[API.JS-DEBUG] Sending assignPatientToRoom request for patient ${patientId} to room ${roomName}`);
  const response = await fetch(`${API_URL}/api/patient/${patientId}/assign-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName })
  });
  if (!response.ok) throw new Error('assignPatientToRoom request failed');
  return response.json();
}

export async function postChatMessage(patientId, message) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, message })
  });
  // --- FIX: Handle 202 status for initial "thinking" response ---
  // The backend sends a 202 immediately to indicate who is thinking.
  // The final reply comes via polling.
  if (response.status === 202) {
    return response.json(); // This will contain thinkingCharacterId
  }
  return response.json(); // This would be for direct replies like SOMAÄTAS
}

export async function performExam(patientId, examId) {
  const response = await fetch(`${API_URL}/api/patient/${patientId}/perform-exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId })
  });
  return response.json();
}

export async function orderLab(patientId, testId) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/order-lab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId })
    });
    return response.json();
}

export async function performBedsideTest(patientId, testId) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/perform-bedside`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId })
    });
    return response.json();
}

export async function orderRadiology(patientId, testId) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/order-radiology`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId })
    });
    return response.json();
}

export async function administerMedication(patientId, medId, dose) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/give-med`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medId, dose })
    });
    return response.json(); // Return the JSON response from the server
}

export async function setTherapy(patientId, therapyId, value) {
    await fetch(`${API_URL}/api/patient/${patientId}/set-therapy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapyId, value })
    });
}

export async function toggleHomeMed(patientId, medId) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/toggle-homemed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medId })
    });
    return response.json();
}

// --- NEW: Consultation Endpoint ---
export async function consultSpecialist(patientId, specialityId, actionsTaken) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialityId, actionsTaken }) // --- FIX: Send the actionsTaken array ---
    });
    return response.json();
}

export async function evaluateCase(performanceData) {
    const response = await fetch(`${API_URL}/api/evaluate-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(performanceData),
      credentials: 'include' // This is essential for sending the session cookie
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
    }

    return response.json();
}
export async function orderLabKit(patientId, kitId) {
    const response = await fetch(`${API_URL}/api/patient/${patientId}/order-lab-kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kitId })
    });
    return response.json();
}

export async function rateCase(caseId, rating, feedbackText) {
    const response = await fetch(`${API_URL}/api/rate-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, rating, feedback: feedbackText }),
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('Could not submit rating.');
    }
    return response.json();
}

export async function getPatchNotes() {
    const response = await fetch(`${API_URL}/api/patch-notes`, {
        credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to get patch notes');
    return response.text(); // Return as text because the backend sends HTML
}