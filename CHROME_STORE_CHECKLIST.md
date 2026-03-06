# Chrome Web Store Release Checklist

## Required assets
- Extension icon: 128x128 (already in `assets/icons/icon-128.png`)
- Screenshots (1–5): 1280x800 or 640x400 recommended
- Optional promo tile: 1400x560

## Required metadata
- Short description (<=132 chars)
- Full description
- Category + language
- Privacy policy URL (can be GitHub URL to `PRIVACY.md`)

## Manifest sanity checks
- `manifest_version: 3`
- `name`, `version` (bump each release)
- `permissions` only what you use (`storage`)
- `host_permissions` limited to `https://calendar.google.com/*`
- Icons defined: 16, 32, 48, 128

## Functional checks
- Open event details dialog and confirm chips render
- Click a chip, edit label, reload dialog, confirm persistence
- Verify attachments/locations do not get chips
- Confirm no console errors

## Packaging
- Zip the repo (or build output) for upload
- Ensure `.DS_Store` files are removed (optional but recommended)

## Submission notes
- Declare data usage as “No data collected”
- If asked, state that data stays in `chrome.storage.local`
