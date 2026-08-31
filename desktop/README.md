# Pulse Desktop Timer

Always-on-top mini window for Mac and Windows (works over Cursor / VS Code).

The browser cannot draw on top of other apps. Testers install this desktop app; it is not hosted on Vercel or Hostinger.

## Download (UAT)

GitHub Actions builds installers from the `electron` branch:

https://github.com/hazard-web/payroll/releases/tag/pulse-timer-uat

- Mac: `.dmg`
- Windows: `.exe`

Install, leave it running, then check in from Pulse in the browser. The timer uses a local bridge on `127.0.0.1:39217`.

## Run from source

```bash
cd desktop
npm start
```

You should see a **Pulse Timer** tray/menu-bar icon.

## If nothing appears

1. Confirm the app log shows `bridge http://127.0.0.1:39217`
2. Check in again from Pulse
3. Click the tray icon → **Show timer**
