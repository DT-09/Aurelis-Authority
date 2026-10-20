import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const css=await readFile('src/styles.css','utf8');
const js=await readFile('src/app.js','utf8');

test('core buyer-facing sections exist',()=>{for(const id of ['why','model','method','challenge','evidence','pilot','trust','assessment'])assert.ok(html.includes('id="'+id+'"'))});
test('private inquiry composer is explicit and does not auto-send',()=>{for(const token of ['data-contact','id="inquiry-form"','id="inquiry-type"','id="inquiry-workflow"','id="inquiry-context"','Prepare email draft','Nothing is sent or stored by this page','github.com/DT-09'])assert.ok(html.includes(token));assert.ok(!html.includes('mailto:'));assert.ok(!html.includes('>dhairytopia@gmail.com<'));assert.ok(js.includes('mailto:dhairytopia@gmail.com'));assert.ok(js.includes('addEventListener("submit"'))});
test('editorial styling, restrained motion and responsive rules exist',()=>{assert.ok(css.includes("Newsreader"));assert.ok(css.includes('--paper:#f1efe8'));assert.ok(css.includes('--acid:#c1a16a'));assert.ok(css.includes('@media(max-width:760px)'));assert.ok(css.includes('prefers-reduced-motion'));assert.ok(html.includes('id="field-canvas"'));assert.ok(js.includes('prefers-reduced-motion'))});
test('pilot deliverables, scope and buyer FAQs are transparent',()=>{for(const token of ['Boundary and test plan','Execution evidence','Findings and remediation','Retest and readout','How long does a pilot take?','There is no fixed public price.','No certification or guarantee'])assert.ok(html.includes(token));assert.ok(html.includes('authorized test environment'))});
test('demo limitations are visible and accurate',()=>{assert.ok(html.includes('in-memory mock tools'));assert.ok(html.includes('not observations from a live agent or customer system'));assert.ok(html.includes('Run controlled demonstration'))});
test('evidence view updates from the selected executed scenario',()=>{for(const token of ['renderEvidence','record.action','record.remediation','record.expected','run.observed','Execution path'])assert.ok(js.includes(token));assert.ok(js.includes('Values below reflect the selected scenario'))});
test('modal supports keyboard dismissal and focus management',()=>{for(const token of ['openContact','closeContact','previouslyFocused','e.key==="Escape"','e.key==="Tab"'])assert.ok(js.includes(token))});
test('scenario library and executed assessment remain wired',()=>{for(const token of ['data-scenario','data-evidence','run-test','/api/assessment','IntersectionObserver'])assert.ok(js.includes(token))});
