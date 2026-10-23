"""Import supplied WoRMS XLSX exports without third-party dependencies.

Usage: python3 scripts/import_worms.py species.xlsx genera.xlsx
Raw exports remain private; normalized fields and source hashes are published.
"""
import sys, zipfile, xml.etree.ElementTree as ET, json, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

def read(path):
    with zipfile.ZipFile(path) as z:
        strings = [''.join(s.itertext()) for s in ET.fromstring(z.read('xl/sharedStrings.xml'))]
        header = None
        for _, row in ET.iterparse(z.open('xl/worksheets/sheet1.xml'), events=['end']):
            if row.tag != NS+'row': continue
            values = {}
            for cell in row:
                key = ''.join(c for c in cell.get('r') if c.isalpha())
                value = cell.find(NS+'v')
                text = value.text if value is not None else ''
                if cell.get('t') == 's': text = strings[int(text)]
                values[key] = '' if text == 'NULL' else text
            if header is None: header = values
            else: yield {header[k]: v for k, v in values.items()}
            row.clear()

def main(species_path, genera_path):
    sources = []
    tables = {}
    fields = ['AphiaID','ScientificName','Class','Order','Family','Genus','Recent/Fossil']
    for kind, path, rank in [('species',species_path,'Species'),('genera',genera_path,'Genus')]:
        rows = list(read(path))
        assert all(r['Status']=='accepted' and r['RankName']==rank for r in rows)
        assert len({r['AphiaID'] for r in rows}) == len(rows)
        tables[kind] = [[r.get(k,'') for k in fields] for r in rows]
        sources.append({'file':Path(path).name,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'records':len(rows)})
    result = {'date':'2026-10-21','fields':fields,**tables,'sources':sources,
              'scope':'Accepted records in supplied WoRMS exports. Recent/fossil flags are incomplete; not asserted to be a verified extant-species census.'}
    (ROOT/'data/source/worms.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    print('Imported', {k:len(v) for k,v in tables.items()})

if __name__=='__main__': main(*sys.argv[1:])
