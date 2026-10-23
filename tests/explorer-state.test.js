// Integration checks for generated explorer state. This is a minimal DOM
// fixture, not a rendering engine or a substitute for browser visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../dist/explorer.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../dist/js/explorer.bundle.js',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../dist/data/assemblies.json',import.meta.url)));
const biodiversityData=readFileSync(new URL('../dist/data/biodiversity.js',import.meta.url),'utf8');
const biodiversityUI=readFileSync(new URL('../src/js/biodiversity.js',import.meta.url),'utf8');
function fixture(hash='',withBiodiversity=false){
 const ids=new Map();
 class Element{
  constructor(id){this.id=id;this.hidden=false;this.value='';this.checked=false;this.listeners={};this.attrs={};this.innerHTML='';this.textContent='';this.classList={add(){},remove(){}};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  click(){this.listeners.click?.({target:this});}
  setAttribute(name,value){this.attrs[name]=value;}
  getAttribute(name){return this.attrs[name];}
  replaceChildren(){this.value='';this.options=[];}
  add(option){this.options.push(option);}
  focus(){}scrollIntoView(){}
 }
 for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){
  const element=new Element(match[1]);element.hidden=/\shidden(?:>|\s)/.test(match[0]);
  for(const attr of match[0].matchAll(/([\w-]+)="([^"]*)"/g))element.attrs[attr[1]]=attr[2];
  ids.set(element.id,element);
 }
 const tabs=['overview','records','gaps'].map(id=>ids.get('tab-'+id));
 ids.set('explore-coverage',new Element('explore-coverage'));
 const body=new Element('body'),tablist=new Element('tablist');
 const location={hash};const document={getElementById:id=>ids.get(id),querySelectorAll:selector=>selector==='[role="tab"]'?tabs:[],querySelector:selector=>selector==='.explorer-tabs'?tablist:selector==='.explorer-body'?body:null};
 const listeners={};
 const window={CRUSTGP_RECORDS:data,matchMedia:()=>({matches:true}),addEventListener(name,fn){listeners[name]=fn;},dispatchEvent(e){listeners[e.type]?.(e);}};
 const context={document,window,location,history:{replaceState(a,b,hash){location.hash=hash;}},Option:class{constructor(label,value){this.label=label;this.value=value;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},console,setTimeout};
 if(withBiodiversity){vm.runInNewContext(biodiversityData,context);vm.runInNewContext(biodiversityUI,context);}
 vm.runInNewContext(script,context);
 assert.equal(ids.get('load-status').textContent,'','Explorer initialization must succeed');
 return {ids,tabs,body,window,visible:()=>['overview','records','gaps'].filter(id=>!ids.get(id).hidden)};
}
test('tabs isolate views, accept direct links, and preserve comparison selections',()=>{
 const app=fixture();assert.deepEqual(app.visible(),['overview']);
 assert.equal(app.ids.get('record-rows').innerHTML.match(/<tr>/g).length,10);
 app.ids.get('tab-records').listeners.click();assert.deepEqual(app.visible(),['records']);
 app.ids.get('record-rows').listeners.change({target:{dataset:{compare:data[0].accession}}});
 assert.equal(app.ids.get('selection-count').textContent,'1 of 3 selected for comparison');
 app.ids.get('open-comparison').listeners.click();assert.deepEqual(app.visible(),['records']);
 assert.equal(app.ids.get('compare').open,true);
 assert.ok(app.ids.get('comparison-cards').innerHTML.includes(data[0].accession));
 app.ids.get('tab-overview').listeners.click();assert.equal(app.ids.get('selection-count').textContent,'1 of 3 selected for comparison');
 assert.deepEqual(fixture('#records').visible(),['records']);
 assert.deepEqual(fixture('#compare').visible(),['records']);
 assert.deepEqual(fixture('#invalid').visible(),['overview']);
});
test('new overview panels summarize the snapshot and family links open record searches',()=>{
 const app=fixture();
 assert.ok(app.ids.get('family-chart').innerHTML.includes('Daphniidae'));
 assert.ok(app.ids.get('multiplicity-chart').innerHTML.includes('143'));
 assert.ok(app.ids.get('multiplicity-chart').innerHTML.includes('70'));
 app.body.listeners.click({target:{closest:()=>({dataset:{drillKind:'family',drillValue:'Daphniidae'}})}});
 assert.deepEqual(app.visible(),['records']);assert.equal(app.ids.get('search').value,'Daphniidae');
 assert.ok(app.ids.get('record-rows').innerHTML.includes('Daphniidae'));
});
test('chart navigation opens matching records and keyboard navigation switches views',()=>{
 const app=fixture();
 app.body.listeners.click({target:{closest:()=>({dataset:{drillKind:'class',drillValue:'Malacostraca',drillCount:'123'}})}});
 assert.deepEqual(app.visible(),['records']);assert.equal(app.ids.get('class-filter').value,'Malacostraca');
 assert.ok(app.ids.get('results-count').textContent.startsWith('205 matching records'));
 app.ids.get('page-size').value='25';app.ids.get('page-size').listeners.change();
 assert.equal(app.ids.get('record-rows').innerHTML.match(/<tr>/g).length,25);
 app.ids.get('tab-records').listeners.keydown({key:'End',preventDefault(){}});assert.deepEqual(app.visible(),['gaps']);
 app.body.listeners.click({target:{closest:()=>({dataset:{drillKind:'class',drillValue:'Remipedia',drillCount:'0'}})}});
 assert.deepEqual(app.visible(),['gaps']);
});
test('biodiversity panels initialize, paginate and link species selections to exact assembly accessions',()=>{
 const app=fixture('',true),d=app.window.CRUSTGP_BIODIVERSITY;
 assert.ok(app.ids.get('biodiversity-summary').innerHTML.includes('72,298'));
 assert.ok(app.ids.get('biodiversity-summary').innerHTML.includes('154'));
 assert.ok(app.ids.get('goat-count').textContent.startsWith('262 species-level taxa'));
 assert.equal(app.ids.get('coverage-rows').innerHTML.match(/<tr>/g).length,8);
 app.ids.get('coverage-next').click();assert.ok(app.ids.get('coverage-page').textContent.includes('Page 2'));
 app.ids.get('gap-search').value='Daphniidae';app.ids.get('gap-search').listeners.input();
 assert.ok(app.ids.get('gap-results').innerHTML.includes('Daphniidae'));
 const species=d.species.find(s=>s[4].length),accessions=species[4];
 app.window.dispatchEvent({type:'crustgp:records',detail:{accessions,label:species[1]}});
 assert.deepEqual(app.visible(),['records']);
 assert.ok(app.ids.get('results-count').textContent.startsWith(accessions.length+' matching records'));
 for(const a of accessions)assert.ok(app.ids.get('record-rows').innerHTML.includes(a));
 app.ids.get('reset').click();assert.ok(app.ids.get('results-count').textContent.startsWith('410 matching records'));
 assert.equal(app.ids.get('biodiversity-record-context').hidden,true);
});
test('coverage numerators deduplicate accepted species and never include flagged records',()=>{
 const app=fixture('',true),d=app.window.CRUSTGP_BIODIVERSITY;
 const matched=d.species.filter(s=>s[4].length);
 assert.equal(matched.length,d.eligibleSpecies);
 assert.equal(new Set(d.species.map(s=>s[0])).size,d.species.length);
 for(const s of matched)for(const a of s[4]){
  const r=data.find(r=>r.accession===a);assert.ok(r);assert.equal(r.review,'');
  assert.equal(d.matches[a].id,s[0]);assert.equal(d.matches[a].eligible,true);
 }
 assert.equal(new Set(d.goat.rows.map(r=>r.taxid)).size,262);
 assert.ok(d.goat.rows.every(r=>r.source==='direct'&&r.bp>0));
 assert.ok(!d.goat.rows.some(r=>['Insecta','Entognatha','Collembola'].includes(r.class)));
});
