#!/usr/bin/env tsx
/**
 * Design System Audit Script
 * 
 * This script scans the frontend codebase for hardcoded values that should
 * be replaced with Material 3 design tokens.
 * 
 * Usage:
 *   npx tsx scripts/audit-design-system.ts
 * 
 * Output:
 *   - Table of files with violations
 *   - Summary statistics
 *   - Recommendations for migration
 */

import { glob } from "glob";
import { readFile } from "fs/promises";
import { relative } from "path";

// Patterns that indicate hardcoded values
const HARDCODED_PATTERNS = [
  {
    name: "Arbitrary font sizes",
    pattern: /text-\[\d+px\]/g,
    suggestion: "Use text-label-small, text-body-medium, etc.",
  },
  {
    name: "Arbitrary padding",
    pattern: /p-\[\d+px\]|px-\[\d+px\]|py-\[\d+px\]/g,
    suggestion: "Use p-4, px-6, etc. from spacing scale",
  },
  {
    name: "Arbitrary margins",
    pattern: /m-\[\d+px\]|mx-\[\d+px\]|my-\[\d+px\]/g,
    suggestion: "Use m-4, mx-6, etc. from spacing scale",
  },
  {
    name: "Arbitrary gaps",
    pattern: /gap-\[\d+px\]/g,
    suggestion: "Use gap-4, gap-6, etc. from spacing scale",
  },
  {
    name: "Hardcoded hex colors",
    pattern: /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g,
    suggestion: "Use CSS variables like var(--m3-primary) or Tailwind classes",
  },
  {
    name: "RGB/RGBA colors",
    pattern: /rgba?\([^)]+\)/g,
    suggestion: "Use CSS variables or oklch() with variables",
  },
  {
    name: "Inline font sizes",
    pattern: /fontSize:\s*['"]\d+px['"]/g,
    suggestion: "Use typography tokens from designTokens.ts",
  },
  {
    name: "Inline padding",
    pattern: /padding:\s*['"]\d+px['"]/g,
    suggestion: "Use spacing tokens from designTokens.ts",
  },
  {
    name: "Inline margins",
    pattern: /margin:\s*['"]\d+px['"]/g,
    suggestion: "Use spacing tokens from designTokens.ts",
  },
  {
    name: "Font weight 600",
    pattern: /font-\[600\]|fontWeight:\s*600/g,
    suggestion: "Use font-medium (500) for consistency",
  },
  {
    name: "Arbitrary border radius",
    pattern: /rounded-\[\d+px\]/g,
    suggestion: "Use rounded-m3-sm, rounded-m3-md, etc.",
  },
];

interface Violation {
  file: string;
  pattern: string;
  matches: string[];
  lineNumbers: number[];
}

interface FileReport {
  file: string;
  violations: Violation[];
  totalViolations: number;
}

async function auditFile(filePath: string): Promise<FileReport | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const violations: Violation[] = [];

    for (const { name, pattern } of HARDCODED_PATTERNS) {
      const matches: string[] = [];
      const lineNumbers: number[] = [];

      // Find all matches
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const matchedText = match[0];
        if (!matches.includes(matchedText)) {
          matches.push(matchedText);
        }

        // Find line number
        const pos = match.index;
        let lineNum = 1;
        for (let i = 0; i < pos; i++) {
          if (content[i] === "\n") lineNum++;
        }
        if (!lineNumbers.includes(lineNum)) {
          lineNumbers.push(lineNum);
        }
      }

      // Reset regex
      pattern.lastIndex = 0;

      if (matches.length > 0) {
        violations.push({
          file: filePath,
          pattern: name,
          matches: matches.slice(0, 5), // Limit to 5 unique matches
          lineNumbers: lineNumbers.slice(0, 5),
        });
      }
    }

    if (violations.length === 0) return null;

    return {
      file: filePath,
      violations,
      totalViolations: violations.reduce((sum, v) => sum + v.matches.length, 0),
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function main() {
  console.log("🔍 Design System Audit\n");
  console.log("Scanning for hardcoded values that should use Material 3 tokens...\n");

  // Find all TypeScript/React files
  const files = await glob("frontend/components/**/*.tsx", {
    ignore: ["**/node_modules/**", "**/*.d.ts"],
  });

  console.log(`Found ${files.length} files to analyze\n`);

  // Audit each file
  const reports: FileReport[] = [];
  for (const file of files) {
    const report = await auditFile(file);
    if (report) {
      reports.push(report);
    }
  }

  // Sort by violation count (descending)
  reports.sort((a, b) => b.totalViolations - a.totalViolations);

  // Display results
  if (reports.length === 0) {
    console.log("✅ No violations found! All files are using design tokens.");
    return;
  }

  console.log(`❌ Found ${reports.length} files with violations:\n`);

  // Summary table
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│ File                                          │ Violations │ Top Issues     │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");

  for (const report of reports.slice(0, 20)) {
    // Top 20 files
    const shortPath = relative("frontend/components", report.file).slice(0, 45).padEnd(45);
    const violationCount = report.totalViolations.toString().padStart(4);
    const topIssue = report.violations[0]?.pattern.slice(0, 14).padEnd(14);
    console.log(`│ ${shortPath} │   ${violationCount}    │ ${topIssue} │`);
  }

  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Detailed breakdown
  console.log("📊 Violation Breakdown by Type:\n");
  const patternCounts: Record<string, number> = {};
  for (const report of reports) {
    for (const v of report.violations) {
      patternCounts[v.pattern] = (patternCounts[v.pattern] || 0) + v.matches.length;
    }
  }

  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    const suggestion = HARDCODED_PATTERNS.find((p) => p.name === pattern)?.suggestion || "";
    console.log(`  ${pattern.padEnd(25)} ${count.toString().padStart(4)} occurrences`);
    console.log(`    💡 ${suggestion}\n`);
  }

  // Statistics
  const totalViolations = reports.reduce((sum, r) => sum + r.totalViolations, 0);
  const cleanFiles = files.length - reports.length;
  const complianceRate = ((cleanFiles / files.length) * 100).toFixed(1);

  console.log("📈 Statistics:\n");
  console.log(`  Total files scanned:     ${files.length}`);
  console.log(`  Files with violations:   ${reports.length}`);
  console.log(`  Clean files:             ${cleanFiles} (${complianceRate}% compliance)`);
  console.log(`  Total violations:        ${totalViolations}`);
  console.log(`  Average per file:        ${(totalViolations / reports.length).toFixed(1)}\n`);

  // Recommendations
  console.log("🎯 Recommendations:\n");
  console.log("  1. Start with the top 5 files with most violations");
  console.log("  2. Replace arbitrary text-[10px] with text-label-small");
  console.log("  3. Replace arbitrary text-[11px] with text-body-small");
  console.log("  4. Replace arbitrary text-[12px] with text-body-medium");
  console.log("  5. Replace hardcoded colors with CSS variables");
  console.log("  6. Use the useDesignSystem() hook for theme-aware styles\n");

  console.log("📚 Resources:\n");
  console.log("  - Design System Plan: plans/DESIGN_SYSTEM_OVERHAUL_PLAN.md");
  console.log("  - Design Tokens: frontend/lib/designTokens.ts");
  console.log("  - CSS Utilities: frontend/app/globals.css");
  console.log("  - Design System Hook: frontend/hooks/useDesignSystem.ts\n");
}

main().catch(console.error);
