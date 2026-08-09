// Browser AI Bridge - Background Service Worker

const BAB_API_URL = 'http://localhost:3000';

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEND_MESSAGE') {
    handleSendMessage(message.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_STATUS') {
    getStatus()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'DETECT_PROVIDER') {
    const provider = detectProvider(sender.tab?.url);
    sendResponse({ provider });
    return false;
  }
});

// Handle sending message to AI
async function handleSendMessage(data) {
  const { message, provider } = data;

  const response = await fetch(`${BAB_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider || 'gemini',
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// Get bridge status
async function getStatus() {
  try {
    const response = await fetch(`${BAB_API_URL}/health`);
    if (!response.ok) {
      return { connected: false, error: 'API not available' };
    }
    return await response.json();
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Detect provider from URL
function detectProvider(url) {
  if (!url) return 'unknown';

  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('chat.deepseek.com')) return 'deepseek';

  return 'unknown';
}

// Listen for tab updates to detect AI sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const provider = detectProvider(tab.url);
    if (provider !== 'unknown') {
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
    }
  }
});
