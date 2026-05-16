#!/usr/bin/env node

/**
 * Image Validation Script
 * Validates that static images in the public directory are properly formatted
 * and don't have common issues.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.avif'];

let errors = [];
let warnings = [];
let filesChecked = 0;

function validateImage(filePath, relativePath) {
  filesChecked++;
  try {
    const stats = fs.statSync(filePath);
    
    // Check if file is readable
    if (!stats.isFile()) {
      errors.push(`❌ Not a file: ${relativePath}`);
      return;
    }
    
    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      warnings.push(`⚠️  Large file: ${relativePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    // Check extension
    const ext = path.extname(filePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      warnings.push(`⚠️  Unusual extension: ${relativePath} (${ext})`);
    }
    
  } catch (err) {
    errors.push(`❌ Error reading ${relativePath}: ${err.message}`);
  }
}

function scanDirectory(dir, relativeDir = '') {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
      
      // Skip node_modules, .git, and other hidden/system directories
      if (entry.name.startsWith('.') && entry.name !== '.well-known') {
        continue;
      }
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath, relativePath);
      } else if (entry.isFile()) {
        // Check if it's an image file
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext) || entry.name.includes('image') || entry.name.includes('img')) {
          validateImage(fullPath, relativePath);
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      errors.push(`❌ Error scanning directory ${relativeDir}: ${err.message}`);
    }
  }
}

// Main execution
console.log('🔍 Validating static images...\n');

if (!fs.existsSync(PUBLIC_DIR)) {
  console.log('⚠️  Public directory not found, skipping validation');
  process.exit(0);
}

scanDirectory(PUBLIC_DIR, 'public');

// Report results
console.log(`\n📊 Validation Summary:`);
console.log(`   Files checked: ${filesChecked}`);
console.log(`   Errors: ${errors.length}`);
console.log(`   Warnings: ${warnings.length}\n`);

if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`   ${w}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors:');
  errors.forEach(e => console.log(`   ${e}`));
  console.log('');
  console.log('❌ Image validation failed');
  process.exit(1);
}

console.log('✅ Image validation passed');
process.exit(0);
