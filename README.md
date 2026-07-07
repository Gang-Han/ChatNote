# ChatNote

ChatNote is a lightweight Manifest V3 browser extension for saving highlights and notes while you browse. Select any text on a webpage, save it from the popup, attach a personal note, and export everything as Markdown when you're ready — all stored locally via `chrome.storage.local`.

## Features

- **Save selected text as highlights** — grabs the current text selection from the active tab and saves it.
- **Add personal notes to highlights** — each highlight has an editable note field, saved automatically.
- **Delete individual highlights** — remove a single highlight without clearing everything else.
- **Pinned Notes** — a separate section for long-term reminders, shortcuts, or links, kept apart from page highlights.
- **Export highlights as Markdown** — copies saved highlights and their notes to the clipboard, with the source page's title and URL. Pinned notes are excluded from this export by design.
- **Clear All** — deletes all saved highlights (pinned notes are unaffected).

## Loading as an unpacked extension

### Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this project folder
4. Click the ChatNote icon in the toolbar to open the popup

### Edge
1. Open `edge://extensions`
2. Enable **Developer mode** (left sidebar toggle)
3. Click **Load unpacked** and select this project folder
4. Click the ChatNote icon in the toolbar to open the popup

After editing any file, reload the extension from the extensions page (click the reload icon on the ChatNote card) to pick up changes.

## Project structure

```
ChatNote/
├── manifest.json   # Manifest V3 config
├── popup.html      # Popup markup
├── popup.css       # Popup styling
├── popup.js        # Popup logic (highlights, notes, pins, Markdown export)
└── README.md
```
