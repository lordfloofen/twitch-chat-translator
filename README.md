# Twitch Chat Translator Chrome Extension

This repository contains a Chrome extension that watches Twitch chat for non-English messages and automatically translates them into English using OpenAI's ChatGPT API.

## Features

- Detects the language of each chat message using the Chrome i18n API.
- Sends non-English messages to the OpenAI Chat Completions endpoint for translation.
- Appends the translated text beneath the original chat message in Twitch.
- Simple options page to securely store your OpenAI API key locally.

## Getting Started

1. Generate an OpenAI API key from the [OpenAI dashboard](https://platform.openai.com/account/api-keys).
2. Clone this repository and open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `extension/` directory in this project.
5. Open the extension's **Options** page and paste your OpenAI API key.
6. Visit any Twitch stream. Non-English chat messages will automatically display an English translation beneath the original message.

## Configuration

- The extension stores the API key locally using `chrome.storage.local` and only transmits it when calling the OpenAI API for translations.
- The extension uses the `gpt-4o-mini` model by default. You can adjust this in `extension/background.js` if you prefer a different model.

## Privacy

- Messages are only sent to OpenAI when they are detected as non-English.
- No data is sent anywhere else or persisted outside of Chrome's local storage.

## Development Notes

- The content script watches Twitch's chat DOM for new messages. If Twitch updates its markup, the selectors in `extension/content.js` may need adjustments.
- Error messages (missing API key, API failures, etc.) are logged to the browser console for troubleshooting.
