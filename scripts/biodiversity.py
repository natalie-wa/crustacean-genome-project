"""Conservative WoRMS reconciliation and compact browser data generation."""
import json, csv, hashlib
from collections import defaultdict, Counter
from taxonomy import reconcile

def prepare(root, out, records):
    worms=json.loads((root/'data/source/worms.json').read_text())
    goat=json.loads((root/'data/source/goat.json').read_text())
    outcomes=reconcile(root,worms['species'],records)
    matches={}; audit=[]; eligible=defaultdict(list)
    reference_rows={s[0]:s for s in worms['species']}
    for r in records:
        o=outcomes[r['accession']];species_id=o.get('species_id')
        included=bool(species_id and not r['review'])
        if species_id and not o['evidence']:o['evidence']=['https://www.marinespecies.org/aphia.php?p=taxdetails&id='+species_id]
        if species_id:
            matches[r['accession']]={'id':species_id,'name':o['accepted_name'],'eligible':included,'method':o['method']}
            if included: eligible[species_id].append(r['accession'])
        audit.append([r['accession'],r['name'],r['taxid'],r['class'],r['family'],reference_rows[species_id][4] if species_id else '',o['status'],species_id or '',o.get('accepted_id',''),o.get('accepted_name',''),o.get('accepted_rank',''),included,r['review'],o['method'],o['reason'],' ; '.join(o['evidence'])])
    with (out/'data/taxonomy-matches.csv').open('w') as f:
        writer=csv.writer(f);writer.writerow(['accession','source_name','ncbi_taxid','source_class','source_family','coverage_reference_family','match_status','coverage_species_aphia_id','resolved_aphia_id','resolved_name','resolved_rank','coverage_eligible','assembly_review_flag','match_method','reason','evidence_urls']);writer.writerows(audit)
    status_counts=Counter(o['status'] for o in outcomes.values())
    category_counts={'matched':len(matches),'unidentified':status_counts['unidentified'],'outside_reference':status_counts['outside_reference'],'needs_review':status_counts['needs_review']}
    assert sum(category_counts.values())==len(records)
    summary={'date':'2026-10-23','assemblyRecords':len(records),'categoryRecords':category_counts,'methodRecords':dict(status_counts),'eligibleSpecies':len(eligible),'eligibleFamilies':len({tuple(s[2:5]) for s in worms['species'] if s[0] in eligible and s[4]})}
    summary['categories']={key:{'records':value,'organismNames':len({r['name'] for r in records if (outcomes[r['accession']]['status'].startswith('matched') if key=='matched' else outcomes[r['accession']]['status']==key)}),'ncbiTaxonIds':len({r['taxid'] for r in records if (outcomes[r['accession']]['status'].startswith('matched') if key=='matched' else outcomes[r['accession']]['status']==key)})} for key,value in category_counts.items()}
    (out/'data/taxonomy-summary.json').write_text(json.dumps(summary,indent=2))
    evidence_dir=out/'data/taxonomy-evidence';evidence_dir.mkdir()
    import shutil
    shutil.copy(root/'docs/TAXONOMY_RECONCILIATION.md',out/'data/taxonomy-reconciliation.md')
    for f in (root/'data/source').glob('*evidence.json'):shutil.copy(f,evidence_dir/f.name)
    groups=[]; group_ids={}; genera=[]; genus_ids={}; species=[]
    for s in worms['species']:
        key=tuple(s[2:5])
        if key not in group_ids: group_ids[key]=len(groups);groups.append(key)
        if s[5] not in genus_ids: genus_ids[s[5]]=len(genera);genera.append(s[5])
        species.append([s[0],s[1],group_ids[key],genus_ids[s[5]],eligible.get(s[0],[])])
    payload={'date':worms['date'],'species':species,'groups':groups,'genera':genera,
        'genusRecords':len(worms['genera']),'matches':matches,
        'eligibleSpecies':len(eligible),'matchedRecords':len(matches),'reconciliationDate':summary['date'],
        'unresolvedRecords':category_counts['needs_review'],'reconciliationCounts':category_counts,'reconciliation':outcomes,'sources':worms['sources'],'scope':worms['scope'],'goat':goat}
    (out/'data/biodiversity.js').write_text('window.CRUSTGP_BIODIVERSITY='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
    (out/'data/biodiversity-provenance.json').write_text(json.dumps({k:v for k,v in payload.items() if k in ['date','sources','scope','eligibleSpecies','matchedRecords','reconciliationCounts','reconciliationDate']}|{'evidence':[{'file':'taxonomy-evidence/'+f.name,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted((root/'data/source').glob('*evidence.json'))],'matching':'Full-name matches precede unique subgenus-normalized matches. Higher-class concordance is required. Family changes require WoRMS accepted-ID evidence; synonyms use exact-name accepted IDs or explicit NCBI cross-references. Only accepted species IDs present in the supplied species export enter coverage. A subspecies may roll up only through a documented NCBI species ancestor confirmed as accepted by WoRMS, without conflicting WoRMS evidence. No fuzzy spelling matches or blind trinomial truncation. Accepted targets absent from the species export, unidentified source taxa, and cases needing review are separate categories. Flagged assemblies are excluded from coverage.','goat':{k:v for k,v in goat.items() if k!='rows'}},indent=2))
    with (out/'data/goat-genome-sizes.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=list(goat['rows'][0]));writer.writeheader();writer.writerows(goat['rows'])
    print('WoRMS:',len(eligible),'species with unflagged matched records;',len(matches),'matched assembly records;',category_counts,'record categories')

    return summary
