# Twitch Chat Translator Chrome Extension

This repository contains a Chrome extension that watches Twitch chat for non-English messages and automatically translates them into English using either OpenAI's ChatGPT API or a locally hosted Ollama model.

## Features

- Detects the language of each chat message using the Chrome i18n API.
- Sends non-English messages to either the OpenAI Chat Completions endpoint or a configurable Ollama instance for translation.
- Appends the translated text beneath the original chat message in Twitch.
- Simple options page to securely store your OpenAI API key or Ollama connection details locally.

## Getting Started

1. (Optional) Generate an OpenAI API key from the [OpenAI dashboard](https://platform.openai.com/account/api-keys) if you plan to use OpenAI for translations. For local translation, install and start [Ollama](https://ollama.com/).
2. Clone this repository and open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `extension/` directory in this project.
5. Open the extension's **Options** page and choose either **OpenAI** or **Ollama** as the translation provider.
   - For OpenAI, paste your API key and optionally customize the model name.
   - For Ollama, provide the base URL (defaults to `http://localhost:11434`) and model name (defaults to `llama3.1`).
6. Visit any Twitch stream. Non-English chat messages will automatically display an English translation beneath the original message.

## Configuration

- The extension stores API keys and Ollama connection details locally using `chrome.storage.local`.
- The extension uses the `gpt-4o-mini` model for OpenAI and `llama3.1` for Ollama by default. Both can be adjusted from the options page.

## Privacy

- Messages are only sent to OpenAI when they are detected as non-English.
- No data is sent anywhere else or persisted outside of Chrome's local storage.

## Development Notes

- The content script watches Twitch's chat DOM for new messages. If Twitch updates its markup, the selectors in `extension/content.js` may need adjustments.
- Error messages (missing API key, API failures, etc.) are logged to the browser console for troubleshooting.
