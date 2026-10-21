import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRecords,summarize,csvText,toggleComparison} from '../src/js/data-model.js';
const records=JSON.parse(readFileSync(new URL('../dist/data/assemblies.json',import.meta.url)));
test('snapshot totals reconcile and review flags are retained',()=>{
 const s=summarize(records);
 assert.equal(s.records,410);assert.equal(s.taxa,213);assert.equal(s.short,4);assert.equal(s.chromosome,129);
});
test('combined search and scope filters use the same records',()=>{
 const result=filterRecords(records,{query:'hyalella',className:'Malacostraca',hideShort:true});
 assert.ok(result.length>0);assert.ok(result.every(r=>r.class==='Malacostraca'&&r.length>=100000&&r.name.toLowerCase().includes('hyalella')));
 assert.equal(filterRecords(records,{query:'no-such-crustacean-12345'}).length,0);
 assert.equal(filterRecords(records,{hideShort:true}).length,406);
 assert.ok(filterRecords(records,{reviewOnly:true}).every(r=>r.review));
});
test('paired accessions remain separate records but not separate taxon IDs',()=>{
 const rows=records.filter(r=>r.name==='Hyalella azteca');
 assert.equal(rows.length,2);assert.equal(summarize(rows).taxa,1);
});
test('filtered export quotes commas and neutralizes spreadsheet formulas',()=>{
 const csv=csvText([{name:'=1+1',submitter:'Lab, "Institute"',accession:'GCA_1.1'}]);
 assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"Lab, ""Institute"""'));assert.equal(csv.split('\r\n').length,2);
});
test('comparison selections remain unique, remove correctly, and stop at three',()=>{
 const valid=['A','B','C','D'];let selected=[];
 for(const accession of ['A','B','C','D'])selected=toggleComparison(selected,accession,valid);
 assert.deepEqual(selected,['A','B','C']);
 selected=toggleComparison(selected,'B',valid);assert.deepEqual(selected,['A','C']);
 selected=toggleComparison(selected,'D',valid);assert.deepEqual(selected,['A','C','D']);
 assert.deepEqual(toggleComparison(selected,'unknown',valid),selected);
});
test('comparison metadata preserves missing values and source units',()=>{
 const row=records.find(r=>r.accession==='GCF_000764305.2');
 assert.equal(row.contigN50,112853);assert.equal(row.n50,213783);assert.equal(row.gc,38.5);assert.equal(row.busco,0.9555775);
 assert.equal(records.find(r=>r.accession==='GCA_947561585.1').busco,null);
 assert.equal(records.filter(r=>r.name==='Callinectes sapidus').length,2);
});
test('chart drill-down records reconcile with each overview group and assembly level',()=>{
 for(const className of new Set(records.map(r=>r.class))){
  const rows=filterRecords(records,{className});
  assert.ok(rows.length>0);assert.ok(rows.every(r=>r.class===className));
  assert.equal(summarize(rows).taxa,new Set(records.filter(r=>r.class===className).map(r=>r.taxid)).size);
 }
 for(const level of new Set(records.map(r=>r.level))){
  const rows=filterRecords(records,{level});assert.ok(rows.every(r=>r.level===level));
  assert.equal(rows.length,records.filter(r=>r.level===level).length);
 }
 assert.equal(filterRecords(records,{className:'Remipedia'}).length,0);
});
