// Browser AI Bridge - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const providerName = document.getElementById('providerName');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const responseArea = document.getElementById('responseArea');
  const extractBtn = document.getElementById('extractBtn');
  const clearBtn = document.getElementById('clearBtn');

  // Check connection status
  async function checkStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

      if (response.connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected to Bridge';
      } else {
        statusDot.classList.add('error');
        statusText.textContent = response.error || 'Not connected';
      }
    } catch (error) {
      statusDot.classList.add('error');
      statusText.textContent = 'Bridge not available';
    }
  }

  // Detect current provider
  async function detectProvider() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.runtime.sendMessage({
        type: 'DETECT_PROVIDER',
        tabId: tab?.id,
      });

      if (response.provider && response.provider !== 'unknown') {
        providerName.textContent = response.provider.charAt(0).toUpperCase() + response.provider.slice(1);
      } else {
        providerName.textContent = 'No AI site detected';
      }
    } catch (error) {
      providerName.textContent = 'Detection failed';
    }
  }

  // Send message
  async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    responseArea.textContent = 'Waiting for response...';
    responseArea.classList.remove('empty');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const providerResponse = await chrome.runtime.sendMessage({
        type: 'DETECT_PROVIDER',
        tabId: tab?.id,
      });

      const response = await chrome.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        data: {
          message,
          provider: providerResponse.provider,
        },
      });

      if (response.error) {
        responseArea.textContent = `Error: ${response.error}`;
      } else {
        const content = response.choices?.[0]?.message?.content;
        responseArea.textContent = content || 'No response received';
      }
    } catch (error) {
      responseArea.textContent = `Error: ${error.message}`;
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
    }
  }

  // Extract response from page
  async function extractResponse() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_RESPONSE',
      });

      if (response?.response) {
        responseArea.textContent = response.response;
        responseArea.classList.remove('empty');
      } else {
        responseArea.textContent = 'No response found on page';
        responseArea.classList.remove('empty');
      }
    } catch (error) {
      responseArea.textContent = `Error: ${error.message}`;
    }
  }

  // Clear response
  function clearResponse() {
    responseArea.textContent = 'Response will appear here...';
    responseArea.classList.add('empty');
  }

  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  extractBtn.addEventListener('click', extractResponse);
  clearBtn.addEventListener('click', clearResponse);

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Initialize
  await checkStatus();
  await detectProvider();
});
