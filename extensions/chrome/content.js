// Browser AI Bridge - Content Script
// Injected into AI provider pages

(function() {
  'use strict';

  // Detect which AI provider we're on
  const provider = detectProvider();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_INFO') {
      sendResponse({
        provider,
        url: window.location.href,
        title: document.title,
        hasInput: !!findInputElement(),
        hasResponse: !!findResponseElement(),
      });
    }

    if (message.type === 'INJECT_TEXT') {
      const result = injectText(message.text);
      sendResponse(result);
    }

    if (message.type === 'EXTRACT_RESPONSE') {
      const response = extractLastResponse();
      sendResponse({ response });
    }
  });

  // Detect provider
  function detectProvider() {
    const url = window.location.href;
    if (url.includes('gemini.google.com')) return 'gemini';
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('chat.deepseek.com')) return 'deepseek';
    return 'unknown';
  }

  // Find input element based on provider
  function findInputElement() {
    const selectors = {
      gemini: [
        'textarea[aria-label*="prompt" i]',
        'div[contenteditable="true"][role="textbox"]',
      ],
      chatgpt: [
        '#prompt-textarea',
        'div[contenteditable="true"][data-placeholder]',
        'textarea[aria-label*="message" i]',
      ],
      claude: [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][role="textbox"]',
      ],
      deepseek: [
        'textarea[placeholder*="Message" i]',
        'textarea[aria-label*="message" i]',
      ],
    };

    const providerSelectors = selectors[provider] || [];
    for (const selector of providerSelectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  // Find response element based on provider
  function findResponseElement() {
    const selectors = {
      gemini: '[data-message-author-role="model"]',
      chatgpt: '[data-message-author-role="assistant"]',
      claude: '[data-message-author-role="assistant"], div.font-claude-message',
      deepseek: 'div[class*="message"][class*="assistant"]',
    };

    const selector = selectors[provider];
    if (!selector) return null;

    const elements = document.querySelectorAll(selector);
    return elements.length > 0 ? elements[elements.length - 1] : null;
  }

  // Inject text into input
  function injectText(text) {
    const input = findInputElement();
    if (!input) {
      return { success: false, error: 'Input element not found' };
    }

    try {
      input.focus();

      if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // ContentEditable div
        input.textContent = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Extract last response
  function extractLastResponse() {
    const element = findResponseElement();
    if (!element) return null;

    return element.textContent?.trim() || null;
  }

  // Notify background that content script is ready
  chrome.runtime.sendMessage({
    type: 'CONTENT_READY',
    provider,
    url: window.location.href,
  });
})();
