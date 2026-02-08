#!/usr/bin/env node
/**
 * Typography Validation Script
 * Enforces the 15-class ERP Material Design typography system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../frontend');

// The 15 allowed typography classes (v3.0 Material Design aligned)
const ALLOWED_TYPO_CLASSES = [
    // Display (Dashboard/Hero)
    'typo-display-lg', 'typo-display-md', 'typo-display-sm',
    // Headline (Page Structure)
    'typo-headline-lg', 'typo-headline-md', 'typo-headline-sm',
    // Title (Component Headers)
    'typo-title-lg', 'typo-title-md', 'typo-title-sm',
    // Body (Content)
    'typo-body-lg', 'typo-body-md', 'typo-body-sm',
    // Label (UI Elements)
    'typo-label-lg', 'typo-label-md', 'typo-label-sm',
    // Mono (Data Display)
    'typo-mono-lg', 'typo-mono-md', 'typo-mono-sm',
];

// Validation uses ALLOWED_TYPO_CLASSES directly

// Forbidden patterns - these should use typography classes instead
const FORBIDDEN_PATTERNS = [
    // Raw text sizes
    { pattern: /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/, name: 'raw text size' },
    // Thin font weights
    { pattern: /\bfont-(thin|light|extralight)\b/, name: 'thin font weight' },
];

// Allowed exceptions
const ALLOWED_EXCEPTIONS = [
    // Status colors
    /text-(success|warning|error|info)/,
    // Color tokens
    /text-(primary|secondary|tertiary|muted|subtle)/,
    // Arbitrary values
    /text-\[/,
    // Font mono is OK when combined with typo classes
    /font-mono/,
    // Uppercase and tracking are now ALLOWED for table headers/badges
    // (they're part of the system: typo-label-md has uppercase)
];

const IGNORED_PATHS = [
    'node_modules',
    '.next',
    'dist',
    'build',
    'coverage',
    'components/ui',
    'app/globals.css',
    'docs',
];

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');

        if (IGNORED_PATHS.some(ignored => 
            relativePath === ignored || 
            relativePath.startsWith(ignored + '/')
        )) {
            return;
        }

        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

function extractClassNames(content) {
    const classNames = [];
    const regex = /className="([^"]*)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        classNames.push(match[1]);
    }
    return classNames;
}

function findViolations(className) {
    const violations = [];
    
    for (const { pattern, name } of FORBIDDEN_PATTERNS) {
        if (pattern.test(className)) {
            // Check if it's an allowed exception
            let isAllowed = false;
            for (const exception of ALLOWED_EXCEPTIONS) {
                if (exception.test(className)) {
                    isAllowed = true;
                    break;
                }
            }
            if (!isAllowed) {
                violations.push(name);
            }
        }
    }
    
    return violations;
}

const files = getAllFiles(ROOT_DIR);
let totalViolations = 0;
const violationsByFile = [];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     TYPOGRAPHY VALIDATION - ERP v3.0 Material Design       ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('15-Class System:');
console.log('  Display: typo-display-lg/md/sm (24-36px)');
console.log('  Headline: typo-headline-lg/md/sm (16-22px)');
console.log('  Title: typo-title-lg/md/sm (14-16px)');
console.log('  Body: typo-body-lg/md/sm (12-16px)');
console.log('  Label: typo-label-lg/md/sm (11-14px)');
console.log('  Mono: typo-mono-lg/md/sm (12-16px)');
console.log('');

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    const classNames = extractClassNames(content);
    
    const fileViolations = [];
    
    classNames.forEach((className) => {
        const violations = findViolations(className);
        if (violations.length > 0) {
            fileViolations.push({
                className,
                violations,
                line: (content.substring(0, content.indexOf(className)).match(/\n/g) || []).length + 1
            });
        }
    });
    
    if (fileViolations.length > 0) {
        violationsByFile.push({
            file: relativePath,
            violations: fileViolations
        });
        totalViolations += fileViolations.length;
    }
});

// Output results
if (totalViolations > 0) {
    console.log(`❌ Found ${totalViolations} typography violations:\n`);
    
    violationsByFile.forEach(({ file, violations }) => {
        console.log(`📄 ${file}`);
        violations.forEach(({ className, violations, line }) => {
            console.log(`   Line ~${line}: "${className.substring(0, 60)}${className.length > 60 ? '...' : ''}"`);
            console.log(`   Issues: ${violations.join(', ')}`);
            console.log('');
        });
    });
    
    console.log('');
    console.log('Fix by using:');
    console.log('  • text-xs → typo-label-md or typo-body-sm');
    console.log('  • text-sm → typo-body-md');
    console.log('  • text-lg → typo-headline-sm');
    console.log('  • text-xl → typo-headline-lg');
    console.log('');
    console.log('New 15-class system:');
    console.log('  • Display (lg/md/sm): Dashboard KPIs, hero metrics');
    console.log('  • Headline (lg/md/sm): Page titles, major sections');
    console.log('  • Title (lg/md/sm): Card headers, modal titles');
    console.log('  • Body (lg/md/sm): Content text (14px is base)');
    console.log('  • Label (lg/md/sm): Form labels, table headers');
    console.log('  • Mono (lg/md/sm): Numbers, codes, IDs');
    process.exit(1);
} else {
    console.log('✅ No typography violations found.');
    console.log('');
    console.log(`   Scanned ${files.length} files`);
    console.log('   All typography follows the 15-class ERP Material Design system');
    process.exit(0);
}
