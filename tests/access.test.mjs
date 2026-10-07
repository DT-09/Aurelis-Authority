import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const f=await readFile('functions/api/assessment/[token].js','utf8');const s=await readFile('schema.sql','utf8');
test('private assessment API is scoped by token',()=>{assert.match(f,/access_token = \?1/);assert.match(f,/Cache-Control.*no-store/);assert.match(f,/if \(!row\)/)});
test('assessment schema contains core evidence objects',()=>{for(const t of ['assessments','assessment_tests','findings'])assert.match(s,new RegExp('CREATE TABLE IF NOT EXISTS '+t))});
