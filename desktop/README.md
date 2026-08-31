# Pulse Desktop Timer

Always-on-top mini window for Mac and Windows (works over Cursor / VS Code).

## Required (one-time each session)

The browser **cannot** draw on top of other apps. This desktop app must be running:

```bash
cd desktop
npm start
```

You should see a **Pulse Timer** tray/menu-bar icon. Leave it running.

Then check in from Pulse in Chrome — the green timer window appears on your desktop and stays above other apps.

## If nothing appears

1. Confirm terminal shows: `bridge http://127.0.0.1:39217`
2. Check in again from Pulse
3. Click the tray icon → **Show timer**
