# The Crustacean Genome Project

Website and Genome Explorer for CrustGP, a community effort with a goal of
sequencing genomes from 1,000 crustacean species.

The explorer provides taxonomic summaries, searchable NCBI assembly records,
CSV downloads, and side-by-side comparison of up to three records. Overview
charts link to the corresponding record searches. About includes background
on crustacean biology and links to the published scientific sources.

WoRMS exports provide accepted-species denominators for conservative coverage
summaries, order-to-family drill-down, and a paginated family/genus gap finder.
Species selections open their matched assembly records. GoaT links and a
log-scaled genome-size plot provide a separate view of genomic metadata.

## Preview

The release ZIP includes a prebuilt `dist/` folder. Open `dist/index.html`
in a browser to preview the site. The charts and data work offline; the
Google-hosted fonts require an internet connection, with local fallbacks.

`dist/` is generated and excluded from Git. GitHub Pages builds it from the
source files when changes reach `main`.

## Build and check

Python 3.10 or newer is required for the build. It uses the standard library
and requires no additional Python packages. Node 18 or newer runs the tests.

```sh
python3 scripts/build.py
python3 scripts/check_site.py
node --test tests/*.test.js
```

Open `dist/index.html` after building. The automated checks cover data
reconciliation, filtering, exports, comparison state, explorer navigation,
and local links. The DOM fixture tests do not replace visual browser checks.

## Project structure

| Location | Purpose |
| --- | --- |
| `src/pages/` | Page content and layout |
| `src/components/` | Shared navigation and footer |
| `src/styles/` | Brand styles and responsive layouts |
| `src/assets/` | Displayed logo and silhouette artwork |
| `src/js/` | Explorer logic and site interactions |
| `data/source/` | Assembly inventory, normalized WoRMS exports, GoaT snapshot and provenance |
| `scripts/` | Import, build, and link checks |
| `tests/` | Data and explorer-state tests |
| `.github/workflows/pages.yml` | Build and deployment workflow |
| `docs/GITHUB_DESKTOP.md` | Fresh-repository publishing instructions |

Edit the files under `src/`, not the generated `dist/` files. Shared brand
styles are in `src/styles/base.css`. Reading sizes and contrast adjustments
are in `src/styles/readability.css`.

## Data scope

The current snapshot contains 410 assembly records and 213 distinct NCBI
organism taxon IDs. It is based on the project's assembly metadata workbook;
its original filename and SHA-256 are recorded in `data/source/provenance.json`.
The workbook's original repository query and retrieval date were not recorded.
The website does not automatically retrieve new records from NCBI.

Input rows are retained, including paired GenBank/RefSeq records, alternative
assemblies, haplotypes, and unresolved names. Records are not counts of
independent biological genomes. Organism taxon IDs are not a verified count
of accepted species. Source taxonomic labels require reconciliation, and
short assemblies receive screening flags rather than a definitive scope
classification.

The Data & Methods page explains these definitions and the limits of the
coverage summaries. A zero-record comparison group means no matching record
in this input, not confirmed absence from all public repositories.

### WoRMS matching

The supplied October 21, 2026 exports contain 72,298 accepted species records
and 10,717 accepted genus records. Recent/fossil flags are incomplete, so these
are export totals rather than a verified census of living species. Original
XLSX files are not distributed; normalized taxonomic fields and source SHA-256
hashes are retained in `data/source/worms.json`.

`scripts/biodiversity.py` matches full names case-insensitively and requires an
exact family match and a unique candidate. It does not infer synonyms or trim
strain/subspecies names. Flagged records are excluded from coverage. Each
accepted AphiaID contributes once regardless of its number of assemblies.
The initial result is 154 species with eligible records; 272 assembly records
have a name match (including flagged records), and 138 remain unresolved.
The downloadable `dist/data/taxonomy-matches.csv` records every accession's
outcome. This lower-bound matching procedure does not establish assembly
completeness or a comprehensive inventory of sequenced crustaceans.

The genus headline uses the genus export. Family/genus gap groups are derived
from the species export, with lineage context retained to avoid merging
identical names. These two exports have different genus totals.

### GoaT snapshot

`data/source/goat.json` stores 262 species-rank taxa with direct `genome_size`
summary provenance, retrieved October 23, 2026. Eleven have unresolved names.
The query covers NCBI Pancrustacea and excludes every Hexapoda descendant.
No inferred summaries are plotted. Direct aggregation does not establish an
independent experimental measurement. Source methods are accessible through
each GoaT record. These taxa are independent of the assembly snapshot and do
not enter WoRMS coverage numerators. The chart uses genome size, not assembly
length. The saved query, index, retrieval date, and response hash are retained.

## Update the inventory

For a workbook with the same column names and first-sheet structure:

```sh
python3 scripts/import_xlsx.py /path/to/assembly-metadata.xlsx
python3 scripts/build.py
python3 scripts/check_site.py
node --test tests/*.test.js
```

Importing updates the CSV and provenance file without modifying the workbook.
Verify the new totals independently and update the snapshot reconciliation
assertions in the tests when the input changes. For direct CSV edits, retain
the column headers and document the source change in the provenance file.

## Refresh taxonomy or GoaT

```sh
python3 scripts/import_worms.py /path/to/species.xlsx /path/to/genera.xlsx
python3 scripts/refresh_goat.py
python3 scripts/build.py
python3 scripts/check_site.py
node --test tests/*.test.js
```

The importer currently expects the supplied WoRMS column names and first-sheet
layout. Update its snapshot date when using a new export. The GoaT refresh
requires internet access and deliberately refuses truncated API results.
Recheck totals, matching outcomes, and the scope notes on Data & Methods when
changing any input. Routine builds use the saved files and make no API calls.

## Publish

See [Publish with GitHub Desktop](docs/GITHUB_DESKTOP.md). The workflow
builds and deploys the site from `main` after GitHub Pages is configured to
use GitHub Actions.

## Attribution and contact

Assembly resources belong to the researchers and institutions identified in
their repository records. Inclusion does not imply that CrustGP generated
the assembly. Cite the original assembly, BioProject, and associated paper
when using a resource. Scientific background references are linked on About.

Taxonomy: [WoRMS Editorial Board, World Register of Marine Species](https://www.marinespecies.org/),
supplied export dated October 21, 2026. Genomic summaries:
[Challis et al. (2023), Genomes on a Tree](https://doi.org/10.12688/wellcomeopenres.18658.1).
The GoaT plot is drawn by CrustGP from exported summaries, rather than copied
from GoaT's interface. Follow linked GoaT records and cite underlying data
sources when reusing values.

Project contact: [crustaceangenomics@gmail.com](mailto:crustaceangenomics@gmail.com)
