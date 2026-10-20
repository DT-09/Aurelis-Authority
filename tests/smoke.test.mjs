import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile('index.html','utf8');
const css=await readFile('src/styles.css','utf8');
const js=await readFile('src/app.js','utf8');

test('required sections exist',()=>{for(const id of ['why','model','method','challenge','evidence','trust'])assert.ok(html.includes('id="'+id+'"'))});
test('private inquiry composer replaces exposed contact details',()=>{for(const token of ['data-contact','id="inquiry-form"','id="inquiry-type"','id="inquiry-workflow"','id="inquiry-context"','Prepare email draft','Nothing is sent or stored by this page','github.com/DT-09'])assert.ok(html.includes(token));assert.ok(!html.includes('mailto:'));assert.ok(!html.includes('>dhairytopia@gmail.com<'));assert.ok(js.includes('mailto:dhairytopia@gmail.com'));assert.ok(js.includes('addEventListener("submit"'))});
test('responsive and reduced motion rules exist',()=>{assert.ok(css.includes('@media(max-width:760px)'));assert.ok(css.includes('prefers-reduced-motion'))});
test('buyer value and simulation boundaries are explicit',()=>{assert.ok(html.includes('WHY AUTHORITY TESTING MATTERS'));assert.ok(html.includes('public walkthrough shows the shape of an assessment, not a live security test'));assert.ok(html.includes('All results are simulated examples'))});
test('interaction code exists',()=>{for(const token of ['scenario','data-evidence','run-test','renderEvidence','IntersectionObserver'])assert.ok(js.includes(token))});
test('new visual system and scenario states have valid definitions',()=>{assert.ok(css.includes('--paper:#f3f1e9'));assert.ok(css.includes('--blue:#2448e8'));assert.ok(css.includes('box-shadow:12px 12px 0 var(--acid)'));assert.ok(js.includes('revoked: {'))});
test('evidence selection updates accessible state',()=>{assert.ok(js.includes("setAttribute('aria-pressed','true')"));assert.ok(js.includes("setAttribute('aria-pressed','false')"))});
