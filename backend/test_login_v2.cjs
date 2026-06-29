const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9341;
const TARGET = process.argv[2] || 'http://localhost:3000/';

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=C:/tmp/chrome-v2-' + Date.now(),
  '--window-size=1280,800',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeLog = '';
chrome.stderr.on('data', d => { chromeLog += d.toString(); });

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
          console.log('--- exception text ---');
          console.log((ed.exception?.description || ed.exception?.value || '').toString().substring(0, 3000));
          if (ed.stackTrace?.callFrames) {
            console.log('--- stack trace ---');
            ed.stackTrace.callFrames.slice(0, 15).forEach((f, i) => {
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
      await sleep(5000);

      // Now go through login flow
      console.log('\n=== FILLING FORM ===');
      const fillResult = await evalExpr(`(() => {
        const inputs = document.querySelectorAll('input');
        if (inputs.length < 2) return 'no inputs: ' + inputs.length;
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        setVal(inputs[0], 'test@test.com');
        setVal(inputs[1], 'password123');
        return 'filled: ' + inputs[0].value + ' / ' + inputs[1].value.length;
      })()`);
      console.log('Fill:', fillResult.result.value);

      await sleep(300);

      console.log('\n=== CLICKING LOGIN ===');
      const clickResult = await evalExpr(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('login'));
        if (!btn) return 'no button';
        btn.click();
        return 'clicked: ' + btn.innerText;
      })()`);
      console.log('Click:', clickResult.result.value);

      await sleep;

      const finalState = await evalExpr(`(() => {
        return JSON.stringify({
          url: location.href,
          bodyText: document.body.innerText.substring(0, 300),
          hasErrorH1: !!document.querySelector('h1')
        });
      })()`);
      console.log('\n=== FINAL STATE ===');
      console.log(finalState.result.value);

      cleanup();
    });
    ws.on('error', (e) => { console.log('WS err:', e.message); cleanup(); });
  } catch (e) { console.log('Err:', e.message); cleanup(); }
})();

setTimeout(cleanup, 35000);
