const fs = require('fs');
const file = '/Users/abhishekr/Documents/koott/littlecare-frontend/src/components/DoctorModal.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// We need to delete lines from bottom to top so indices don't shift
// Traits: 2400 to 2435 (1-based, so index 2399 to 2434)
lines.splice(2399, 37);

// Pricing: 1889 to 2272 (index 1888 to 2271)
lines.splice(1888, 384);

// FAQ: 1811 to 1888 (index 1810 to 1887)
lines.splice(1810, 78);

fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully removed unused fields.');
