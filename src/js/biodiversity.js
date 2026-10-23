/* WoRMS denominators and GoaT summaries are independent dated snapshots. */
(() => {
 'use strict';
 const data=window.CRUSTGP_BIODIVERSITY;if(!data)return;
 const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=x=>Number(x).toLocaleString('en-US'), pct=(n,d)=>d?(100*n/d).toFixed(2)+'%':'—';
 const goatLink=taxid=>'https://goat.genomehubs.org/record?recordId=taxon-'+encodeURIComponent(taxid)+'&result=taxon&taxonomy=ncbi';
 const wormsLink=id=>'https://www.marinespecies.org/aphia.php?p=taxdetails&id='+encodeURIComponent(id);
 const goatSearch=name=>'https://goat.genomehubs.org/search?query='+encodeURIComponent('tax_tree('+name+')')+'&result=taxon&taxonomy=ncbi';
 window.crustgpTaxonDetails=r=>{
  const m=data.matches[r.accession],o=data.reconciliation[r.accession];
  const label=o.status==='unidentified'?'Species not identified':o.status==='outside_reference'?'WoRMS-resolved taxon outside species export':'Reference match needs review';
  return `<details class="taxon-details"><summary>Taxonomy & external resources</summary>${m?`<p>WoRMS accepted species<br><i>${esc(m.name)}</i><br><a href="${wormsLink(m.id)}" target="_blank" rel="noopener">WoRMS AphiaID ${esc(m.id)} ↗</a></p><p>${m.eligible?'Included in matched-species coverage.':'Name matched; flagged assembly excluded from coverage.'}</p><p>${esc(o.method)}</p>${o.status==='matched_family_update'?`<p>${esc(o.reason)}</p>`:''}`:`<p><strong>${esc(label)}</strong><br>${esc(o.reason)}</p>${o.accepted_id?`<p><a href="${wormsLink(o.accepted_id)}" target="_blank" rel="noopener"><i>${esc(o.accepted_name)}</i> (${esc(o.accepted_rank)}) in WoRMS ↗</a></p>`:''}<p>Excluded from the species-coverage numerator.</p>`}<a href="${goatLink(r.taxid)}" target="_blank" rel="noopener">Explore NCBI taxon in GoaT ↗</a></details>`;
 };
 const species=data.species.map(s=>({id:s[0],name:s[1],className:data.groups[s[2]][0],order:data.groups[s[2]][1],family:data.groups[s[2]][2],genus:data.genera[s[3]],accessions:s[4]}));
 const sets={order:new Map(),family:new Map(),genus:new Map()};
 for(const s of species)for(const rank of Object.keys(sets)){
  // Include lineage in keys so identical names in different groups stay separate.
  const key=JSON.stringify([s.className,s.order,rank==='order'?'':s.family,rank==='genus'?s.genus:'']);
  let group=sets[rank].get(key);
  if(!group){group={key,name:s[rank]||'Unassigned '+rank,className:s.className,order:s.order,family:s.family,species:[],matched:0,accessions:[]};sets[rank].set(key,group);}
  group.species.push(s);if(s.accessions.length){group.matched++;group.accessions.push(...s.accessions);}
 }
 function openRecords(accessions,label){const dialog=$('gap-detail');if(dialog.open&&dialog.close)dialog.close();dialog.hidden=true;window.dispatchEvent(new CustomEvent('crustgp:records',{detail:{accessions,label}}));}
 const sources=`<details class="data-sources"><summary>Sources, matching & scope</summary><p>WoRMS exports dated ${esc(data.date)}. Reconciliation uses WoRMS and NCBI evidence retrieved ${esc(data.reconciliationDate)}. Counts describe accepted records in these exports, including records with unspecified recent/fossil status. They are not a verified living-species census.</p><p>Full names, subgenus notation, and synonyms are reconciled to accepted WoRMS IDs. Family classification changes require WoRMS evidence. Subspecies roll-ups require documented lineage evidence. Only accepted species IDs in the supplied species export enter coverage. Flagged assemblies are excluded. Multiple assemblies count once per accepted AphiaID. A zero means no matched eligible record in this CrustGP snapshot, not proof that no public genome exists.</p><p>${num(data.matchedRecords)} of ${num(window.CRUSTGP_RECORDS.length)} assembly records map to species in the export. Separately, ${num(data.reconciliationCounts.unidentified)} records have unidentified source taxa, ${num(data.reconciliationCounts.outside_reference)} resolve in WoRMS outside the species export, and ${num(data.reconciliationCounts.needs_review)} await a verified reference match. Record counts include repeated assemblies; they are not species counts. Mapping does not establish nuclear assembly completeness.</p><p>Genus-export totals and genera appearing in the species export differ; genus counts are not silently merged. Missing order/family assignments remain in “Unassigned” groups.</p><p><a href="https://www.marinespecies.org/" target="_blank" rel="noopener">World Register of Marine Species ↗</a> · <a href="data/taxonomy-matches.csv">Download accession-level audit</a> · <a href="data/taxonomy-summary.json">Reconciliation summary</a> · <a href="data/taxonomy-reconciliation.md">Full review report</a> · <a href="data/biodiversity-provenance.json">Snapshot provenance</a></p></details>`;
 $('biodiversity-summary').innerHTML=`<div class="diversity-intro"><div><p class="eyebrow">Diversity in context</p><h2>A small fraction of a vast diversity</h2><p><strong>${num(data.eligibleSpecies)} accepted species</strong> have eligible matched records among <strong>${num(species.length)}</strong> species in the supplied WoRMS export.</p></div><div class="snapshot-share"><b>${pct(data.eligibleSpecies,species.length)}</b><span>matched share of the export</span></div></div><div class="context-bottom"><p class="help">WoRMS ${esc(data.date)} · ${num(data.genusRecords)} accepted genus records · Conservative matches to the existing assembly snapshot</p><button type="button" id="explore-coverage" class="small-button">Explore coverage →</button></div>${sources}`;
 $('explore-coverage').addEventListener('click',()=>$('tab-gaps').click());
 let orderPage=0,gapPage=0,speciesPage=0,activeOrder='',activeGroup=null;
 function addOptions(id,values,label){$(id).innerHTML='<option value="">'+label+'</option>'+[...new Set(values)].filter(Boolean).sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
 addOptions('coverage-class',species.map(s=>s.className),'All classes');
 $('coverage-class').innerHTML+='<option value="__other__">Other groups (combined)</option>';
 addOptions('gap-class',species.map(s=>s.className),'All classes');
 function sortedGroups(rank,className='',query='',onlyEmpty=false){return [...sets[rank].values()].filter(g=>(!className||g.className===className)&&(!query||[g.name,g.family,g.order,g.className].join(' ').toLowerCase().includes(query.toLowerCase()))&&(!onlyEmpty||!g.matched)).sort((a,b)=>b.species.length-a.species.length||a.name.localeCompare(b.name));}
 let otherClasses=[];
 function shareLabel(n,d){const v=100*n/d;return n&&v<0.1?'&lt;0.1%':v.toFixed(1)+'%';}
 function drawStory(){
  const classGroups=new Map();
  for(const s of species){const key=s.className||'Unassigned class';let g=classGroups.get(key);if(!g){g={name:key,total:0,matched:0};classGroups.set(key,g);}g.total++;if(s.accessions.length)g.matched++;}
  const ordered=[...classGroups.values()].sort((a,b)=>b.total-a.total),top=ordered.slice(0,5),other=ordered.slice(5);
  otherClasses=other.map(g=>g.name);
  if(other.length)top.push({name:'Other groups',total:other.reduce((n,g)=>n+g.total,0),matched:other.reduce((n,g)=>n+g.matched,0),other:true});
  $('diversity-chart').innerHTML=top.map(g=>`<button type="button" class="paired-row" data-species-count="${g.total}" data-matched-count="${g.matched}" data-story-class="${esc(g.other?'__other__':g.name)}" aria-label="${esc(g.name)}: ${num(g.total)} accepted species, ${num(g.matched)} matched species. Explore coverage."><span class="paired-name">${esc(g.name)}</span><span class="paired-bars"><span class="paired-line"><span class="paired-track"><i class="diversity-fill" style="width:${100*g.total/species.length}%"></i></span><strong>${shareLabel(g.total,species.length)}</strong></span><span class="paired-line"><span class="paired-track"><i class="matched-fill" style="width:${(data.eligibleSpecies?100*g.matched/data.eligibleSpecies:0)}%"></i></span><strong>${g.matched?shareLabel(g.matched,data.eligibleSpecies):'No matches'}</strong></span></span></button>`).join('');
  const families=[...sets.family.values()].filter(g=>g.family),reached=families.filter(g=>g.matched),unreached=families.length-reached.length,share=100*reached.length/families.length;
  $('family-reach').innerHTML=`<div class="reach-ring-wrap"><svg class="reach-ring" viewBox="0 0 220 220" role="img" aria-label="${num(reached.length)} of ${num(families.length)} named families have matched species"><circle class="ring-base" cx="110" cy="110" r="88" pathLength="100"/><circle class="ring-fill" cx="110" cy="110" r="88" pathLength="100" stroke-dasharray="${share} ${100-share}" transform="rotate(-90 110 110)"/><text x="110" y="105" text-anchor="middle" class="ring-number">${num(reached.length)}</text><text x="110" y="133" text-anchor="middle" class="ring-label">families reached</text></svg></div><div class="reach-key"><p><i class="matched-key"></i><strong>${num(reached.length)}</strong> with matched species</p><p><i class="diversity-key"></i><strong>${num(unreached)}</strong> without matched species</p></div><p class="reach-denominator">${num(families.length)} named families in the species export<br>Unassigned families excluded</p>`;
  const biggest=families.filter(g=>!g.matched).sort((a,b)=>b.species.length-a.species.length||a.name.localeCompare(b.name)).slice(0,6),max=Math.max(...biggest.map(g=>g.species.length));
  $('largest-gaps').innerHTML=biggest.map(g=>`<button type="button" class="largest-gap-row" data-largest-gap="${esc(g.key)}" aria-label="${esc(g.name)}: ${num(g.species.length)} accepted species, no matched records. Explore species."><span><strong>${esc(g.name)}</strong><small>${esc(g.className)} · ${esc(g.order)}</small></span><span class="richness-track" aria-hidden="true"><i style="width:${100*g.species.length/max}%"></i></span><span class="richness-count">${num(g.species.length)}<small>species</small></span><span class="row-arrow" aria-hidden="true">↗</span></button>`).join('');
 }
 function drawCoverage(){
  const rank=activeOrder?'family':'order',status=$('coverage-status').value||'matched';
  const chosenClass=$('coverage-class').value,groupFilter=g=>chosenClass!=='__other__'||otherClasses.includes(g.className||'Unassigned class');
  let groups=sortedGroups(rank,chosenClass==='__other__'?'':chosenClass,$('coverage-search').value).filter(groupFilter);
  if(activeOrder)groups=groups.filter(g=>JSON.stringify([g.className,g.order])===activeOrder);
  const total=groups.length,reached=groups.filter(g=>g.matched).length;
  const namedOrders=sortedGroups('order',chosenClass==='__other__'?'':chosenClass).filter(g=>g.order&&groupFilter(g)),reachedOrders=namedOrders.filter(g=>g.matched).length;
  $('order-landscape').hidden=!!activeOrder;
  $('order-landscape').innerHTML=`<div class="landscape-heading"><p><b>${reachedOrders}</b> of ${namedOrders.length} named orders have matched species</p><span>${namedOrders.length-reachedOrders} without matched records</span></div><div class="order-strip" role="img" aria-label="${reachedOrders} of ${namedOrders.length} named orders represented. Each equal-width segment is one order.">${namedOrders.map(g=>`<span class="${g.matched?'is-reached':''}" title="${esc(g.name)}: ${g.matched} matched species of ${g.species.length}"></span>`).join('')}</div><p class="help">Each segment is one order. Dark teal indicates a matched species; outlined segments indicate no match. Unassigned orders are excluded from this strip.</p>`;
  if(status==='matched')groups=groups.filter(g=>g.matched);if(status==='empty')groups=groups.filter(g=>!g.matched);
  const pages=Math.max(1,Math.ceil(groups.length/6));orderPage=Math.min(orderPage,pages-1);
  $('coverage-back').hidden=!activeOrder;
  $('coverage-heading').textContent=activeOrder?'Families in '+(JSON.parse(activeOrder)[1]||'unassigned order'):'Explore orders';
  $('coverage-context').textContent=`${total} ${rank} groups in this selection · ${reached} with matched species. ${activeOrder?'Choose a family to inspect its species.':'Choose an order to explore its families.'}`;
  $('coverage-rows').innerHTML=groups.slice(orderPage*6,orderPage*6+6).map(g=>`<button type="button" class="coverage-card ${g.matched?'has-match':'no-match'}" data-coverage="${esc(g.key)}"><span class="coverage-card-top"><span class="coverage-class-label">${esc(g.className||'Unassigned class')}</span><span aria-hidden="true">↗</span></span><strong class="coverage-name">${esc(g.name)}</strong>${g.matched?`<span class="coverage-count"><b>${num(g.matched)}</b> matched species</span><span class="coverage-denominator">of ${num(g.species.length)} accepted species</span><span class="card-coverage-track" aria-hidden="true"><i style="width:${100*g.matched/g.species.length}%"></i></span><span class="coverage-card-foot">${pct(g.matched,g.species.length)} matched · Explore ${activeOrder?'species':'families'}</span>`:`<span class="unmatched-label">No matched records</span><span class="coverage-count"><b>${num(g.species.length)}</b> accepted species</span><span class="coverage-card-foot">Explore ${activeOrder?'species':'families'} in this gap →</span>`}</button>`).join('')||'<p class="empty-groups">No groups match these filters. Choose “All groups” or try another class or name.</p>';
  $('coverage-page').textContent=`${num(groups.length)} groups shown · Page ${orderPage+1} of ${pages}`;
  $('coverage-previous').disabled=orderPage===0;$('coverage-next').disabled=orderPage>=pages-1;
 }
 function drawGaps(){
  const rank=$('gap-rank').value||'family',groups=sortedGroups(rank,$('gap-class').value,$('gap-search').value,$('gap-empty').checked).filter(g=>rank==='family'?Boolean(g.family):!g.name.startsWith('Unassigned '));
  const pages=Math.max(1,Math.ceil(groups.length/8));gapPage=Math.min(gapPage,pages-1);
  $('gap-results').innerHTML=groups.slice(gapPage*8,gapPage*8+8).map(g=>`<tr><td><button type="button" class="order-action" data-gap="${esc(g.key)}">${esc(g.name)}</button><small>${esc(g.className)} · ${esc(g.order||'Unassigned order')}${rank==='genus'?' · '+esc(g.family):''}</small></td><td>${num(g.species.length)}</td><td>${num(g.matched)}</td><td>${num(g.species.length-g.matched)}</td></tr>`).join('')||'<tr><td colspan="4">No groups match. Try another search or show all groups.</td></tr>';
  $('gap-page').textContent=`${num(groups.length)} groups · Page ${gapPage+1} of ${pages}`;
  $('gap-previous').disabled=!gapPage;$('gap-next').disabled=gapPage>=pages-1;
 }
 function selectGroup(g){activeGroup=g;speciesPage=0;$('gap-detail').hidden=false;$('species-query').value='';$('species-status').value='all';drawSpecies();const dialog=$('gap-detail');if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}else dialog.scrollIntoView({block:'nearest',behavior:'auto'});}
 function drawSpecies(){
  if(!activeGroup)return;const g=activeGroup,q=$('species-query').value.toLowerCase(),status=$('species-status').value;
  const rows=g.species.filter(s=>(!q||s.name.toLowerCase().includes(q))&&(status==='all'||(status==='matched'?s.accessions.length:!s.accessions.length))).sort((a,b)=>a.name.localeCompare(b.name));
  const pages=Math.max(1,Math.ceil(rows.length/6));speciesPage=Math.min(speciesPage,pages-1);
  $('gap-detail-heading').textContent=g.name;
  $('gap-detail-summary').textContent=`${num(g.species.length)} accepted species · ${num(g.matched)} with matched records · ${num(g.species.length-g.matched)} without a matched record`;
  $('group-records').disabled=!g.accessions.length;
  $('species-rows').innerHTML=rows.slice(speciesPage*6,speciesPage*6+6).map(s=>`<tr><td><i>${esc(s.name)}</i></td><td>${s.accessions.length?'<span class="badge">Matched record</span>':'No matched record'}</td><td><a href="${wormsLink(s.id)}" target="_blank" rel="noopener">WoRMS ↗</a>${s.accessions.length?` · <button type="button" class="order-action" data-species="${esc(s.id)}">Browse records</button>`:''}</td></tr>`).join('')||'<tr><td colspan="3">No species match these filters.</td></tr>';
  $('species-page').textContent=`${num(rows.length)} species · Page ${speciesPage+1} of ${pages}`;$('species-previous').disabled=!speciesPage;$('species-next').disabled=speciesPage>=pages-1;
  $('group-goat').href=goatSearch(g.name.startsWith('Unassigned ')?g.className:g.name);
 }
 $('coverage-class').addEventListener('change',()=>{activeOrder='';orderPage=0;drawCoverage();});
 $('coverage-back').addEventListener('click',()=>{activeOrder='';orderPage=0;$('coverage-status').value='matched';$('coverage-search').value='';drawCoverage();});
 $('coverage-rows').addEventListener('click',e=>{const b=e.target.closest('[data-coverage]');if(!b)return;const rank=activeOrder?'family':'order',g=sets[rank].get(b.dataset.coverage);if(!g)return;if(rank==='order'){activeOrder=JSON.stringify([g.className,g.order]);orderPage=0;$('coverage-status').value='all';$('coverage-search').value='';drawCoverage();}else selectGroup(g);});
 $('coverage-status').addEventListener('change',()=>{orderPage=0;drawCoverage();});
 $('coverage-search').addEventListener('input',()=>{orderPage=0;drawCoverage();});
 $('diversity-chart').addEventListener('click',event=>{const b=event.target.closest('[data-story-class]');if(!b)return;$('coverage-class').value=b.dataset.storyClass;$('coverage-status').value='all';$('coverage-search').value='';activeOrder='';orderPage=0;drawCoverage();$('tab-gaps').click();$('order-representation').scrollIntoView({block:'start',behavior:'auto'});});
 $('reach-gaps').addEventListener('click',()=>{$('gap-rank').value='family';$('gap-class').value='';$('gap-search').value='';$('gap-empty').checked=true;gapPage=0;drawGaps();$('tab-gaps').click();$('gap-finder').scrollIntoView({block:'start',behavior:'auto'});});
 $('largest-gaps').addEventListener('click',event=>{const b=event.target.closest('[data-largest-gap]');if(b)selectGroup(sets.family.get(b.dataset.largestGap));});
 $('gap-results').addEventListener('click',e=>{const b=e.target.closest('[data-gap]');if(b)selectGroup(sets[$('gap-rank').value||'family'].get(b.dataset.gap));});
 ['gap-rank','gap-class','gap-empty'].forEach(id=>$(id).addEventListener('change',()=>{gapPage=0;drawGaps();}));
 $('gap-search').addEventListener('input',()=>{gapPage=0;drawGaps();});
 for(const [prefix,draw,setPage] of [['coverage',drawCoverage,v=>orderPage+=v],['gap',drawGaps,v=>gapPage+=v],['species',drawSpecies,v=>speciesPage+=v]])for(const [suffix,delta] of [['previous',-1],['next',1]])$(prefix+'-'+suffix).addEventListener('click',()=>{setPage(delta);draw();});
 ['species-query','species-status'].forEach(id=>$(id).addEventListener(id==='species-query'?'input':'change',()=>{speciesPage=0;drawSpecies();}));
 $('close-gap-detail').addEventListener('click',()=>{const dialog=$('gap-detail');if(dialog.close)dialog.close();dialog.hidden=true;activeGroup=null;});
 $('gap-detail').addEventListener('cancel',()=>{$('gap-detail').hidden=true;activeGroup=null;});
 $('group-records').addEventListener('click',()=>openRecords(activeGroup.accessions,activeGroup.name));
 $('species-rows').addEventListener('click',e=>{const b=e.target.closest('[data-species]');if(b){const s=activeGroup.species.find(s=>s.id===b.dataset.species);openRecords(s.accessions,s.name);}});
 // A log-scaled strip plot keeps differences in genome size visible across orders of magnitude.
 const goat=data.goat, all=goat.rows, classes=[...new Set(all.map(r=>r.class))].sort();
 addOptions('goat-class',classes,'All measured groups');
 function drawGoat(){
  const chosen=$('goat-class').value,rows=all.filter(r=>!chosen||r.class===chosen),labels=classes.filter(c=>!chosen||c===chosen);
  const lo=Math.floor(Math.log10(Math.min(...all.map(r=>r.bp)))),hi=Math.ceil(Math.log10(Math.max(...all.map(r=>r.bp))));
  const left=150,width=600,h=80+labels.length*54,x=bp=>left+(Math.log10(bp)-lo)/(hi-lo)*width;
  $('goat-chart').innerHTML=`<svg viewBox="0 0 790 ${h}" role="img" aria-labelledby="goat-chart-title goat-chart-desc"><title id="goat-chart-title">Crustacean genome-size summaries from GoaT</title><desc id="goat-chart-desc">${rows.length} species-level taxa with direct summaries. Each dot is a species-level taxon. Horizontal position is genome size on a logarithmic scale. Use the species selector below for accessible record links.</desc>${Array.from({length:hi-lo+1},(_,i)=>{const bp=10**(lo+i);return `<line x1="${x(bp)}" x2="${x(bp)}" y1="15" y2="${h-45}" class="plot-grid"/><text x="${x(bp)}" y="${h-20}" text-anchor="middle">${bp>=1e9?bp/1e9+' Gb':bp/1e6+' Mb'}</text>`;}).join('')}${labels.map((c,i)=>`<text x="140" y="${42+i*54}" text-anchor="end">${esc(c)}</text>`).join('')}${rows.map(r=>{const y=36+labels.indexOf(r.class)*54+(Number(r.taxid)%23-11)*1.25;return `<a href="${goatLink(r.taxid)}" target="_blank" rel="noopener" tabindex="-1" aria-label="${esc(r.name)} in GoaT"><circle cx="${x(r.bp).toFixed(2)}" cy="${y.toFixed(2)}" r="4.5"><title>${esc(r.name)} · ${(r.bp/1e9).toFixed(3)} Gb · direct ${esc(r.method)} summary</title></circle></a>`;}).join('')}</svg>`;
  const sorted=[...rows].sort((a,b)=>a.name.localeCompare(b.name));
  $('goat-species').innerHTML=sorted.map(r=>`<option value="${esc(r.taxid)}">${esc(r.name)} · ${(r.bp/1e9).toFixed(3)} Gb</option>`).join('');updateGoatLink();
  $('goat-count').textContent=`${num(rows.length)} species-level taxa shown · GoaT snapshot ${goat.date} · Logarithmic genome-size axis`;
 }
 function updateGoatLink(){$('goat-record-link').href=goatLink($('goat-species').value);}
 $('goat-class').addEventListener('change',drawGoat);$('goat-species').addEventListener('change',updateGoatLink);
 $('goat-source-note').innerHTML=`<details class="data-sources"><summary>GoaT sources & interpretation</summary><p>Data from <a href="https://goat.genomehubs.org/" target="_blank" rel="noopener">Genomes on a Tree</a>, retrieved ${esc(goat.date)}. We plotted species-rank genome_size summaries marked “direct” by GoaT. Ancestor/descendant-inferred values are excluded. Some species-rank entries have unresolved names such as “sp.”; these are retained as labeled taxa. Direct is an aggregation label, not a guarantee of an independent experimental measurement. Follow each record for its underlying sources and methods.</p><p>The query covers NCBI Pancrustacea with Hexapoda descendants removed. These ${num(all.length)} taxa are a separate resource from our assembly snapshot and are not the species-coverage numerator. Assembly length and genome size are different measures. This chart was drawn for CrustGP using GoaT data.</p><p><a href="https://doi.org/10.12688/wellcomeopenres.18658.1" target="_blank" rel="noopener">Challis et al. (2023), GoaT ↗</a> · <a href="data/goat-genome-sizes.csv">Download plotted data</a> · <a href="data/biodiversity-provenance.json">Query and provenance</a></p></details>`;
 drawStory();drawCoverage();drawGaps();drawGoat();
})();
