const fs = require('fs');
const file = '/Users/abhishekr/Documents/koott/littlecare-frontend/src/components/DoctorModal.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find the index of "{/* Description */}"
const descIndex = lines.findIndex(line => line.includes('{/* Description */}'));
if (descIndex !== -1) {
  lines.splice(descIndex, 18); // 18 lines for the Description block
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully removed Description.');
} else {
  console.log('Description block not found.');
}
