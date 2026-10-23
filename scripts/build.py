"""Build a portable GitHub Pages site using only the Python standard library."""
from pathlib import Path
import csv, json, shutil, re
from biodiversity import prepare
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'

def build():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    for folder in ['assets', 'styles', 'js']:
        shutil.copytree(ROOT / 'src' / folder, OUT / folder)
    rows = list(csv.DictReader((ROOT / 'data/source/assemblies.csv').open()))
    fields = {'Class':'class','Order':'order','Family':'family','Organism name':'name','NCBI taxon ID':'taxid','Assembly accession':'accession','Assembly level':'level','Assembly length (bp)':'length','Scaffold N50 (bp)':'n50','Contig N50 (bp)':'contigN50','GC (%)':'gc','NCBI BUSCO complete':'busco','BUSCO lineage':'buscoLineage','BioProject':'bioproject','Submitter':'submitter','Review status':'review'}
    records = [{v:r[k].strip() for k,v in fields.items()} for r in rows]
    for r in records:
        for k in ['length','n50','contigN50']: r[k] = int(float(r[k])) if r[k] else None
        for k in ['gc','busco']: r[k] = float(r[k]) if r[k] else None
    (OUT/'data').mkdir()
    taxonomy_summary=prepare(ROOT, OUT, records)
    (OUT/'data/assemblies.json').write_text(json.dumps(records, ensure_ascii=False))
    (OUT/'data/assemblies.js').write_text('window.CRUSTGP_RECORDS = '+json.dumps(records,ensure_ascii=False)+';\n')
    shutil.copy(ROOT/'data/source/assemblies.csv', OUT/'data/assemblies.csv')
    shutil.copy(ROOT/'data/source/provenance.json', OUT/'data/provenance.json')
    # These two modules have no dependencies. Emit a classic browser script so
    # the packaged dist folder can also be opened directly without a web server.
    model=(ROOT/'src/js/data-model.js').read_text().replace('export ', '')
    explorer=(ROOT/'src/js/explorer.js').read_text().split('\n',1)[1]
    (OUT/'js/explorer.bundle.js').write_text('(async () => {\n'+model+'\n'+explorer+'\n})();\n')
    for page in (ROOT/'src/pages').glob('*.html'):
        html = page.read_text()
        html=html.replace('{{matched_species}}',str(taxonomy_summary['eligibleSpecies'])).replace('{{families_reached}}',str(taxonomy_summary['eligibleFamilies']))
        for component in ['nav','footer']:
            html=html.replace('{{'+component+'}}',(ROOT/f'src/components/{component}.html').read_text())
        (OUT/page.name).write_text(html)
    (OUT/'.nojekyll').touch()
    print(f'Built {len(list(OUT.glob("*.html")))} pages and {len(records)} source records in {OUT}')

if __name__ == '__main__': build()
