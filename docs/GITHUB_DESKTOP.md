# Publish a fresh repository with GitHub Desktop

Suggested repository name: `crustacean-genome-project`.

This uses the singular name and a different address from the archived
`crustacean-genomes-project` repository. Archiving does not free the old
repository name. These instructions create a new repository rather than
modifying the archive.

## Create the repository

1. Unzip the release package and keep the extracted folder available.
2. In GitHub Desktop, select **File → New Repository**.
3. Enter `crustacean-genome-project` as the name.
4. Use this description if helpful: `The Crustacean Genome Project website and interactive explorer of crustacean genome resources.`
5. Choose a local parent folder, such as `Documents/GitHub`.
6. Leave **Initialize this repository with a README** unchecked. Leave the
   Git ignore and license choices at **None**, since the package already
   supplies the ignore rules and README.
7. Select **Create Repository**, then **Repository → Show in Finder**.
8. Copy the **contents** of the extracted `crustacean-genome-project` folder
   into this new repository folder. Do not copy the enclosing folder itself.
9. Press **Command + Shift + .** in Finder to show hidden files. Include
   `.github` and `.gitignore`. Keep the new repository's `.git` folder.
10. Confirm that `src`, `data`, `scripts`, `tests`, `docs`, `README.md`,
    `package.json`, and `.github` are directly inside the repository folder.

The `dist` folder can be copied for preview but is ignored by Git. The build
workflow recreates it during publication.

## Commit and publish

1. Return to GitHub Desktop and review **Changes**. The preview folder should
   not appear among tracked changes because it is ignored.
2. Make sure the current branch is named `main`. If it has a different name,
   rename the branch to `main` using the Branch menu before publishing.
3. Enter `Add CrustGP website and Genome Explorer` as the commit summary.
4. Select **Commit to main**.
5. Select **Publish repository**. Confirm the repository name and your account.
6. For a public repository, uncheck **Keep this code private**, then select
   **Publish Repository**.

## Enable the website

1. Open the new repository on GitHub.
2. Select **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions**, select **Build and deploy GitHub Pages**, and choose
   **Run workflow → main → Run workflow**. This also retries publication if
   the initial push happened before Pages was enabled.
5. Wait for the build and deploy jobs to succeed. Follow the published URL
   shown by the deployment.

For the suggested name under `natalie-wa`, the expected address is:

`https://natalie-wa.github.io/crustacean-genome-project/`

If you choose a different repository name, update the GitHub link in
`src/components/footer.html`. The website uses relative paths, so it does
not require a repository-specific base path for its pages or data.

Before sharing, check the homepage, mobile menu, explorer tabs, chart
navigation, a record link, comparison, and CSV download in your browser.

## Future changes

Edit source files, commit, and push to `main`. The workflow checks the project,
builds the website, and deploys the update. The Actions tab shows any errors.

## GitHub documentation

- [Create a repository with GitHub Desktop](https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop)
- [Publish a local repository](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)
- [Configure GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
