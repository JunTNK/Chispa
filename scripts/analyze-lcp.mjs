import { readFileSync } from 'fs';

const r = JSON.parse(readFileSync('./test-results/lighthouse-report-optimized.report.json', 'utf8'));

console.log('=== LCP Element Details ===');
const lcpElement = r.audits['largest-contentful-paint-element'];
if (lcpElement && lcpElement.details && lcpElement.details.items) {
  lcpElement.details.items.forEach(item => {
    console.log('Element:', item.node?.snippet || 'Unknown');
    console.log('Size:', item.size || 'Unknown');
    console.log('URL:', item.url || 'N/A');
  });
}

console.log('\n=== LCP Score ===');
console.log('Score:', r.audits['largest-contentful-paint'].score);
console.log('Value:', r.audits['largest-contentful-paint'].displayValue);

console.log('\n=== Render Blocking Resources ===');
const rb = r.audits['render-blocking-resources'];
if (rb && rb.details && rb.details.items) {
  rb.details.items.forEach(item => {
    console.log(`- ${item.url.substring(0, 80)}...`);
    console.log(`  Wasted time: ${item.wastedMs}ms`);
  });
}

console.log('\n=== Unused JavaScript ===');
const unused = r.audits['unused-javascript'];
if (unused && unused.details && unused.details.items) {
  unused.details.items.slice(0, 5).forEach(item => {
    console.log(`- ${item.url.substring(0, 80)}...`);
    console.log(`  Wasted bytes: ${item.wastedBytes} bytes`);
  });
}

console.log('\n=== Opportunities ===');
const opportunities = r.categories.performance.auditRefs.filter(a => a.group === 'load-opportunities');
opportunities.forEach(o => {
  const audit = r.audits[o.id];
  if (audit && audit.score !== null && audit.score < 1 && audit.details?.overallSavingsMs > 0) {
    console.log(`- ${audit.title}: ${audit.displayValue}`);
    console.log(`  Potential savings: ${audit.details.overallSavingsMs}ms`);
  }
});
