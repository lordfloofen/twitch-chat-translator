function $(selector) {
  return document.querySelector(selector);
}

const DEFAULT_PROVIDER = "openai";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1";

function setStatus(message, isError = false) {
  const status = $('#status');
  status.textContent = message;
  status.style.color = isError ? '#ff8282' : '#a5ffa5';
}

function updateProviderVisibility(provider) {
  const openaiSection = $('#openaiSettings');
  const ollamaSection = $('#ollamaSettings');

  if (provider === 'ollama') {
    openaiSection.classList.add('hidden');
    ollamaSection.classList.remove('hidden');
  } else {
    openaiSection.classList.remove('hidden');
    ollamaSection.classList.add('hidden');
  }
}

function loadSettings() {
  chrome.storage.local.get(
    ['provider', 'openaiApiKey', 'openaiModel', 'ollamaBaseUrl', 'ollamaModel'],
    (result) => {
      if (chrome.runtime.lastError) {
        setStatus(`Failed to load settings: ${chrome.runtime.lastError.message}`, true);
        return;
      }
      const provider = result.provider || DEFAULT_PROVIDER;
      $('#provider').value = provider;
      updateProviderVisibility(provider);

      $('#apiKey').value = result.openaiApiKey || '';
      $('#openaiModel').value = result.openaiModel || DEFAULT_OPENAI_MODEL;
      $('#ollamaBaseUrl').value = result.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL;
      $('#ollamaModel').value = result.ollamaModel || DEFAULT_OLLAMA_MODEL;
    }
  );
}

function saveSettings() {
  const provider = $('#provider').value;
  const apiKey = $('#apiKey').value.trim();
  const openaiModel = $('#openaiModel').value.trim();
  const ollamaBaseUrl = $('#ollamaBaseUrl').value.trim();
  const ollamaModel = $('#ollamaModel').value.trim();

  const data = { provider };

  if (provider === 'ollama') {
    data.ollamaBaseUrl = ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL;
    data.ollamaModel = ollamaModel || DEFAULT_OLLAMA_MODEL;
  } else {
    data.openaiApiKey = apiKey;
    data.openaiModel = openaiModel || DEFAULT_OPENAI_MODEL;
  }

  $('#save').disabled = true;
  chrome.storage.local.set(data, () => {
    $('#save').disabled = false;
    if (chrome.runtime.lastError) {
      setStatus(`Failed to save settings: ${chrome.runtime.lastError.message}`, true);
      return;
    }

    if (provider === 'openai' && !apiKey) {
      setStatus('Settings saved. OpenAI API key is empty, so translations will be disabled.', true);
    } else {
      setStatus('Settings saved successfully.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  $('#provider').addEventListener('change', (event) => {
    updateProviderVisibility(event.target.value);
  });
  $('#save').addEventListener('click', (event) => {
    event.preventDefault();
    saveSettings();
  });
});
