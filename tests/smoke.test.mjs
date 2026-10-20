import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const css=await readFile('src/styles.css','utf8');
const js=await readFile('src/app.js','utf8');

test('required sections exist',()=>{for(const id of ['why','model','method','challenge','evidence','trust'])assert.match(html,new RegExp(`id="${id}"`))});
test('private inquiry composer replaces exposed contact details',()=>{assert.match(html,/data-contact/);assert.match(html,/id="inquiry-form"/);assert.match(html,/id="inquiry-type"/);assert.match(html,/id="inquiry-workflow"/);assert.match(html,/id="inquiry-context"/);assert.match(html,/Prepare email draft/);assert.match(html,/Nothing is sent or stored by this page/);assert.doesNotMatch(html,/mailto:/);assert.doesNotMatch(html,/>dhairytopia@gmail\\.com</);assert.match(js,/mailto:dhairytopia@gmail\\.com/);assert.match(js,/addEventListener\\("submit"/);assert.match(html,/github\\.com\\/DT-09/)});
test('responsive and reduced motion rules exist',()=>{assert.ok(css.includes('@media(max-width:760px)'));assert.ok(css.includes('prefers-reduced-motion'))});
test('buyer value and simulation boundaries are explicit',()=>{assert.match(html,/WHY AUTHORITY TESTING MATTERS/);assert.match(html,/public walkthrough shows the shape of an assessment, not a live security test/);assert.match(html,/All results are simulated examples/)});
test('interaction code exists',()=>{for(const token of ['scenario','data-evidence','run-test','renderEvidence','IntersectionObserver'])assert.ok(js.includes(token))});
test('new visual system and scenario states have valid definitions',()=>{assert.ok(css.includes('--paper:#f3f1e9'));assert.ok(css.includes('--blue:#2448e8'));assert.ok(css.includes('box-shadow:12px 12px 0 var(--acid)'));assert.match(js,/revoked: \\{[^}]*result:/)});
test('evidence selection updates accessible state',()=>{assert.match(js,/setAttribute\\('aria-pressed','true'\\)/);assert.match(js,/setAttribute\\('aria-pressed','false'\\)/)});
