const MESSAGE_SELECTOR = '[data-a-target="chat-line-message"]';
const MESSAGE_TEXT_SELECTOR = '[data-a-target="chat-message-text"]';
const TRANSLATION_CLASS = 'twitch-chat-translator-translation';

function createMessageObserver(root) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }
        if (node.matches && node.matches(MESSAGE_SELECTOR)) {
          processMessageElement(node);
        } else {
          const nestedMessages = node.querySelectorAll?.(MESSAGE_SELECTOR);
          nestedMessages?.forEach(processMessageElement);
        }
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return observer;
}

function getMessageId(element) {
  if (element.dataset.id) {
    return element.dataset.id;
  }
  if (element.id) {
    return element.id;
  }
  const author = element.querySelector('[data-a-target="chat-message-username"]')?.textContent?.trim() || 'unknown';
  const timestamp = Date.now();
  return `${author}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractMessageText(element) {
  const fragments = element.querySelectorAll(MESSAGE_TEXT_SELECTOR);
  if (fragments.length === 0) {
    return element.textContent?.trim() || '';
  }
  return Array.from(fragments)
    .map((fragment) => fragment.textContent)
    .join(' ')
    .trim();
}

function appendTranslation(element, translation, language) {
  if (!translation) {
    return;
  }

  let container = element.querySelector(`.${TRANSLATION_CLASS}`);
  if (!container) {
    container = document.createElement('div');
    container.className = TRANSLATION_CLASS;
    container.style.marginTop = '2px';
    container.style.fontSize = '0.9em';
    container.style.color = 'var(--color-text-alt-2, #adadb8)';
    container.style.fontStyle = 'italic';
    element.appendChild(container);
  }

  const languageLabel = language && language !== 'und' ? language.toUpperCase() : 'Unknown';
  container.textContent = `[${languageLabel}→EN] ${translation}`;
}

function markAsProcessed(element) {
  element.dataset.translationProcessed = 'true';
}

function isProcessed(element) {
  return element.dataset.translationProcessed === 'true';
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function processMessageElement(element) {
  if (isProcessed(element)) {
    return;
  }

  const text = extractMessageText(element);
  if (!text) {
    markAsProcessed(element);
    return;
  }

  const messageId = getMessageId(element);
  element.dataset.translationMessageId = messageId;

  try {
    const response = await sendMessage({
      type: 'processMessage',
      text,
      messageId,
    });

    if (!response) {
      markAsProcessed(element);
      return;
    }

    if (response.error) {
      console.warn('Translation error:', response.error);
      markAsProcessed(element);
      return;
    }

    if (response.translation) {
      appendTranslation(element, response.translation, response.language);
    }

    markAsProcessed(element);
  } catch (error) {
    console.error('Failed to process message', error);
    markAsProcessed(element);
  }
}

function initialize() {
  const chatScrollable = document.querySelector('.chat-scrollable-area__message-container');
  if (chatScrollable) {
    createMessageObserver(chatScrollable);
    chatScrollable.querySelectorAll(MESSAGE_SELECTOR).forEach(processMessageElement);
    return true;
  }
  return false;
}

const MAX_RETRIES = 20;
let attempts = 0;

function waitForChat() {
  if (initialize()) {
    return;
  }
  if (attempts >= MAX_RETRIES) {
    console.warn('Twitch Chat Translator: Chat container not found.');
    return;
  }
  attempts += 1;
  setTimeout(waitForChat, 1000);
}

waitForChat();
