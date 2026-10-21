"""Check generated links, source identifiers, and deployment portability."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import csv, json, re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.ids=set()
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'): self.ids.add(attrs['id'])
        for key in ['href','src']:
            if attrs.get(key): self.links.append(attrs[key])
pages={}
for page in OUT.glob('*.html'):
    parser=Links();parser.feed(page.read_text());pages[page]=parser
errors=[]
for page,parser in pages.items():
    for link in parser.links:
        url=urlsplit(link)
        if url.scheme or url.netloc: continue
        if url.path.startswith('/'): errors.append(f'{page.name}: root-relative link {link}');continue
        dest=page.parent/unquote(url.path) if url.path else page
        if not dest.exists(): errors.append(f'{page.name}: missing {link}')
        elif url.fragment and dest in pages and url.fragment not in pages[dest].ids: errors.append(f'{page.name}: missing anchor {link}')
    if '{{' in page.read_text(): errors.append(f'{page.name}: unresolved template')
    if re.search('Crustacean Genomes Project',page.read_text(),re.I): errors.append(f'{page.name}: old project name')
rows=json.loads((OUT/'data/assemblies.json').read_text())
assert len(rows)==len(list(csv.DictReader((ROOT/'data/source/assemblies.csv').open())))
assert len({r['accession'] for r in rows})==len(rows), 'Duplicate accessions need review'
assert all(re.fullmatch(r'GC[AF]_\d+\.\d+',r['accession']) for r in rows), 'Invalid accession'
assert all(r['taxid'].isdigit() for r in rows), 'Invalid taxon ID'
assert all(r['length'] is None or r['length']>0 for r in rows), 'Invalid assembly length'
if errors: raise SystemExit('\n'.join(errors))
print(f'Checked {len(pages)} pages, all local links/anchors, and {len(rows)} records. No errors.')
