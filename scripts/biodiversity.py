"""Conservative WoRMS reconciliation and compact browser data generation."""
import json, csv
from collections import defaultdict

def prepare(root, out, records):
    worms=json.loads((root/'data/source/worms.json').read_text())
    goat=json.loads((root/'data/source/goat.json').read_text())
    names=defaultdict(list)
    for s in worms['species']: names[s[1].casefold()].append(s)
    matches={}; audit=[]; eligible=defaultdict(list)
    for r in records:
        candidates=names[r['name'].casefold()]
        candidates=[s for s in candidates if s[4] and s[4]==r['family']]
        s=candidates[0] if len(candidates)==1 else None
        reason='exact name and family' if s else 'unresolved: no unique exact name and family match'
        if s:
            matches[r['accession']]={'id':s[0],'name':s[1],'eligible':not bool(r['review'])}
            if not r['review']: eligible[s[0]].append(r['accession'])
        if r['review']: reason+='; excluded from coverage: '+r['review']
        audit.append([r['accession'],r['name'],r['taxid'],s[0] if s else '',s[1] if s else '',bool(s and not r['review']),reason])
    with (out/'data/taxonomy-matches.csv').open('w') as f:
        writer=csv.writer(f);writer.writerow(['accession','source_name','ncbi_taxid','aphia_id','accepted_name','coverage_eligible','match_method']);writer.writerows(audit)
    groups=[]; group_ids={}; genera=[]; genus_ids={}; species=[]
    for s in worms['species']:
        key=tuple(s[2:5])
        if key not in group_ids: group_ids[key]=len(groups);groups.append(key)
        if s[5] not in genus_ids: genus_ids[s[5]]=len(genera);genera.append(s[5])
        species.append([s[0],s[1],group_ids[key],genus_ids[s[5]],eligible.get(s[0],[])])
    payload={'date':worms['date'],'species':species,'groups':groups,'genera':genera,
        'genusRecords':len(worms['genera']),'matches':matches,
        'eligibleSpecies':len(eligible),'matchedRecords':len(matches),
        'unresolvedRecords':len(records)-len(matches),'sources':worms['sources'],'scope':worms['scope'],'goat':goat}
    (out/'data/biodiversity.js').write_text('window.CRUSTGP_BIODIVERSITY='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
    (out/'data/biodiversity-provenance.json').write_text(json.dumps({k:v for k,v in payload.items() if k in ['date','sources','scope','eligibleSpecies','matchedRecords','unresolvedRecords']}|{'matching':'Exact case-insensitive full scientific name and exact family; only unique candidates. No fuzzy matches or inferred subspecies. Flagged records excluded from coverage. Counts are lower-bound matches within this assembly snapshot.','goat':{k:v for k,v in goat.items() if k!='rows'}},indent=2))
    with (out/'data/goat-genome-sizes.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(goat['rows'][0]));writer.writeheader();writer.writerows(goat['rows'])
    print('WoRMS:',len(eligible),'species with unflagged matched records;',len(matches),'matched assembly records;',len(records)-len(matches),'unresolved records')
