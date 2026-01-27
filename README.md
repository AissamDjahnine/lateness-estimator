# Late Labels for Google Calendar

Late Labels is a small Chrome extension (Manifest V3) that injects short arrival-estimate chips next to attendee names in Google Calendar event details. It's designed to be privacy-first (nothing leaves the browser) and playful — labels can be deterministic, humorous, or manually edited.

## What it does
- Injects a compact label chip next to each attendee's name in the event details dialog.
- Chooses a deterministic estimate label per attendee (examples: "Usually 4m late", "Typically on time", "Will skip", "Estimated 12m late").
- Applies a color to the chip to indicate status: green (on-time), orange (short delay), red (likely late / will skip).
- Persists user-edited labels locally through the browser storage (via a background service worker).
- Avoids injecting chips into non-attendee rows (locations, rooms, or UI elements).

## Key implementation notes
- Manifest V3 content script + background service worker for storage messaging.
- DOM MutationObserver watches Google Calendar event dialogs and injects chips when attendees are present.
- Deduplication strategy prevents duplicate chips even when Google Calendar renders multiple DOM elements for the same person:
	- Normalizes attendee identifiers (prefers email when available) and tracks session-level injected keys.
	- Uses both element-level and global guards (data attributes on chips) to avoid duplicates and race conditions.
- Privacy-first: email domains are stripped for any generated IDs and no raw email addresses are stored unmasked.

## Installation (developer / local)
1. Open `chrome://extensions` in Chrome.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the extension folder (this repository root).
4. Reload the extension after making changes while developing.

## Configuration & Behavior
- Labels are deterministic per attendee by default; stored labels override generated labels.
- Color mapping rules (default):
	- `Typically on time` → green
	- `Will skip` → red
	- `Usually Xm late` / `Estimated Xm late` → orange if 1–9 minutes, red if above 9 minutes
- You can edit any chip's label by clicking it — edits persist to local storage.

## Files of interest
- `src/contentScript.js` — entry point that initializes the observer
- `src/observer.js` — detects event dialogs and triggers processing
- `src/LabelModel.js` — attendee extraction, deduplication, session state
- `src/ui.js` — chip creation, coloring, and edit popover
- `src/storage.js` — storage wrapper that messages the background worker
- `src/background.js` — service worker handling storage messages
- `src/styles.css` — chip styling and color variants

## Troubleshooting
- If chips don't appear, open DevTools in the event dialog and check the console for `LabelModel` logs.
- If you see duplicate chips, the extension will reset its session state when the dialog closes; re-open the dialog and check for updated logs.

## License & Disclaimer
This project is provided as-is for personal or development use. It is intended for entertainment and productivity augmentation; it does not track or send personal data externally.

---
If you'd like, I can prepare a `package.json` and simple CI workflow for linting and packaging the extension for distribution.