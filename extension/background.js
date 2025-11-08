const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_PROVIDER = "openai";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.1";

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "provider",
        "openaiApiKey",
        "openaiModel",
        "ollamaBaseUrl",
        "ollamaModel",
      ],
      (result) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to read settings", chrome.runtime.lastError);
          resolve({});
          return;
        }
        resolve(result || {});
      }
    );
  });
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    console.warn("Invalid base URL provided for Ollama, using default.", error);
    return DEFAULT_OLLAMA_BASE_URL;
  }
}

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["openaiApiKey"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to read API key", chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve(result.openaiApiKey || null);
    });
  });
}

function detectLanguage(text) {
  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (chrome.runtime.lastError) {
        console.warn("Language detection error", chrome.runtime.lastError);
        resolve({ language: "und", percentage: 0, isReliable: false });
        return;
      }
      const languages = result && result.languages ? result.languages : [];
      if (languages.length === 0) {
        resolve({ language: "und", percentage: 0, isReliable: false });
        return;
      }
      const primary = languages[0];
      primary.isReliable = Boolean(result?.isReliable);
      resolve(primary);
    });
  });
}

async function translateWithOpenAI(prompt, settings) {
  const apiKey = settings.openaiApiKey || (await getApiKey());
  if (!apiKey) {
    throw new Error(
      "OpenAI API key is not set. Please add it in the extension options page."
    );
  }

  const model = settings.openaiModel?.trim() || DEFAULT_OPENAI_MODEL;

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a translation engine that outputs only the translated text in English.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  const translation = data?.choices?.[0]?.message?.content?.trim();
  if (!translation) {
    throw new Error("No translation received from OpenAI.");
  }
  return translation;
}

async function translateWithOllama(prompt, settings) {
  const baseUrl = normalizeBaseUrl(
    settings.ollamaBaseUrl?.trim() || DEFAULT_OLLAMA_BASE_URL
  );
  const model = settings.ollamaModel?.trim() || DEFAULT_OLLAMA_MODEL;
  const endpoint = `${baseUrl}/api/chat`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a translation engine that outputs only the translated text in English.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  let translation = null;

  if (Array.isArray(content)) {
    translation = content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("")
      .trim();
  } else if (typeof content === "string") {
    translation = content.trim();
  }

  if (!translation) {
    throw new Error("No translation received from Ollama.");
  }
  return translation;
}

async function translateText(text, sourceLanguage) {
  const settings = await getSettings();
  const provider = settings.provider || DEFAULT_PROVIDER;

  const prompt = `Translate the following ${sourceLanguage} text to natural, concise English suitable for Twitch chat.\nProvide only the translation without additional commentary or formatting.\n\nText: ${text}`;

  if (provider === "ollama") {
    return translateWithOllama(prompt, settings);
  }

  return translateWithOpenAI(prompt, settings);
}

const pendingRequests = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "processMessage") {
    return;
  }

  const { text, messageId } = message;
  if (!text || !messageId) {
    sendResponse({ error: "Missing text or message identifier." });
    return;
  }

  if (pendingRequests.has(messageId)) {
    pendingRequests
      .get(messageId)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true;
  }

  const processing = (async () => {
    const detection = await detectLanguage(text);
    const language = detection.language || "und";
    const percentage = detection.percentage || 0;
    const isReliable = Boolean(detection.isReliable);

    if (language === "en" || (!isReliable && percentage < 40) || percentage === 0) {
      return { language, translation: null };
    }

    try {
      const translation = await translateText(text, language);
      return { language, translation };
    } catch (error) {
      console.error("Translation failed", error);
      return { language, error: error.message };
    }
  })();

  pendingRequests.set(messageId, processing);

  processing
    .then((result) => {
      pendingRequests.delete(messageId);
      sendResponse(result);
    })
    .catch((error) => {
      pendingRequests.delete(messageId);
      sendResponse({ error: error.message });
    });

  return true;
});
