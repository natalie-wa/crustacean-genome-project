export const comparisonGroups=['Malacostraca','Branchiopoda','Copepoda','Thecostraca','Ostracoda','Remipedia','Cephalocarida','Branchiura','Mystacocarida'];
export const distinct=(rows,key)=>new Set(rows.map(r=>r[key]).filter(Boolean)).size;
export const isShort=r=>r.length>0&&r.length<100000;
export function summarize(rows){return {records:rows.length,taxa:distinct(rows,'taxid'),families:distinct(rows,'family'),chromosome:rows.filter(r=>r.level==='Chromosome').length,flagged:rows.filter(r=>r.review).length,short:rows.filter(isShort).length};}
export function filterRecords(rows,{query='',className='',order='',level='',hideShort=false,reviewOnly=false}={}){
 const q=query.toLocaleLowerCase().trim();
 return rows.filter(r=>(!className||r.class===className)&&(!order||r.order===order)&&(!level||r.level===level)&&(!hideShort||!isShort(r))&&(!reviewOnly||Boolean(r.review))&&(!q||[r.name,r.family,r.order,r.class,r.accession,r.taxid,r.bioproject,r.submitter].join(' ').toLocaleLowerCase().includes(q)));
}
export function csvText(rows){const fields=['name','taxid','class','order','family','accession','level','length','n50','contigN50','gc','busco','buscoLineage','bioproject','submitter','review'];const cell=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return [fields,...rows.map(r=>fields.map(f=>r[f]))].map(row=>row.map(cell).join(',')).join('\r\n');}
export function toggleComparison(selected,accession,validAccessions,limit=3){
 if(!validAccessions.includes(accession))return selected;
 if(selected.includes(accession))return selected.filter(x=>x!==accession);
 return selected.length<limit?[...selected,accession]:selected;
}
