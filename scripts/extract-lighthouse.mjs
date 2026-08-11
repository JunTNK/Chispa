import { readFileSync } from 'fs';

const r = JSON.parse(readFileSync('./test-results/lighthouse-report.report.json', 'utf8'));
const audits = r.audits;

console.log('=== LIGHTHOUSE SCORES ===');
console.log(`Performance: ${Math.round(r.categories.performance.score * 100)}/100`);
console.log(`Accessibility: ${Math.round(r.categories.accessibility.score * 100)}/100`);
console.log(`Best Practices: ${Math.round(r.categories['best-practices'].score * 100)}/100`);
console.log(`SEO: ${Math.round(r.categories.seo.score * 100)}/100`);

console.log('\n=== PERFORMANCE METRICS ===');
console.log(`FCP (First Contentful Paint): ${audits['first-contentful-paint'].displayValue}`);
console.log(`LCP (Largest Contentful Paint): ${audits['largest-contentful-paint'].displayValue}`);
console.log(`TBT (Total Blocking Time): ${audits['total-blocking-time'].displayValue}`);
console.log(`CLS (Cumulative Layout Shift): ${audits['cumulative-layout-shift'].displayValue}`);
console.log(`SI (Speed Index): ${audits['speed-index'].displayValue}`);

console.log('\n=== OPPORTUNITIES ===');
const opps = r.categories.performance.auditRefs.filter(a => a.group === 'load-opportunities');
opps.forEach(o => {
  const audit = audits[o.id];
  if (audit && audit.score !== null && audit.score < 1) {
    console.log(`- ${audit.title}: ${audit.displayValue}`);
    if (audit.details?.overallSavingsMs) {
      console.log(`  Potential savings: ${audit.details.overallSavingsMs}ms`);
    }
  }
});

console.log('\n=== DIAGNOSTICS ===');
const diags = r.categories.performance.auditRefs.filter(a => a.group === 'diagnostics');
diags.forEach(d => {
  const audit = audits[d.id];
  if (audit && audit.score !== null && audit.score < 1) {
    console.log(`- ${audit.title}: ${audit.displayValue}`);
  }
});

console.log('\n=== ACCESSIBILITY ISSUES ===');
const a11y = r.categories.accessibility.auditRefs;
a11y.forEach(a => {
  const audit = audits[a.id];
  if (audit && audit.score !== null && audit.score < 1) {
    console.log(`- ${audit.title}`);
    console.log(`  ${audit.description?.substring(0, 150)}`);
  }
});

console.log('\n=== PASSED AUDITS ===');
const passed = r.categories.performance.auditRefs.filter(a => {
  const audit = audits[a.id];
  return audit && audit.score === 1;
});
console.log(`Performance audits passed: ${passed.length}`);
