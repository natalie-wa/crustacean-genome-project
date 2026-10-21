# The Crustacean Genome Project

Website and Genome Explorer for CrustGP, a community effort with a goal of
sequencing genomes from 1,000 crustacean species.

The explorer provides taxonomic summaries, searchable NCBI assembly records,
CSV downloads, and side-by-side comparison of up to three records. Overview
charts link to the corresponding record searches. About includes background
on crustacean biology and links to the published scientific sources.

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
| `data/source/` | Assembly inventory and provenance |
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

## Publish

See [Publish with GitHub Desktop](docs/GITHUB_DESKTOP.md). The workflow
builds and deploys the site from `main` after GitHub Pages is configured to
use GitHub Actions.

## Attribution and contact

Assembly resources belong to the researchers and institutions identified in
their repository records. Inclusion does not imply that CrustGP generated
the assembly. Cite the original assembly, BioProject, and associated paper
when using a resource. Scientific background references are linked on About.

Project contact: [crustaceangenomics@gmail.com](mailto:crustaceangenomics@gmail.com)
