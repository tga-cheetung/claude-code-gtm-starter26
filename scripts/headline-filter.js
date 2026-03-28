// Session 2 Step 1: ICP headline filter for Northbound GTM
// Row data injected via {{headline}} template variable
const headline = `{{headline}}`.toLowerCase();

const founderSignals = [
  /\bfounder\b/, /\bco-founder\b/, /\bcofounder\b/,
  /\bceo\b/, /\bchief executive/,
];

const excludeSignals = [
  /\bfounder'?s?\s+office\b/,
  /\brecruiter\b/, /\brecruiting\b/, /\bstudent\b/, /\bintern\b/,
  /\bfreelance\b/, /\bghostwriter?\b/,
  /\bcontent\s+(creator|strategist|writer)\b/,
  /\bpersonal\s+brand/, /\blinkedin\s+ads?\b/,
  /\bcold\s+(email|mail)\b/, /\bsdr\b/,
  /\baccount\s+(manager|executive)\b/,
];

const saasSignals = [
  /\bsaas\b/, /\bb2b\b/, /\bsoftware\b/, /\bplatform\b/,
  /\bai[\s-]/, /\bautomati/, /\btech\b/, /\bgtm\b/, /\brevops\b/,
];

const hasFounder = founderSignals.some(r => r.test(headline));
const hasExclude = excludeSignals.some(r => r.test(headline));
const hasSaas = saasSignals.some(r => r.test(headline));

let pass = false;
let reason = '';

if (!hasFounder) {
  reason = 'no_founder_signal';
} else if (hasExclude) {
  reason = 'excluded_role';
} else {
  pass = true;
  reason = hasSaas ? 'founder_with_saas_signal' : 'founder_no_saas_signal';
}

return JSON.stringify({
  icp_headline_pass: pass,
  headline_filter_reason: reason,
  has_saas_signal: hasSaas
});
