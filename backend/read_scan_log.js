const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Rohit CR\\.gemini\\antigravity-ide\\brain\\d1f42afe-5d27-4aac-a042-d64704aa7e4f\\.system_generated\\tasks\\task-393.log';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

console.log('--- Matches for "Found target" in scan log ---');
lines.forEach((line, index) => {
  if (line.includes('Found target')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
