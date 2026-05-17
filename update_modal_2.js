const fs = require('fs');
const file = '/Users/abhishekr/Documents/koott/littlecare-frontend/src/components/DoctorModal.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// We need to delete lines from bottom to top so indices don't shift

// Delete Experience to Languages: 1811 to 1936 (1-based -> index 1810 to 1935)
lines.splice(1810, 126);

// Delete Education: 1724 to 1790 (1-based -> index 1723 to 1789)
lines.splice(1723, 67);

fs.writeFileSync(file, lines.join('\n'));
console.log('Successfully removed Education, Experience, and other fields.');
