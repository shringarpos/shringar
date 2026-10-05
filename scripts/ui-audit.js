import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("=========================================");
console.log("   SHRINGAR UI & FUNCTIONAL AUDIT RUNNER   ");
console.log("=========================================\n");

const screenshotsDir = path.resolve(process.cwd(), "e2e/screenshots");
const testResultsDir = path.resolve(process.cwd(), "test-results");

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

console.log("▶ Triggering Playwright Functional & UX Test Suite...");
let testPassed = true;
try {
  execSync("pnpm exec playwright test e2e/gold-ledger.spec.ts e2e/navigation.spec.ts e2e/theme-consistency.spec.ts", { stdio: "inherit" });
  console.log("\n✔ All Playwright E2E & Functional tests passed successfully!\n");
} catch (err) {
  testPassed = false;
  console.error("\n✖ Some Playwright tests reported issues or warnings.\n");
}

console.log("▶ Collecting UI Visual Artifacts...");
const screenshots = fs.existsSync(screenshotsDir)
  ? fs.readdirSync(screenshotsDir).filter((f) => f.endsWith(".png"))
  : [];

let reportMarkdown = `# UI & Functional Audit Report\n\n`;
reportMarkdown += `**Generated**: ${new Date().toISOString()}\n`;
reportMarkdown += `**Test Suite Status**: ${testPassed ? "PASSED" : "FAILED"}\n\n`;

reportMarkdown += `## Visual Artifacts for Agent Inspection\n\n`;
reportMarkdown += `Agents can inspect these captured screens to evaluate consistency, contrast, and UX layout:\n\n`;

screenshots.forEach((file) => {
  const filePath = path.join(screenshotsDir, file);
  const stats = fs.statSync(filePath);
  reportMarkdown += `### \`${file}\`\n`;
  reportMarkdown += `- **Path**: [${file}](file://${filePath})\n`;
  reportMarkdown += `- **Size**: ${(stats.size / 1024).toFixed(1)} KB\n\n`;
  reportMarkdown += `![${file}](${filePath})\n\n`;
});

const reportPath = path.join(testResultsDir, "ui-audit-report.md");
fs.writeFileSync(reportPath, reportMarkdown, "utf8");

console.log(`\n✔ UI Audit Report written to: ${reportPath}`);
console.log(`✔ Found ${screenshots.length} visual screenshots ready for agent inspection.\n`);
