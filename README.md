# Main

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deployment (GitHub Pages)

This repo is set up to deploy to GitHub Pages using GitHub Actions.

### Current approach (recommended): Pages via Actions artifact

Workflow: `.github/workflows/deploy-ghpages.yml`

**How it works**

- Builds the Angular app for production.
- Writes `dist/main/browser/CNAME` from the repo variable `PAGES_CNAME`.
- Uploads the build output as a Pages artifact (`actions/upload-pages-artifact`).
- Deploys it to Pages (`actions/deploy-pages`).

**Repository variables** (Settings → Secrets and variables → Actions → Variables)

| Variable | Required | Example | Meaning |
|---|---:|---|---|
| `API_URL` | yes | `https://api.example.com` | Injected into `src/environments/environment.prod.ts` before building |
| `PAGES_CNAME` | yes | `adnak.app` | Custom domain for Pages; used to generate `CNAME` |
| `PAGES_URL` | no | `https://adnak.app/` | If set, shown as the environment URL in the Actions UI |
| `PAGES_DEPLOY_BRANCH` | no | `main` or `master` | Which branch is allowed to run the **deploy** job (defaults to the repository default branch) |

**GitHub settings required**

1. Settings → Pages → **Build and deployment** → Source: **GitHub Actions**
2. Settings → Environments → `github-pages`
	 - If you use environment protection rules: allow deployments from the branch you expect (`PAGES_DEPLOY_BRANCH`).

**Where to find the deployed URL**

- Open the workflow run → the `deploy` job card shows a clickable URL.
- If you set `PAGES_URL`, that exact link will be shown.
- Otherwise, the link comes from `actions/deploy-pages` output (`page_url`).

### Legacy approach (rollback): deploy by pushing to the `gh-pages` branch

This is the classic way to deploy Pages:

1. Build the app.
2. Push the build output to the `gh-pages` branch (e.g. via `angular-cli-ghpages`).
3. GitHub Pages publishes from the `gh-pages` branch.

**Rollback steps**

1. Update `.github/workflows/deploy-ghpages.yml`:
	 - Remove `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`.
	 - Add a deploy step like:

		 ```bash
		 npx angular-cli-ghpages --dir=dist/main/browser --cname "$PAGES_CNAME" --no-silent
		 ```

	 - Adjust workflow permissions back to:

		 ```yaml
		 permissions:
			 contents: write
		 ```

2. GitHub Settings → Pages:
	 - Switch Source to **Deploy from a branch** and select `gh-pages`.

**Notes**

- With the legacy approach, you may still see a system workflow named `pages-build-deployment` if Pages is publishing from a branch.
- If you keep the `github-pages` environment with protection rules, make sure the chosen branch is allowed to deploy.