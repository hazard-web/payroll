const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9342;
const TARGET = process.argv[2] || 'http://localhost:3000/';

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=C:/tmp/chrome-direct-' + Date.now(),
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    await sleep;
    const targets = await fetchJson('/json/list');
    const target = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const evals = new Map();

    ws.on('open', async () => {
      const send = (m, p) => { id++; ws.send(JSON.stringify({ id, method: m, params: p || {} })); };
      const evalExpr = (expr) => new Promise((resolve) => {
        const reqId = ++id;
        evals.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && evals.has(msg.id)) {
          evals.get(msg.id)(msg.result);
          evals.delete(msg.id);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const ed = msg.params.exceptionDetails;
          console.log('\n[!!! EXCEPTION !!!]', ed.text);
          console.log('--- description ---');
          console.log((ed.exception?.description || ed.exception?.value || '').toString().substring(0, 5000));
          console.log('--- stack trace ---');
          if (ed.stackTrace?.callFrames) {
            ed.stackTrace.callFrames.slice(0, 20).forEach((f, i) => {
              console.log(`  ${i}: ${f.functionName || '<anon>'} @ ${f.url}:${f.lineNumber}:${f.columnNumber}`);
            });
          }
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => {
            if (a.value !== undefined) return typeof a.value === 'object' ? JSON.stringify(a.value).substring(0, 500) : String(a.value).substring(0, 500);
            return a.description || '?';
          }).join(' ');
          if (msg.params.type === 'error' && !text.includes('Download the React')) {
            console.log(`[CONSOLE ERROR]`, text);
          }
        }
      });

      send('Page.enable');
      send('Runtime.enable');
      send('Page.navigate', { url: TARGET });
      await sleep;

      // Inject a fake token into localStorage to simulate logged-in state
      // The token doesn't need to be valid — the dashboard will try to fetch
      // /staff, /attendance/* etc. and they'll 401, but the Dashboard will
      // still MOUNT and trigger any conditional hooks.
      console.log('\n=== Setting fake localStorage token ===');
      const injectResult = await evalExpr(`(() => {
        localStorage.setItem('token', 'fake.jwt.token');
        localStorage.setItem('staffToken', 'fake.staff.token');
        return 'token set, reloading...';
      })()`);
      console.log(injectResult.result.value);

      // Reload
      send('Page.reload');
      await sleep;

      console.log('\n=== Page state after reload (logged in attempt) ===');
      const state = await evalExpr(`(() => {
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        const body = document.body.innerText.substring(0, 400);
        return JSON.stringify({
          url: location.href,
          h1: h1?.innerText,
          h2: h2?.innerText,
          body: body
        });
      })()`);
      console.log(state.result.value);

      cleanup();
    });
    ws.on('error', (e) => { console.log('WS err:', e.message); cleanup(); });
  } catch (e) { console.log('Err:', e.message); cleanup(); }
})();

setTimeout(cleanup, 30000);
