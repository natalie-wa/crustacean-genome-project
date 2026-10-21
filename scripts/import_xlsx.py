"""Import the NCBI workbook without changing the original workbook.

Usage: python3 scripts/import_xlsx.py path/to/workbook.xlsx
Standard library only. Retains rows; flags are screening aids, not exclusions.
"""
import csv, hashlib, json, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
NS = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
MAPPING = {'Class':'Class','Order':'Order','Suborder/Infraorder':'Suborder / infraorder','Family':'Family','Organism Name':'Organism name','Organism Taxonomic ID':'NCBI taxon ID','Assembly Accession':'Assembly accession','Assembly Level':'Assembly level','Assembly Stats Contig N50':'Contig N50 (bp)','Assembly Stats Scaffold N50':'Scaffold N50 (bp)','Assembly Stats Total Sequence Length':'Assembly length (bp)','Assembly Stats GC Percent':'GC (%)','Annotation BUSCO Complete':'NCBI BUSCO complete','Annotation BUSCO Lineage':'BUSCO lineage','Assembly Submitter':'Submitter','Assembly BioProject Accession':'BioProject','WGS project accession':'WGS project'}

def load(path):
    with zipfile.ZipFile(path) as z:
        strings = [''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)] if 'xl/sharedStrings.xml' in z.namelist() else []
        sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        matrix=[]
        for row in sheet.findall('s:sheetData/s:row',NS):
            cells={}
            for cell in row:
                col=re.match('[A-Z]+',cell.get('r')).group()
                v=cell.find('s:v',NS)
                value=v.text if v is not None else ''
                if cell.get('t')=='s': value=strings[int(value)]
                elif cell.get('t')=='inlineStr': value=''.join(cell.find('s:is',NS).itertext())
                cells[col]=value.strip()
            matrix.append((int(row.get('r')),cells))
        header=matrix[0][1]
        missing=set(MAPPING)-set(header.values())
        if missing: raise ValueError(f'Missing columns: {sorted(missing)}')
        result=[]
        for rowno,cells in matrix[1:]:
            raw={header[k]:v for k,v in cells.items() if k in header}
            if not raw.get('Assembly Accession'): continue
            row={v:raw.get(k,'') for k,v in MAPPING.items()}
            row['Source row']=rowno
            length=int(float(row['Assembly length (bp)'])) if row['Assembly length (bp)'] else 0
            row['Length <100 kb flag']=str(0 < length < 100000)
            reasons=[]
            if 0 < length < 100000: reasons.append('VERIFY ORGANELLAR / INCOMPLETE')
            if re.search(r'\b(sp\.|cf\.|aff\.)',row['Organism name']): reasons.append('UNRESOLVED TAXON')
            row['Review status']='; '.join(reasons)
            result.append(row)
    return result

if __name__=='__main__':
    path=Path(sys.argv[1])
    rows=load(path)
    output=ROOT/'data/source/assemblies.csv'
    with output.open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['Source row']+list(MAPPING.values())+['Length <100 kb flag','Review status'])
        writer.writeheader(); writer.writerows(rows)
    provenance={'source_file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'records':len(rows),'source_retrieval_date':None,'source_note':'User-supplied NCBI assembly workbook. Original retrieval date and query are not recorded in this file. This is a frozen input, not a live NCBI census.','review_status':'Provisional; nuclear scope, taxonomic ranks, synonyms, paired accessions and haplotypes require curation.'}
    (ROOT/'data/source/provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
    print(f'Imported {len(rows)} records from {path.name}')
