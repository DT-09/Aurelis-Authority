import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const css=await readFile('src/styles.css','utf8');
const js=await readFile('src/app.js','utf8');
const action=await readFile('action.yml','utf8');

test('core buyer-facing sections exist',()=>{for(const id of ['why','model','method','challenge','evidence','pilot','trust','assessment'])assert.ok(html.includes('id="'+id+'"'))});
test('qualified enquiry form submits to server-side capture',()=>{for(const token of ['data-contact','id="inquiry-form"','id="inquiry-name"','id="inquiry-email"','id="inquiry-buyer"','id="inquiry-workflow"','id="inquiry-urgency"','id="inquiry-readiness"','id="inquiry-consent"','id="inquiry-website"'])assert.ok(html.includes(token));assert.ok(js.includes('fetch("/api/lead"'));assert.ok(js.includes('lead_submit'));assert.ok(!js.includes('mailto:'));});
test('editorial styling, restrained motion and responsive rules exist',()=>{assert.ok(css.includes("Newsreader"));assert.ok(css.includes('--paper:#f1efe8'));assert.ok(css.includes('--acid:#c1a16a'));assert.ok(css.includes('@media(max-width:760px)'));assert.ok(css.includes('prefers-reduced-motion'));assert.ok(html.includes('id="field-canvas"'));assert.ok(js.includes('prefers-reduced-motion'))});
test('pilot deliverables, scope and buyer FAQs are transparent',()=>{for(const token of ['Policy and input record','Trace comparison evidence','Findings and remediation','Retest and readout','How long does a pilot take?','There is no fixed public price.','No certification or guarantee'])assert.ok(html.includes(token));assert.ok(html.includes('authorized staging environment'))});
test('demo limitations are visible and accurate',()=>{assert.ok(html.includes('in-memory mock tools'));assert.ok(html.includes('not observations from a live agent or customer system'));assert.ok(html.includes('Run controlled demonstration'))});
test('evidence view updates from the selected executed scenario',()=>{for(const token of ['renderEvidence','record.action','record.remediation','record.expected','run.observed','Execution path'])assert.ok(js.includes(token));assert.ok(js.includes('Values below reflect the selected scenario'))});
test('modal supports keyboard dismissal and focus management',()=>{for(const token of ['openContact','closeContact','previouslyFocused','e.key==="Escape"','e.key==="Tab"'])assert.ok(js.includes(token))});
test('scenario library and executed assessment remain wired',()=>{for(const token of ['data-scenario','data-evidence','run-test','/api/assessment','IntersectionObserver'])assert.ok(js.includes(token))});

test('GitHub Actions composite action calls the offline trace checker',()=>{for(const token of ['using: composite','inputs.policy','inputs.trace','GITHUB_ACTION_PATH/tools/authority-trace-check/cli.mjs','--policy','--trace'])assert.ok(action.includes(token));});

test('lead capture and metrics endpoints are included',async()=>{const lead=await readFile('functions/api/lead.js','utf8');const metrics=await readFile('functions/api/metrics.js','utf8');const admin=await readFile('functions/api/admin/leads.js','utf8');const migration=await readFile('migrations/0002_inbound_leads.sql','utf8');for(const token of ['inbound_leads','trace_readiness','consent_at','idx_inbound_leads_created'])assert.ok(migration.includes(token));assert.ok(lead.includes('INSERT INTO inbound_leads'));assert.ok(lead.includes('Too many enquiries'));assert.ok(metrics.includes('inbound_metrics'));assert.ok(admin.includes('LEAD_ADMIN_TOKEN'));});
