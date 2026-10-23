# Update the existing website

This package updates the existing CrustGP repository. Do not create another
repository or change your GitHub Pages settings.

## Preview first

Unzip the package and open `dist/explorer.html` in a browser. The preview uses
the same saved data as the GitHub Pages build. External WoRMS and GoaT links
require internet access.

## Copy the source

1. Open the existing `crustacean-genome-project` repository in GitHub Desktop.
2. Fetch origin and pull any available changes before copying files.
3. Choose **Repository → Show in Finder**.
4. Copy the package's `src`, `data`, `scripts`, `tests`, and `docs` folders and
   `README.md` into that repository folder. These are complete source folders;
   replace the corresponding folders/files after keeping a backup of any
   uncommitted local edits. Keep the repository's `.git` directory and existing
   `.github` workflow. The generated `dist` folder is only needed for preview.
5. In GitHub Desktop, review the changed files and commit with the message
   `Reconcile WoRMS names and correct coverage summaries`.
6. Click **Push origin** and wait for the Pages workflow to finish.

The public website updates at its existing URL after deployment. No domain,
hosting, or repository changes are required.

## Added features

- Paired diversity/representation chart, family reach figure and GoaT plot.
- Largest-gap figure with links to species exploration.
- Searchable order-to-family coverage cards and family/genus gap search.
- Paginated species dialog with matched-assembly navigation.
- Expandable assembly summaries to keep Overview focused.
- Expandable WoRMS and GoaT links in assembly records.
- Dated source snapshots, matching audit, plotted-data CSV, and methods.
- Corrected accepted-name matching and separate unidentified, outside-reference,
  and reference-review categories. See TAXONOMY_RECONCILIATION.md.

Sources and numeric limitations are explained on Data & Methods. The assembly
inventory remains the original snapshot; the new matching does not establish
a complete inventory of all public crustacean genomes.
