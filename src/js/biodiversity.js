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
  const m=data.matches[r.accession];
  return `<details class="taxon-details"><summary>Taxonomy & external resources</summary>${m?`<p>WoRMS accepted name<br><i>${esc(m.name)}</i><br><a href="${wormsLink(m.id)}" target="_blank" rel="noopener">WoRMS AphiaID ${esc(m.id)} ↗</a></p><p>${m.eligible?'Included in matched-species coverage.':'Name matched; flagged record excluded from coverage.'}</p>`:'<p>WoRMS match unresolved. Excluded from species coverage.</p>'}<a href="${goatLink(r.taxid)}" target="_blank" rel="noopener">Explore NCBI taxon in GoaT ↗</a></details>`;
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
 function openRecords(accessions,label){window.dispatchEvent(new CustomEvent('crustgp:records',{detail:{accessions,label}}));}
 const sources=`<details class="data-sources"><summary>Sources, matching & scope</summary><p>WoRMS exports dated ${esc(data.date)}. Counts describe accepted records in these exports, including records with unspecified recent/fossil status. They are not a verified living-species census.</p><p>Full scientific names are matched case-insensitively with an exact family check. Only unique matches count. Flagged records, unresolved names, and inferred matches are excluded. Multiple assemblies count once per accepted AphiaID. A zero means no matched eligible record in this CrustGP snapshot, not proof that no public genome exists.</p><p>${num(data.matchedRecords)} of ${num(window.CRUSTGP_RECORDS.length)} assembly records have a name match; ${num(data.unresolvedRecords)} remain unresolved. Name matching is provisional and does not establish nuclear assembly completeness.</p><p>Genus-export totals and genera appearing in the species export differ; genus counts are not silently merged. Missing order/family assignments remain in “Unassigned” groups.</p><p><a href="https://www.marinespecies.org/" target="_blank" rel="noopener">World Register of Marine Species ↗</a> · <a href="data/taxonomy-matches.csv">Download match audit</a> · <a href="data/biodiversity-provenance.json">Snapshot provenance</a></p></details>`;
 $('biodiversity-summary').innerHTML=`<div class="section-head"><div><p class="eyebrow">Diversity in context</p><h2>How much is represented?</h2></div><button type="button" id="explore-coverage" class="small-button">Explore coverage</button></div><div class="biodiversity-metrics"><div><b>${num(species.length)}</b><span>Accepted species records</span></div><div><b>${num(data.genusRecords)}</b><span>Accepted genus records</span></div><div><b>${num(data.eligibleSpecies)}</b><span>Species with matched records</span></div><div><b>${pct(data.eligibleSpecies,species.length)}</b><span>Matched share of species export</span></div></div><p class="help">WoRMS ${esc(data.date)} · Conservative matches to this assembly snapshot, with flagged records excluded.</p>${sources}`;
 $('explore-coverage').addEventListener('click',()=>$('tab-gaps').click());
 let orderPage=0,gapPage=0,speciesPage=0,activeOrder='',activeGroup=null;
 function addOptions(id,values,label){$(id).innerHTML='<option value="">'+label+'</option>'+[...new Set(values)].filter(Boolean).sort().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
 addOptions('coverage-class',species.map(s=>s.className),'All classes');
 addOptions('gap-class',species.map(s=>s.className),'All classes');
 function sortedGroups(rank,className='',query='',onlyEmpty=false){return [...sets[rank].values()].filter(g=>(!className||g.className===className)&&(!query||[g.name,g.family,g.order,g.className].join(' ').toLowerCase().includes(query.toLowerCase()))&&(!onlyEmpty||!g.matched)).sort((a,b)=>b.species.length-a.species.length||a.name.localeCompare(b.name));}
 function drawCoverage(){
  let groups=sortedGroups(activeOrder?'family':'order',$('coverage-class').value);
  if(activeOrder)groups=groups.filter(g=>JSON.stringify([g.className,g.order])===activeOrder);
  const pages=Math.max(1,Math.ceil(groups.length/8));orderPage=Math.min(orderPage,pages-1);
  $('coverage-back').hidden=!activeOrder;
  $('coverage-heading').textContent=activeOrder?'Families in '+JSON.parse(activeOrder)[1]:'Representation across orders';
  $('coverage-rows').innerHTML=groups.slice(orderPage*8,orderPage*8+8).map(g=>`<tr><td><button type="button" class="order-action" data-coverage="${esc(g.key)}">${esc(g.name)}</button><small>${esc(g.className)}${activeOrder?' · '+esc(g.order):''}</small></td><td>${num(g.species.length)}</td><td>${num(g.matched)}</td><td><div class="coverage-track" aria-hidden="true"><span style="width:${100*g.matched/g.species.length}%"></span></div><strong>${pct(g.matched,g.species.length)}</strong></td></tr>`).join('')||'<tr><td colspan="4">No groups match this selection.</td></tr>';
  $('coverage-page').textContent=`${num(groups.length)} groups · Page ${orderPage+1} of ${pages}`;
  $('coverage-previous').disabled=orderPage===0;$('coverage-next').disabled=orderPage>=pages-1;
 }
 function drawGaps(){
  const rank=$('gap-rank').value||'family',groups=sortedGroups(rank,$('gap-class').value,$('gap-search').value,$('gap-empty').checked);
  const pages=Math.max(1,Math.ceil(groups.length/8));gapPage=Math.min(gapPage,pages-1);
  $('gap-results').innerHTML=groups.slice(gapPage*8,gapPage*8+8).map(g=>`<tr><td><button type="button" class="order-action" data-gap="${esc(g.key)}">${esc(g.name)}</button><small>${esc(g.className)} · ${esc(g.order||'Unassigned order')}${rank==='genus'?' · '+esc(g.family):''}</small></td><td>${num(g.species.length)}</td><td>${num(g.matched)}</td><td>${num(g.species.length-g.matched)}</td></tr>`).join('')||'<tr><td colspan="4">No groups match. Try another search or show all groups.</td></tr>';
  $('gap-page').textContent=`${num(groups.length)} groups · Page ${gapPage+1} of ${pages}`;
  $('gap-previous').disabled=!gapPage;$('gap-next').disabled=gapPage>=pages-1;
 }
 function selectGroup(g){activeGroup=g;speciesPage=0;$('gap-detail').hidden=false;$('species-query').value='';$('species-status').value='all';drawSpecies();$('gap-detail').scrollIntoView({block:'nearest',behavior:'auto'});}
 function drawSpecies(){
  if(!activeGroup)return;const g=activeGroup,q=$('species-query').value.toLowerCase(),status=$('species-status').value;
  const rows=g.species.filter(s=>(!q||s.name.toLowerCase().includes(q))&&(status==='all'||(status==='matched'?s.accessions.length:!s.accessions.length))).sort((a,b)=>a.name.localeCompare(b.name));
  const pages=Math.max(1,Math.ceil(rows.length/10));speciesPage=Math.min(speciesPage,pages-1);
  $('gap-detail-heading').textContent=g.name;
  $('gap-detail-summary').textContent=`${num(g.species.length)} accepted species · ${num(g.matched)} with matched records · ${num(g.species.length-g.matched)} without a matched record`;
  $('group-records').disabled=!g.accessions.length;
  $('species-rows').innerHTML=rows.slice(speciesPage*10,speciesPage*10+10).map(s=>`<tr><td><i>${esc(s.name)}</i></td><td>${s.accessions.length?'<span class="badge">Matched record</span>':'No matched record'}</td><td><a href="${wormsLink(s.id)}" target="_blank" rel="noopener">WoRMS ↗</a>${s.accessions.length?` · <button type="button" class="order-action" data-species="${esc(s.id)}">Browse records</button>`:''}</td></tr>`).join('')||'<tr><td colspan="3">No species match these filters.</td></tr>';
  $('species-page').textContent=`${num(rows.length)} species · Page ${speciesPage+1} of ${pages}`;$('species-previous').disabled=!speciesPage;$('species-next').disabled=speciesPage>=pages-1;
  $('group-goat').href=goatSearch(g.name.startsWith('Unassigned ')?g.className:g.name);
 }
 $('coverage-class').addEventListener('change',()=>{activeOrder='';orderPage=0;drawCoverage();});
 $('coverage-back').addEventListener('click',()=>{activeOrder='';orderPage=0;drawCoverage();});
 $('coverage-rows').addEventListener('click',e=>{const b=e.target.closest('[data-coverage]');if(!b)return;const rank=activeOrder?'family':'order',g=sets[rank].get(b.dataset.coverage);if(!g)return;if(rank==='order'){activeOrder=JSON.stringify([g.className,g.order]);orderPage=0;drawCoverage();}else selectGroup(g);});
 $('gap-results').addEventListener('click',e=>{const b=e.target.closest('[data-gap]');if(b)selectGroup(sets[$('gap-rank').value||'family'].get(b.dataset.gap));});
 ['gap-rank','gap-class','gap-empty'].forEach(id=>$(id).addEventListener('change',()=>{gapPage=0;drawGaps();}));
 $('gap-search').addEventListener('input',()=>{gapPage=0;drawGaps();});
 for(const [prefix,draw,setPage] of [['coverage',drawCoverage,v=>orderPage+=v],['gap',drawGaps,v=>gapPage+=v],['species',drawSpecies,v=>speciesPage+=v]])for(const [suffix,delta] of [['previous',-1],['next',1]])$(prefix+'-'+suffix).addEventListener('click',()=>{setPage(delta);draw();});
 ['species-query','species-status'].forEach(id=>$(id).addEventListener(id==='species-query'?'input':'change',()=>{speciesPage=0;drawSpecies();}));
 $('close-gap-detail').addEventListener('click',()=>{$('gap-detail').hidden=true;activeGroup=null;});
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
 drawCoverage();drawGaps();drawGoat();
})();
