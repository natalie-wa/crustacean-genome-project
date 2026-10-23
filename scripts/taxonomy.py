"""Reconcile names against a frozen species export using recorded evidence.

No fuzzy spelling matches, guessed synonyms, or automatic trinomial truncation.
WoRMS accepted targets must occur in the species export to enter coverage.
"""
import json, re
from collections import defaultdict

def canonical(name):
    name=' '.join(name.split())
    return re.sub(r'^([A-Za-z]+)\s+\([A-Za-z]+\)\s+',r'\1 ',name).casefold()

def reconcile(root, species, records):
    source=root/'data/source'
    by_id={s[0]:s for s in species}; exact=defaultdict(list); normalized=defaultdict(list)
    for s in species:
        exact[s[1].casefold()].append(s);normalized[canonical(s[1])].append(s)
    names={}; name_urls={}
    for file in ['worms-name-evidence.json','worms-additional-evidence.json']:
        evidence=json.loads((source/file).read_text())
        for name, rows in zip(evidence['names'],evidence['results']):
            names[name]=rows or [];name_urls[name]=evidence['url']
    crossrefs=json.loads((source/'worms-crossref-evidence.json').read_text())['results']
    targets={str(r['AphiaID']):r for r in json.loads((source/'worms-target-evidence.json').read_text())['records']}
    ncbi_data=json.loads((source/'ncbi-taxonomy-evidence.json').read_text())
    ncbi={r['taxid']:r for r in ncbi_data['records']}

    def compatible(candidates,r):
        candidates=[s for s in candidates if s[2]==r['class']]
        if len(candidates)>1:
            family=[s for s in candidates if s[4]==r['family']]
            if family:candidates=family
        return candidates

    outcomes={}
    for r in records:
        name=r['name']; outcome={'status':'needs_review','reason':'No verified match to the supplied WoRMS species export','method':'not matched','evidence':[]}
        if re.search(r'\b(?:sp|cf|aff)\.',name):
            outcome.update(status='unidentified',reason='Source organism is not identified unambiguously to species; strain or clone labels are not species names')
            outcomes[r['accession']]=outcome;continue
        # Preserve full-name matches before considering subgenus formatting.
        candidates=compatible(exact[name.casefold()],r)
        method='exact accepted name';status='matched_exact'
        if not candidates:
            candidates=compatible(normalized[canonical(name)],r)
            method='subgenus notation normalized';status='matched_subgenus'
        if len(candidates)==1:
            s=candidates[0]
            # A different family is not grounds to discard an otherwise unique
            # species name, but require an independent WoRMS accepted-ID check.
            if s[4]!=r['family']:
                confirmed=[t for t in names.get(name,[]) if str(t.get('valid_AphiaID'))==s[0] and t.get('status')=='accepted']
                if not confirmed:
                    candidates=[]
                else:
                    status='matched_family_update';method='exact name; WoRMS accepted ID confirms different family';outcome['evidence']=[confirmed[0]['url']]
            if candidates:
                outcome.update(status=status,method=method,reason='Unique accepted species in the supplied export',species_id=s[0],accepted_id=s[0],accepted_name=s[1],accepted_rank='Species')
                if s[4]!=r['family']:outcome['reason']=f"Source family {r['family']} differs from WoRMS family {s[4]}; original label retained"
                outcomes[r['accession']]=outcome;continue

        # Exact API name results resolve synonyms and alternative representations.
        api=[t for t in names.get(name,[]) if t.get('phylum')=='Arthropoda' and t.get('class')==r['class'] and canonical(t['scientificname'])==canonical(name) and t.get('status')!='nomen nudum']
        alias=name.removesuffix(' (nom. nud.)')
        annotation=False
        if not api and alias!=name:
            api=[t for t in names.get(alias,[]) if t.get('status')=='accepted' and t.get('class')==r['class'] and canonical(t['scientificname'])==canonical(alias)]
            annotation=bool(api)
        evidence=[t['url'] for t in api]
        valid_ids={str(t['valid_AphiaID']) for t in api if t.get('valid_AphiaID')}
        api_method='WoRMS exact-name accepted-ID resolution'
        if not valid_ids:
            x=crossrefs.get(r['taxid'],{}); t=x.get('record')
            if t and t.get('phylum')=='Arthropoda' and t.get('class')==r['class']:
                api=[t];valid_ids={str(t['valid_AphiaID'])};evidence=[x['url'],t['url']];api_method='WoRMS NCBI-taxonomy cross-reference'
        if len(valid_ids)==1:
            target_id=next(iter(valid_ids));s=by_id.get(target_id)
            if s and s[2]==r['class']:
                method='accepted-name resolution after obsolete nomenclature annotation' if annotation else api_method
                outcome.update(status='matched_annotation_update' if annotation else 'matched_worms_synonym' if api_method.startswith('WoRMS exact') else 'matched_ncbi_crossref',
                    method=method,reason='WoRMS accepted AphiaID occurs in the supplied species export',species_id=s[0],accepted_id=s[0],accepted_name=s[1],accepted_rank='Species',evidence=evidence)
                outcomes[r['accession']]=outcome;continue
            target=targets.get(target_id)
            if target and target.get('status')=='accepted':
                outcome.update(status='outside_reference',reason=f"WoRMS resolves this name to an accepted {target['rank'].lower()} absent from the supplied species export",method=api_method,
                    accepted_id=target_id,accepted_name=target['scientificname'],accepted_rank=target['rank'],evidence=evidence+[target['url']])
                outcomes[r['accession']]=outcome;continue
            uncertain=[t for t in api if t.get('status') in ['taxon inquirendum','nomen dubium','nomen nudum']]
            if uncertain:
                t=uncertain[0];outcome.update(reason='WoRMS status is '+t['status']+'; no species roll-up assumed',method=api_method,evidence=evidence,accepted_id=str(t['AphiaID']),accepted_name=t['scientificname'],accepted_rank=t['rank'])
                outcomes[r['accession']]=outcome;continue

        # A confirmed NCBI subspecies may roll up to its recorded species ancestor
        # only when there is no conflicting WoRMS target and that species is in
        # the export and independently confirmed as accepted by WoRMS.
        n=ncbi.get(r['taxid'])
        if not valid_ids and n and n['rank']=='subspecies' and canonical(n['name'])==canonical(name):
            parents=[p for p in n['lineage'] if p['rank']=='species']
            if len(parents)==1:
                parent=parents[0];c=compatible(exact[parent['name'].casefold()],r)
                if len(c)==1 and any(str(t['valid_AphiaID'])==c[0][0] and t['status']=='accepted' for t in names.get(parent['name'],[])):
                    s=c[0];outcome.update(status='matched_subspecies_parent',method='NCBI subspecies lineage to WoRMS-confirmed accepted species',reason='Recorded NCBI species ancestor used, not a truncated name',species_id=s[0],accepted_id=s[0],accepted_name=s[1],accepted_rank='Species',evidence=[ncbi_data['url'],name_urls[parent['name']]])
                    outcomes[r['accession']]=outcome;continue
        if name=='Lepidurus couesii':outcome['reason']='Spelling differs from export name Lepidurus couessii; no authoritative equivalence or NCBI cross-reference verified'
        elif name=='Daphnia sinensis':outcome['reason']='Named NCBI species; no verified WoRMS species match in the export or exact-name/NCBI-cross-reference service results'
        if not outcome['evidence']:
            outcome['evidence']=[name_urls[name]] if name in name_urls else []
            x=crossrefs.get(r['taxid'])
            if x:outcome['evidence'].append(x['url'])
        outcomes[r['accession']]=outcome
    return outcomes
