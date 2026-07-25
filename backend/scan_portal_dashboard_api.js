const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\Rohit CR\\Downloads\\payslip-generator-main\\payslip-generator-main\\frontend\\src\\pages\\portal\\PortalDashboard.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- API calls in PortalDashboard.jsx ---');
lines.forEach((line, index) => {
  if (line.includes('api.') || line.includes('punch') || line.includes('Punch') || line.includes('handle')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
