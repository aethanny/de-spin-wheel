# Good Spin

A static prize wheel with four categories, per-prize images and winning percentages, editable theme colors, anonymous results, and local spin history.

## Run

From this folder:

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. No npm packages or build step are required. For hosting, upload `index.html`, `styles.css`, `logic.js`, `app.js`, and `assets/` to any HTTPS static host. Use localhost or HTTPS so browser APIs are available. Keep the same address and port to retain access to your saved data.

## Customize

Open **Settings** to rename the four categories, add or remove prizes, upload PNG/JPEG/WebP images (up to 10 MB, resized to 384 px), and set percentages with up to two decimal places. Save changes to apply them. Incomplete configurations can be saved, but spinning is disabled until the total is exactly 100%. Zero-percent prizes stay visible but cannot win.

Slices are equal in size for readability; the listed percentages determine winning chances. All prizes remain available after winning. Sample prizes are placeholders, not a promise of actual rewards.

Choose a palette preset or edit individual colors, then save. Custom foreground and background colors should remain readable.

## Data and privacy

IndexedDB stores settings, image blobs, and history in this browser. There is no backend, analytics, account, or cross-device sync. Clearing site data removes everything. Settings are available to everyone using the page; this is intended for a shared event device, not tamper-resistant prize administration. Use one active tab for settings and spins.

A name is required for every spin. With anonymous mode enabled, only “Anonymous” is stored and displayed. The entered name is cleared after saving the result. Every accepted draw is saved before animation, so closing or refreshing during animation still leaves its result in History.

## Checks

```sh
node tests/logic.cjs
```

The browser smoke check requires Playwright installed separately and a running local server:

```sh
PLAYWRIGHT_PATH=/path/to/node_modules/playwright node tests/browser.cjs
```

Fonts are bundled for offline use: Outfit and DM Sans, distributed under the SIL Open Font License (see `assets/OFL-Outfit.txt` and `assets/OFL-DMSans.txt`).
