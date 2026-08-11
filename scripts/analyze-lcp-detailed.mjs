import { readFileSync } from 'fs';

const r = JSON.parse(readFileSync('./test-results/lighthouse-report-optimized.report.json', 'utf8'));

console.log('=== LCP Analysis ===\n');

// LCP element
const lcp = r.audits['largest-contentful-paint'];
console.log('LCP Score:', lcp.score);
console.log('LCP Value:', lcp.displayValue);
console.log('LCP Score Display Mode:', lcp.scoreDisplayMode);

// LCP element details
const lcpElement = r.audits['largest-contentful-paint-element'];
if (lcpElement && lcpElement.details && lcpElement.details.items) {
  console.log('\nLCP Element Items:');
  lcpElement.details.items.forEach((item, i) => {
    console.log(`  ${i + 1}.`, JSON.stringify(item, null, 2));
  });
}

// First Contentful Paint
const fcp = r.audits['first-contentful-paint'];
console.log('\nFCP Score:', fcp.score);
console.log('FCP Value:', fcp.displayValue);

// Speed Index
const si = r.audits['speed-index'];
console.log('\nSpeed Index Score:', si.score);
console.log('Speed Index Value:', si.displayValue);

// Total Blocking Time
const tbt = r.audits['total-blocking-time'];
console.log('\nTBT Score:', tbt.score);
console.log('TBT Value:', tbt.displayValue);

// Render Blocking Resources
const rb = r.audits['render-blocking-resources'];
console.log('\n=== Render Blocking Resources ===');
if (rb) {
  console.log('Score:', rb.score);
  if (rb.details && rb.details.items) {
    rb.details.items.forEach(item => {
      console.log(`  - ${item.url.substring(0, 80)}...`);
      console.log(`    Wasted ms: ${item.wastedMs}`);
    });
  }
} else {
  console.log('No render blocking resources audit found');
}

// Unused JavaScript
const unused = r.audits['unused-javascript'];
console.log('\n=== Unused JavaScript ===');
if (unused) {
  console.log('Score:', unused.score);
  if (unused.details && unused.details.items) {
    unused.details.items.forEach(item => {
      console.log(`  - ${item.url.substring(0, 80)}...`);
      console.log(`    Wasted bytes: ${item.wastedBytes}`);
    });
  }
} else {
  console.log('No unused JavaScript audit found');
}

// Network Requests
const network = r.audits['network-requests'];
if (network && network.details && network.details.items) {
  console.log('\n=== Network Requests (first 10) ===');
  network.details.items.slice(0, 10).forEach(item => {
    console.log(`  - ${item.url.substring(0, 80)}...`);
    console.log(`    Size: ${item.transferSize || 0} bytes, Time: ${item.duration || 0}ms`);
  });
} else {
  console.log('\n=== Network Requests ===');
  console.log('No network requests audit found');
}

// Main Thread Work
const mainThread = r.audits['mainthread-work-breakdown'];
console.log('\n=== Main Thread Work ===');
console.log('Score:', mainThread.score);
console.log('Value:', mainThread.displayValue);

// Boot-up Time
const bootup = r.audits['bootup-time'];
console.log('\n=== Boot-up Time ===');
console.log('Score:', bootup.score);
console.log('Value:', bootup.displayValue);
