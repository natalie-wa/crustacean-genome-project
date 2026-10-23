# Taxonomic reconciliation of the assembly snapshot

Reviewed October 23, 2026 against the supplied WoRMS exports dated October 21,
2026, with dated WoRMS REST responses and targeted NCBI taxonomy records.

## Corrected results

| Outcome | Assembly records | Source organism names |
| --- | ---: | ---: |
| Mapped to an accepted species in the supplied export | 350 | 188 |
| Source organism not identified unambiguously to species | 26 | 15 |
| Resolved in WoRMS, but accepted target absent from species export | 15 | 7 |
| Reference match still requires review | 19 | 3 |
| Total | 410 | 213 |

The 350 mapped records resolve to 188 accepted species IDs. Four of these
species have only flagged assemblies, leaving **184 accepted species with
eligible records**, across **80 named families**. The corresponding matched
share of the 72,298-record species export is approximately **0.25%**. This is
not an estimate of the global proportion of crustaceans sequenced.

The first exact-name/family pass missed straightforward naming differences.
The corrected reconciliation adds 78 mapped assembly records and increases
eligible matched species from 154 to 184. Original assembly names and taxonomy
labels remain unchanged in the source inventory.

## Additional records reconciled

| Evidence or normalization | Additional assembly records |
| --- | ---: |
| Unique parenthesized-subgenus normalization | 63 |
| Exact species identity with a WoRMS-confirmed family classification change | 9 |
| Exact-name WoRMS synonym or spelling correction | 3 |
| Explicit WoRMS NCBI-taxonomy cross-reference | 1 |
| Documented NCBI subspecies ancestry to a WoRMS-confirmed species | 1 |
| Removal of obsolete nomenclature annotation, confirmed by WoRMS | 1 |
| Total | 78 |

Examples include *Penaeus vannamei* to *Penaeus (Litopenaeus) vannamei*,
*Idotea baltica* to *Idotea balthica*, and *Liocarcinus depurator* to
*Polybius depurator*. Family disagreements are retained in the accession audit.

The two *Lepidurus apus* trinomials illustrate why names cannot simply be
shortened. The recorded NCBI ancestry supports *L. apus apus* contributing to
*L. apus*. In contrast, the explicit WoRMS NCBI cross-reference places the source
*L. apus lubbocki* at accepted species *L. lubbocki*. The latter is not assigned
to *L. apus*.

## Three organism names still needing a verified reference match

| Source name | Records | Finding and treatment |
| --- | ---: | --- |
| *Daphnia sinensis* | 17 | NCBI lists a named species, but no verified WoRMS species match was obtained from the export, exact-name service or NCBI cross-reference. Retained in Browse Records; excluded from reference-based coverage. |
| *Lepidurus couesii* | 1 | The export contains *Lepidurus couessii*. Spelling similarity alone does not establish equivalence; no authoritative equivalence or NCBI cross-reference was verified. Excluded from coverage pending review. |
| *Triops simplex* | 1 | WoRMS' NCBI cross-reference leads to *Triops cancriformis simplex*, with status “taxon inquirendum.” No species-parent assignment is forced. Excluded from coverage. |

These 19 records do not represent 19 questionable species or 19 independently
sequenced genomes. Seventeen are repeated records for one named NCBI taxon.

## WoRMS-resolved targets outside the supplied species export

| Source name | Records | WoRMS accepted target rank |
| --- | ---: | --- |
| *Armadillidium nasatum* | 1 | Subspecies |
| *Asellus aquaticus* | 2 | Subspecies |
| *Eurytemora affinis* | 1 | Subspecies |
| *Haplophthalmus danicus* | 1 | Subspecies |
| *Lepeophtheirus salmonis* | 7 | Subspecies |
| *Notodromas monacha* | 1 | Species |
| *Trichoniscus matulici* | 2 | Subspecies |

The six subspecies targets are accepted nominate subspecies. Their accepted
IDs do not occur in the supplied accepted-species export. *Notodromas monacha*
is accepted by the live WoRMS API but its ID is also absent from that export.
These are reference-scope/rank issues, not failed identification of the genomes.
They are not silently added to a frozen denominator or treated as accepted
species rows that are not present in the reference.

## Rules and evidence

- Preserve full scientific-name matches before normalizing subgenus notation.
- Require a unique candidate and higher-class agreement. Where necessary,
  family information disambiguates candidates.
- Require accepted-ID evidence for a different family classification.
- Resolve synonyms through exact-name WoRMS results or explicit NCBI
  cross-references. Do not accept fuzzy spelling suggestions automatically.
- Use recorded lineage evidence for subspecies roll-ups and respect conflicting
  or uncertain WoRMS statuses.
- Count only accepted species IDs present in the supplied reference export.
- Exclude every assembly carrying a source review flag from coverage.
- Count each eligible accepted species once, regardless of assembly multiplicity.

All 410 accessions have an outcome in `dist/data/taxonomy-matches.csv`, including
original names, original and reference families, resolved IDs/ranks, matching
methods, coverage eligibility, assembly review flags, and evidence URLs.
`dist/data/taxonomy-summary.json` reconciles record and source-name totals.
Evidence response files are saved under `data/source/*evidence.json` and copied
to `dist/data/taxonomy-evidence/`. Their hashes appear in
`dist/data/biodiversity-provenance.json`.

This review does not validate assembly completeness, nuclear versus organellar
scope beyond the existing screening flags, accepted-species census completeness,
or the currency of the assembly inventory. The public gap labels therefore
continue to say “no matched record in this snapshot.”

## Sources

- WoRMS Editorial Board. World Register of Marine Species.
  https://www.marinespecies.org/
- WoRMS REST webservice, exact-name accepted-ID resolution, accepted records,
  and NCBI external identifiers. https://www.marinespecies.org/rest/
- NCBI Taxonomy, targeted subspecies/species lineage records via E-utilities.
  https://www.ncbi.nlm.nih.gov/taxonomy

## Verification

Build and local-link checks, explorer interaction tests, and 12 focused taxonomy
tests cover subgenus notation, accepted-ID spelling corrections, classification
changes, competing subspecies treatments, uncertain taxa, outside-reference
targets, unidentified names, stale annotations, and ambiguous candidates.
