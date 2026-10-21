// Integration checks for generated explorer state. This is a minimal DOM
// fixture, not a rendering engine or a substitute for browser visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../dist/explorer.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../dist/js/explorer.bundle.js',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../dist/data/assemblies.json',import.meta.url)));
function fixture(hash=''){
 const ids=new Map();
 class Element{
  constructor(id){this.id=id;this.hidden=false;this.value='';this.checked=false;this.listeners={};this.attrs={};this.innerHTML='';this.textContent='';this.classList={add(){},remove(){}};}
  addEventListener(name,fn){this.listeners[name]=fn;}
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
 const body=new Element('body'),tablist=new Element('tablist');
 const location={hash};const document={getElementById:id=>ids.get(id),querySelectorAll:selector=>selector==='[role="tab"]'?tabs:[],querySelector:selector=>selector==='.explorer-tabs'?tablist:selector==='.explorer-body'?body:null};
 const window={CRUSTGP_RECORDS:data,matchMedia:()=>({matches:true}),addEventListener(){}};
 const context={document,window,location,history:{replaceState(a,b,hash){location.hash=hash;}},Option:class{constructor(label,value){this.label=label;this.value=value;}},console,setTimeout};
 vm.runInNewContext(script,context);
 assert.equal(ids.get('load-status').textContent,'','Explorer initialization must succeed');
 return {ids,tabs,body,visible:()=>['overview','records','gaps'].filter(id=>!ids.get(id).hidden)};
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
