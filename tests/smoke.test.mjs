import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const html=await readFile('index.html','utf8');const css=await readFile('src/styles.css','utf8');const js=await readFile('src/app.js','utf8');
test('required sections exist',()=>{for(const id of ['why','model','method','challenge','evidence','trust'])assert.match(html,new RegExp(`id="${id}"`))});
test('contact flow exists',()=>{assert.match(html,/data-contact/);assert.match(html,/data-email/);assert.match(html,/mail-choice/);assert.match(html,/mailto:dhairytopia@gmail\.com/);assert.match(html,/github\.com\/DT-09/)});
test('responsive and reduced motion rules exist',()=>{assert.match(css,/@media\(max-width:680px\)/);assert.match(css,/prefers-reduced-motion/)});
test('buyer value and simulation boundaries are explicit',()=>{assert.match(html,/WHY AUTHORITY TESTING MATTERS/);assert.match(html,/public walkthrough shows the shape of an assessment, not a live security test/);assert.match(html,/All results are simulated examples/)});
test('interaction code exists',()=>{for(const token of ['scenario','data-evidence','run-test','renderEvidence','IntersectionObserver'])assert.match(js,new RegExp(token))});
