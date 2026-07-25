const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\Rohit CR\\Downloads\\payslip-generator-main\\payslip-generator-main\\backend\\routes\\staffPortal.js', 'utf8');
const lines = content.split('\n');

console.log('--- Router routes in staffPortal.js ---');
lines.forEach((line, index) => {
  if (line.includes('router.') || line.includes('profile') || line.includes('me')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
