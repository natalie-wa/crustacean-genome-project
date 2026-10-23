import {comparisonGroups,distinct,summarize,filterRecords,csvText,toggleComparison} from './data-model.js';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=x=>Number(x).toLocaleString('en-US');
let records=[],filtered=[],page=0,selected=[],pageSize=10,coverageAccessions=null;
const tabIds=['overview','records','gaps'];
function showTab(id,{focus=false,updateUrl=true}={}){
 if(id==='compare')id='records';
 if(!tabIds.includes(id))id='overview';
 tabIds.forEach(key=>{const active=key===id;$(key).hidden=!active;$('tab-'+key).setAttribute('aria-selected',String(active));$('tab-'+key).tabIndex=active?0:-1;});
 if(updateUrl)history.replaceState(null,'','#'+id);
 if(focus)$('tab-'+id).focus();
}
function jumpToTab(id){showTab(id,{focus:true});document.querySelector('.explorer-tabs').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
const length=x=>x==null?'Not supplied':x>=1e9?`${(x/1e9).toFixed(2)} Gb`:x>=1e6?`${(x/1e6).toFixed(1)} Mb`:`${number(x)} bp`;
function bars(target,data){const max=Math.max(1,...data.map(d=>d.value));$(target).innerHTML=data.map(d=>`<button type="button" class="chart-row chart-action ${d.value?'':'zero'}" data-drill-kind="${target==='class-chart'?'class':target==='family-chart'?'family':'level'}" data-drill-value="${esc(d.label)}" data-drill-count="${d.value}" aria-label="${esc(d.label)}: ${d.value} ${target==='level-chart'?'records':'taxon IDs'}. ${d.value?'Browse matching records':'View snapshot gap'}."><span>${esc(d.label)}</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${d.value/max*100}%"></span></span><strong>${number(d.value)}</strong></button>`).join('');}
function overview(){
 const summary=summarize(records);
 const metrics=[['Assembly records',summary.records,'GenBank and RefSeq records retained'],['NCBI taxon IDs',summary.taxa,'Includes unresolved organism names'],['Source family labels',summary.families,'Original labels, before WoRMS matching'],['Chromosome records',summary.chromosome,'NCBI assembly-level labels']];
 $('metrics').innerHTML=metrics.map(([label,count,note])=>`<div class="metric"><b>${number(count)}</b><span>${label}</span><small>${note}</small></div>`).join('');
 const groups=[...new Set([...comparisonGroups,...records.map(r=>r.class)])];
 bars('class-chart',groups.map(label=>({label,value:distinct(records.filter(r=>r.class===label),'taxid')})));
 bars('level-chart',['Chromosome','Scaffold','Contig','Complete Genome'].map(label=>({label,value:records.filter(r=>r.level===label).length})));
 const families=[...new Set(records.map(r=>r.family))].filter(Boolean).map(label=>({label,value:distinct(records.filter(r=>r.family===label),'taxid')})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label)).slice(0,6);
 bars('family-chart',families);
 const taxonCounts=new Map();for(const row of records)taxonCounts.set(row.taxid,(taxonCounts.get(row.taxid)||0)+1);
 const single=[...taxonCounts.values()].filter(n=>n===1).length,multiple=taxonCounts.size-single;
 $('multiplicity-chart').innerHTML=`<div class="breadth-cards"><div><b>${number(single)}</b><span>Taxon IDs with one record</span></div><div><b>${number(multiple)}</b><span>Taxon IDs with multiple records</span></div></div><div class="breadth-strip" aria-hidden="true"><span style="width:${single/taxonCounts.size*100}%"></span><span style="width:${multiple/taxonCounts.size*100}%"></span></div><p class="breadth-caption">${number(taxonCounts.size)} taxon IDs across ${number(records.length)} assembly records</p>`;
 $('level-note').textContent=`${summary.short} records are shorter than 100 kb and flagged for scope review. A “Complete Genome” label can also describe an organellar assembly.`;
 const orders=[...new Set(records.map(r=>r.order))].map(order=>{const rows=records.filter(r=>r.order===order);return{order,className:rows[0].class,...summarize(rows)};}).sort((a,b)=>b.taxa-a.taxa||a.order.localeCompare(b.order));
 $('order-matrix').innerHTML=orders.map(r=>`<tr><td><button type="button" class="order-action" data-drill-kind="order" data-drill-value="${esc(r.order)}" data-drill-class="${esc(r.className)}">${esc(r.order)}</button><small>${esc(r.className)}</small></td><td class="count-cell">${number(r.taxa)}</td><td>${number(r.records)}</td><td>${number(r.chromosome)}</td></tr>`).join('');
 $('gap-cards').innerHTML=groups.filter(label=>!records.some(r=>r.class===label)).map(label=>`<article class="gap-card" id="gap-${esc(label)}" tabindex="-1"><h3>${esc(label)}</h3><b>0 records</b><p>No matching source class label in this snapshot.</p><a href="https://www.ncbi.nlm.nih.gov/datasets/genome/?taxon=${encodeURIComponent(label)}" target="_blank" rel="noopener">Search NCBI ↗</a></article>`).join('')||'<p>All configured comparison groups have records in this snapshot.</p>';
}
function populate(id,values,all,selected=''){ $(id).replaceChildren();const empty=new Option(all,'');$(id).add(empty);[...new Set(values)].filter(Boolean).sort().forEach(v=>$(id).add(new Option(v,v)));if(values.includes(selected))$(id).value=selected;}
function updateOrders(){const current=$('order-filter').value;const rows=records.filter(r=>!$('class-filter').value||r.class===$('class-filter').value);populate('order-filter',rows.map(r=>r.order),'All orders',current);}
function applyFilters(){filtered=filterRecords(coverageAccessions?records.filter(r=>coverageAccessions.has(r.accession)):records,{query:$('search').value,className:$('class-filter').value,order:$('order-filter').value,level:$('level-filter').value,hideShort:$('hide-short').checked,reviewOnly:$('review-only').checked});page=0;renderRecords();}
function renderComparison(){
 const rows=selected.map(a=>records.find(r=>r.accession===a));
 $('compare-status').textContent=`${rows.length} of 3 records selected. Selections stay available when you change the record filters.`;
 $('clear-comparison').disabled=!rows.length;
 $('selection-count').textContent=`${rows.length} of 3 selected for comparison`;
 $('comparison-summary-count').textContent=`${rows.length} of 3 selected`;
 
 $('comparison-cards').innerHTML=rows.map(r=>`<article class="comparison-card"><h3><i>${esc(r.name)}</i></h3><a href="https://www.ncbi.nlm.nih.gov/datasets/genome/${encodeURIComponent(r.accession)}/" target="_blank" rel="noopener">${esc(r.accession)} ↗</a><p class="comparison-taxonomy">${esc(r.class)} · ${esc(r.order)}<br>${esc(r.family)}</p><dl><dt>Assembly level</dt><dd>${esc(r.level)}</dd><dt>Assembly length</dt><dd>${length(r.length)}</dd><dt>Contig N50</dt><dd>${length(r.contigN50)}</dd><dt>Scaffold N50</dt><dd>${length(r.n50)}</dd><dt>GC content</dt><dd>${r.gc==null?'Not supplied':r.gc.toFixed(1)+'%'}</dd><dt>Annotation BUSCO complete</dt><dd>${r.busco==null?'Not supplied':(r.busco*100).toFixed(1)+'%'}${r.buscoLineage?`<small>${esc(r.buscoLineage)}</small>`:''}</dd></dl>${r.review?`<p class="badge review">${esc(r.review)}</p>`:''}<button type="button" class="small-button" data-remove="${esc(r.accession)}" aria-label="Remove ${esc(r.accession)} from comparison">Remove</button></article>`).join('')||'<div class="comparison-empty"><p>Select <strong>Compare</strong> in Browse Records to view up to three assemblies together.</p><p>You can compare records from the same organism or across different taxa.</p></div>';
}
function renderRecords(){
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 page=Math.min(page,pages-1);const visible=filtered.slice(page*pageSize,(page+1)*pageSize);
 $('results-count').textContent=`${number(filtered.length)} matching records across ${number(distinct(filtered,'taxid'))} NCBI taxon IDs. Overview charts show the whole snapshot.`;
 $('record-rows').innerHTML=visible.map(r=>`<tr><td><i>${esc(r.name)}</i><small>${esc(r.family)} · ${esc(r.order)}</small><small><a href="https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${encodeURIComponent(r.taxid)}" target="_blank" rel="noopener">Taxon ${esc(r.taxid)} ↗</a></small>${window.crustgpTaxonDetails?window.crustgpTaxonDetails(r):''}<label class="compare-choice"><input type="checkbox" data-compare="${esc(r.accession)}" ${selected.includes(r.accession)?'checked':''} ${selected.length>=3&&!selected.includes(r.accession)?'disabled':''} aria-label="Compare ${esc(r.name)} ${esc(r.accession)}">Compare</label></td><td><a href="https://www.ncbi.nlm.nih.gov/datasets/genome/${encodeURIComponent(r.accession)}/" target="_blank" rel="noopener">${esc(r.accession)} ↗</a><small>${esc(r.submitter)}</small></td><td><span class="badge">${esc(r.level)}</span></td><td>${length(r.length)}<small>Scaffold N50 ${length(r.n50)}</small></td><td>${r.bioproject?`<a href="https://www.ncbi.nlm.nih.gov/bioproject/${encodeURIComponent(r.bioproject)}" target="_blank" rel="noopener">${esc(r.bioproject)} ↗</a>`:'Not supplied'}${r.review?`<small class="badge review">${esc(r.review)}</small>`:''}</td></tr>`).join('')||'<tr><td colspan="5">No records match these filters. Try another name or reset the filters.</td></tr>';
 $('page-count').textContent=filtered.length?`Page ${page+1} of ${pages} · ${page*pageSize+1}–${Math.min((page+1)*pageSize,filtered.length)} of ${number(filtered.length)}`:'No matching records';
 $('previous').disabled=page===0;$('next').disabled=page>=pages-1;$('download').disabled=!filtered.length;
}
try{
 if(!Array.isArray(window.CRUSTGP_RECORDS))throw Error('Assembly data not available');records=[...window.CRUSTGP_RECORDS];records.sort((a,b)=>a.name.localeCompare(b.name)||a.accession.localeCompare(b.accession));
 overview();renderComparison();
 document.querySelectorAll('[role="tab"]').forEach(tab=>{
 tab.addEventListener('click',()=>jumpToTab(tab.getAttribute('aria-controls')));
 tab.addEventListener('keydown',event=>{const current=tabIds.indexOf(tab.getAttribute('aria-controls'));let index;if(event.key==='ArrowRight')index=(current+1)%tabIds.length;else if(event.key==='ArrowLeft')index=(current-1+tabIds.length)%tabIds.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabIds.length-1;else return;event.preventDefault();showTab(tabIds[index],{focus:true});});
 });
 $('open-comparison').addEventListener('click',()=>{$('compare').open=true;$('compare').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 $('page-size').addEventListener('change',()=>{pageSize=Number($('page-size').value);page=0;renderRecords();});
 document.querySelector('.explorer-body').addEventListener('click',event=>{
 const action=event.target.closest('[data-drill-kind]');if(!action)return;
 const kind=action.dataset.drillKind,value=action.dataset.drillValue;
 if(kind==='class'&&action.dataset.drillCount==='0'){jumpToTab('gaps');if($('source-order-details'))$('source-order-details').open=true;document.querySelectorAll('.gap-card').forEach(card=>card.classList.remove('gap-highlight'));const card=$('gap-'+value);if(card){card.classList.add('gap-highlight');card.focus({preventScroll:true});}return;}
 coverageAccessions=null;if($('biodiversity-record-context'))$('biodiversity-record-context').hidden=true;$('search').value='';$('class-filter').value='';$('level-filter').value='';$('hide-short').checked=false;$('review-only').checked=false;updateOrders();$('order-filter').value='';
 if(kind==='class'){$('class-filter').value=value;updateOrders();}
 if(kind==='level')$('level-filter').value=value;
 if(kind==='family')$('search').value=value;
 if(kind==='order'){$('class-filter').value=action.dataset.drillClass;updateOrders();$('order-filter').value=value;}
 applyFilters();jumpToTab('records');
 });
 window.addEventListener('hashchange',()=>showTab(location.hash.slice(1),{updateUrl:false}));
 showTab(location.hash.slice(1),{updateUrl:false});
 if(location.hash==='#compare')$('compare').open=true;
 $('record-rows').addEventListener('change',event=>{const accession=event.target.dataset.compare;if(!accession)return;selected=toggleComparison(selected,accession,records.map(r=>r.accession));renderComparison();renderRecords();});
 $('comparison-cards').addEventListener('click',event=>{const accession=event.target.closest('[data-remove]')?.dataset.remove;if(!accession)return;selected=selected.filter(a=>a!==accession);renderComparison();renderRecords();});
 $('clear-comparison').addEventListener('click',()=>{selected=[];renderComparison();renderRecords();});
 $('example-comparison').addEventListener('click',()=>{selected=records.filter(r=>r.name==='Callinectes sapidus').slice(0,3).map(r=>r.accession);renderComparison();renderRecords();});
 populate('class-filter',records.map(r=>r.class),'All classes');populate('level-filter',records.map(r=>r.level),'All levels');updateOrders();
 $('class-filter').addEventListener('change',()=>{updateOrders();applyFilters();});['order-filter','level-filter','hide-short','review-only'].forEach(id=>$(id).addEventListener('change',applyFilters));$('search').addEventListener('input',applyFilters);
 $('previous').addEventListener('click',()=>{page--;renderRecords();});$('next').addEventListener('click',()=>{page++;renderRecords();});
 $('reset').addEventListener('click',()=>{coverageAccessions=null;if($('biodiversity-record-context'))$('biodiversity-record-context').hidden=true;$('search').value='';$('class-filter').value='';$('level-filter').value='';$('hide-short').checked=false;$('review-only').checked=false;updateOrders();$('order-filter').value='';applyFilters();});
 $('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([csvText(filtered)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='CrustGP-filtered-records.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 window.addEventListener('crustgp:records',event=>{
 const {accessions,label}=event.detail;
 $('reset').click();coverageAccessions=new Set(accessions);
 $('biodiversity-record-context').hidden=false;$('biodiversity-record-context').textContent='WoRMS selection: '+label+'. Showing eligible matched assemblies. Reset filters to return to all records.';
 applyFilters();jumpToTab('records');
 });
 applyFilters();$('load-status').textContent='';
}catch(error){$('load-status').className='error-message';$('load-status').textContent='The records could not load. Please reload this page, or download the source CSV from Data & Methods.';console.error(error);}
