function $(selector) {
  return document.querySelector(selector);
}

function setStatus(message, isError = false) {
  const status = $('#status');
  status.textContent = message;
  status.style.color = isError ? '#ff8282' : '#a5ffa5';
}

function loadApiKey() {
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (chrome.runtime.lastError) {
      setStatus(`Failed to load API key: ${chrome.runtime.lastError.message}`, true);
      return;
    }
    $('#apiKey').value = result.openaiApiKey || '';
  });
}

function saveApiKey() {
  const apiKeyInput = $('#apiKey');
  const value = apiKeyInput.value.trim();

  if (!value) {
    setStatus('API key removed. Translation will be disabled until you add a key.', false);
    chrome.storage.local.remove('openaiApiKey');
    return;
  }

  $('#save').disabled = true;
  chrome.storage.local.set({ openaiApiKey: value }, () => {
    $('#save').disabled = false;
    if (chrome.runtime.lastError) {
      setStatus(`Failed to save API key: ${chrome.runtime.lastError.message}`, true);
      return;
    }
    setStatus('API key saved successfully.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  $('#save').addEventListener('click', (event) => {
    event.preventDefault();
    saveApiKey();
  });
});
