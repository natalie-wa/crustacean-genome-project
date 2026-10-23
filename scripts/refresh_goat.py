"""Refresh direct species-level genome-size summaries from the public GoaT API."""
import json, urllib.request, urllib.parse, datetime, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QUERY='tax_tree(197562) AND tax_rank(species) AND genome_size>0'
URL='https://goat.genomehubs.org/api/v2/search?'+urllib.parse.urlencode(dict(query=QUERY,result='taxon',fields='genome_size',size=2000,includeEstimates='false',taxonomy='ncbi'))

def prepare(raw):
    data=json.loads(raw)
    assert data['status']['success'], data['status']
    assert data['status']['hits']==len(data['results']), 'Incomplete response; implement pagination before updating'
    rows=[]
    for item in data['results']:
        r=item['result']; lineage=r['lineage']; field=r['fields']['genome_size']
        if any(n['scientific_name']=='Hexapoda' for n in lineage): continue
        source=field.get('aggregation_source')
        if source!='direct' and source!=['direct']: continue
        assert r['taxon_rank']=='species' and field['value']>0
        rows.append({'taxid':r['taxon_id'],'name':r['scientific_name'],
            'class':next((n['scientific_name'] for n in lineage if n['taxon_rank']=='class'),''),
            'family':next((n['scientific_name'] for n in lineage if n['taxon_rank']=='family'),''),
            'bp':field['value'],'min':field.get('min'),'max':field.get('max'),
            'method':field.get('aggregation_method'),'count':field.get('count'),'source':'direct'})
    assert rows and len({r['taxid'] for r in rows})==len(rows)
    return {'date':datetime.date.today().isoformat(),'url':URL,'query':QUERY,
        'index':sorted({r['index'] for r in data['results']}),
        'response_sha256':hashlib.sha256(raw).hexdigest(),
        'scope':'Species with a direct genome_size summary in NCBI Pancrustacea, excluding every Hexapoda descendant. Not restricted to species in the CrustGP assembly snapshot. Direct describes GoaT aggregation provenance, not independent experimental validation.',
        'rows':rows}

if __name__=='__main__':
    import sys
    raw=Path(sys.argv[1]).read_bytes() if len(sys.argv)>1 else urllib.request.urlopen(URL,timeout=90).read()
    result=prepare(raw)
    (ROOT/'data/source/goat.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    print('Saved',len(result['rows']),'direct genome-size summaries')
