const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9337;
const TARGET = process.argv[2] || 'http://localhost:3000/';

console.log('=== Target:', TARGET, '===\n');

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=C:/tmp/chrome-diag-' + Date.now(),
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
      console.log('[WS connected]\n');

      const send = (method, params) => {
        const reqId = ++id;
        ws.send(JSON.stringify({ id: reqId, method, params: params || {} }));
        return reqId;
      };

      const evalExpr = (expr) => new Promise((resolve) => {
        const reqId = ++id;
        evals.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && evals.has(msg.id)) {
          const r = msg.result;
          if (r.exceptionDetails) {
            console.log('[EVAL EXCEPTION]', r.exceptionDetails.text);
            console.log('  ', r.exceptionDetails.exception?.description || '');
          } else {
            evals.get(msg.id)(r.result);
          }
          evals.delete(msg.id);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => {
            if (a.value !== undefined) return typeof a.value === 'object' ? JSON.stringify(a.value) : a.value;
            if (a.preview) return a.preview.description;
            return a.description || '?';
          }).join(' ');
          console.log(`[BROWSER ${msg.params.type}]`, text.substring(0, 300));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const ed = msg.params.exceptionDetails;
          console.log('[EXCEPTION]', ed.text);
          console.log('  ', ed.exception?.description?.substring(0, 500) || '');
        } else if (msg.method === 'Network.responseReceived') {
          const r = msg.params.response;
          const status = r.status;
          if (status >= 400) {
            console.log(`[NET ${status}]`, r.url);
          }
        } else if (msg.method === 'Log.entryAdded') {
          const e = msg.params.entry;
          if (e.level === 'error' || e.level === 'warning') {
            console.log(`[${e.level.toUpperCase()}]`, e.text.substring(0, 300));
          }
        }
      });

      send('Page.enable');
      send('Runtime.enable');
      send('Log.enable');
      send('Console.enable');
      send('Network.enable');

      send('Page.navigate', { url: TARGET });

      setTimeout(async () => {
        console.log('\n=== AFTER 5s — INITIAL CHECK ===');
        const initial = await evalExpr(`(() => {
          const root = document.getElementById('root');
          const html = document.documentElement;
          const body = document.body;
          return JSON.stringify({
            url: location.href,
            title: document.title,
            rootExists: !!root,
            rootHTMLLength: root ? root.innerHTML.length : 0,
            rootChildrenCount: root ? root.children.length : 0,
            rootFirstChild: root && root.children[0] ? root.children[0].tagName + '.' + (root.children[0].className || '').substring(0, 50) : 'NONE',
            bodyInnerText: body.innerText.substring(0, 300),
            bodyComputedBg: getComputedStyle(body).background.substring(0, 100),
            htmlComputedBg: getComputedStyle(html).background.substring(0, 100),
            scriptsLoaded: Array.from(document.scripts).map(s => s.src || '(inline)'),
            stylesLoaded: Array.from(document.styleSheets).map(s => s.href || '(inline)')
          }, null, 2);
        })()`);
        console.log(initial.value);

        // Try to manually trigger any deferred render
        console.log('\n=== AFTER 5s+3s — WAITING FOR ANIMATIONS ===');
        await new Promise(r => setTimeout(r, 3000));

        const later = await evalExpr(`(() => {
          const root = document.getElementById('root');
          const visible = [];
          root?.querySelectorAll('h1, h2, button, input').forEach(el => {
            const cs = getComputedStyle(el);
            visible.push({
              tag: el.tagName,
              text: el.innerText?.substring(0, 50) || '',
              opacity: cs.opacity,
              visibility: cs.visibility,
              display: cs.display,
              transform: cs.transform.substring(0, 30),
              height: cs.height
            });
          });
          return JSON.stringify({visibleCount: visible.length, items: visible.slice(0, 8)}, null, 2);
        })()`);
        console.log(later.value);

        cleanup();
      }, 5000);
    });
    ws.on('error', (e) => { console.log('WS err:', e.message); cleanup(); });
  } catch (e) { console.log('Err:', e.message); cleanup(); }
}, 3000);

setTimeout(cleanup, 35000);
