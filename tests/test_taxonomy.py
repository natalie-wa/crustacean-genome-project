"""Scientific matching rules, checked against the saved evidence snapshot."""
import unittest, sys, csv, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from taxonomy import reconcile, canonical

class TaxonomyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.species=json.loads((ROOT/'data/source/worms.json').read_text())['species']
        cls.records=[{'accession':r['Assembly accession'],'name':r['Organism name'],'taxid':r['NCBI taxon ID'],'class':r['Class'],'family':r['Family']} for r in csv.DictReader((ROOT/'data/source/assemblies.csv').open())]
        cls.outcomes=reconcile(ROOT,cls.species,cls.records)

    def result(self,name):
        r=next(r for r in self.records if r['name']==name)
        return self.outcomes[r['accession']]

    def test_subgenus_notation(self):
        r=self.result('Penaeus vannamei')
        self.assertEqual((r['status'],r['species_id']),('matched_subgenus','1809212'))

    def test_recorded_spelling_correction(self):
        r=self.result('Idotea baltica')
        self.assertEqual((r['status'],r['species_id']),('matched_worms_synonym','119039'))
        self.assertTrue(r['evidence'])

    def test_confirmed_family_change(self):
        r=self.result('Cardisoma carnifex')
        self.assertEqual(r['status'],'matched_family_update')
        self.assertIn('Cardisomatidae',r['reason'])

    def test_crossref_takes_priority_over_old_subspecies_parent(self):
        r=self.result('Lepidurus apus lubbocki')
        self.assertEqual((r['status'],r['species_id']),('matched_ncbi_crossref','1561257'))
        self.assertNotEqual(r['species_id'],'1561151')

    def test_subspecies_requires_recorded_lineage(self):
        r=self.result('Lepidurus apus apus')
        self.assertEqual((r['status'],r['species_id']),('matched_subspecies_parent','1561151'))
        self.assertEqual(len(r['evidence']),2)

    def test_uncertain_taxon_not_forced_to_parent(self):
        r=self.result('Triops simplex')
        self.assertEqual(r['status'],'needs_review')
        self.assertIn('taxon inquirendum',r['reason'])
        self.assertNotIn('species_id',r)

    def test_accepted_subspecies_outside_export(self):
        r=self.result('Lepeophtheirus salmonis')
        self.assertEqual((r['status'],r['accepted_rank']),('outside_reference','Subspecies'))
        self.assertNotIn('species_id',r)

    def test_unidentified_source_names_not_inferred(self):
        r=self.result('Temoridae sp.')
        self.assertEqual(r['status'],'unidentified')
        self.assertNotIn('species_id',r)

    def test_near_spelling_is_not_sufficient(self):
        r=self.result('Lepidurus couesii')
        self.assertEqual(r['status'],'needs_review')
        self.assertNotIn('species_id',r)

    def test_named_ncbi_species_without_worms_evidence(self):
        r=self.result('Daphnia sinensis')
        self.assertEqual(r['status'],'needs_review')
        self.assertNotIn('species_id',r)

    def test_obsolete_annotation_is_audited(self):
        r=self.result('Eurytemora gulfia (nom. nud.)')
        self.assertEqual((r['status'],r['species_id']),('matched_annotation_update','1863549'))

    def test_duplicate_candidates_are_not_arbitrarily_selected(self):
        species=[['1','Testus exampleus','Malacostraca','Decapoda','Testidae','Testus',''],['2','Testus exampleus','Malacostraca','Decapoda','Testidae','Testus','']]
        row={'name':'Testus exampleus','class':'Malacostraca','family':'Testidae','taxid':'0','accession':'test'}
        self.assertEqual(reconcile(ROOT,species,[row])['test']['status'],'needs_review')

if __name__=='__main__':unittest.main()
