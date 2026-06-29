const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9338;
const TARGET = process.argv[2] || 'http://localhost:3000/';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=C:/tmp/chrome-css-' + Date.now(),
  '--window-size=1280,800',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

const fetchJson = (path) => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

const cleanup = () => { try { chrome.kill('SIGKILL'); } catch (e) {} setTimeout(() => process.exit(0), 300); };

setTimeout(async () => {
  try {
    const targets = await fetchJson('/json/list');
    const target = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const evals = new Map();

    ws.on('open', () => {
      const send = (method, params) => {
        const reqId = ++id;
        ws.send(JSON.stringify({ id: reqId, method, params: params || {} }));
      };
      const evalExpr = (expr) => new Promise((resolve) => {
        const reqId = ++id;
        evals.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && evals.has(msg.id)) {
          evals.get(msg.id)(msg.result);
          evals.delete(msg.id);
        }
      });

      send('Page.enable');
      send('Runtime.enable');
      send('Page.navigate', { url: TARGET });

      setTimeout(async () => {
        const result = await evalExpr(`(() => {
          const root = document.getElementById('root');
          const body = document.body;
          const html = document.documentElement;
          const bodyStyle = getComputedStyle(body);
          const htmlStyle = getComputedStyle(html);
          const rootStyle = root ? getComputedStyle(root) : null;
          const h1 = document.querySelector('h1');
          const h2 = document.querySelector('h2');
          const input = document.querySelector('input');
          const button = document.querySelector('button');
          
          return JSON.stringify({
            url: location.href,
            bodyBg: bodyStyle.backgroundColor,
            bodyColor: bodyStyle.color,
            htmlBg: htmlStyle.backgroundColor,
            rootBg: rootStyle?.backgroundColor,
            rootSize: root ? {w: root.offsetWidth, h: root.offsetHeight} : null,
            bodySize: {w: body.offsetWidth, h: body.offsetHeight},
            h1: h1 ? {
              text: h1.innerText,
              color: getComputedStyle(h1).color,
              bg: getComputedStyle(h1).backgroundColor,
              fontSize: getComputedStyle(h1).fontSize,
              fontFamily: getComputedStyle(h1).fontFamily,
              opacity: getComputedStyle(h1).opacity,
              visibility: getComputedStyle(h1).visibility,
              display: getComputedStyle(h1).display
            } : null,
            h2: h2 ? {
              text: h2.innerText,
              color: getComputedStyle(h2).color,
              bg: getComputedStyle(h2).backgroundColor,
              fontSize: getComputedStyle(h2).fontSize
            } : null,
            input: input ? {
              type: input.type,
              color: getComputedStyle(input).color,
              bg: getComputedStyle(input).backgroundColor,
              border: getComputedStyle(input).border.substring(0, 80)
            } : null,
            button: button ? {
              text: button.innerText,
              color: getComputedStyle(button).color,
              bg: getComputedStyle(button).backgroundColor
            } : null,
            // CSS variables
            cssVars: {
              primary: getComputedStyle(html).getPropertyValue('--primary'),
              bg: getComputedStyle(html).getPropertyValue('--bg'),
              text: getComputedStyle(html).getPropertyValue('--text'),
              surface: getComputedStyle(html).getPropertyValue('--surface'),
              textMuted: getComputedStyle(html).getPropertyValue('--text-muted'),
              primaryTint: getComputedStyle(html).getPropertyValue('--primary-tint')
            }
          }, null, 2);
        })()`);
        console.log(result.result.value);
        cleanup();
      }, 7000);
    });
    ws.on('error', (e) => { console.log('WS err:', e.message); cleanup(); });
  } catch (e) { console.log('Err:', e.message); cleanup(); }
}, 3000);
setTimeout(cleanup, 25000);
