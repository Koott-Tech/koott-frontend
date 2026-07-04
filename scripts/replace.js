const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Koott')) {
      // Replace Koott with MyKoott, but only if it's not already MyKoott
      // We can do a regex replace: replace Koott not preceded by My
      const updated = content.replace(/(?<!My)Koott/g, 'MyKoott');
      if (updated !== content) {
        fs.writeFileSync(filePath, updated);
        console.log(`Updated ${filePath}`);
      }
    }
  }
});
