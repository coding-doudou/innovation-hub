# Innovation Portfolio Hub

A React workspace for managing innovation initiatives, decisions, ownership, timing, and delivery risk.

## What is included

- Maersk-style blue theme
- Dashboard with portfolio metrics and charts
- Portfolio view for active priorities and near-term decisions
- Project workspace with filters and direct status update
- Project detail modal
- Add, edit, and delete projects
- Decision and action log
- Add, edit, and delete decisions
- Shared team backend on SharePoint Lists via Microsoft Graph, with Entra ID (Azure AD) sign-in
- Automatic localStorage fallback when no backend is configured (zero-setup dev)
- CSV export for projects
- JSON backup and restore for full workspace portability
- Improved small-screen navigation

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal, usually:

```bash
http://localhost:5173
```

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

This project is configured for GitHub Pages through GitHub Actions.

1. Create a GitHub repository.
2. Push this project to the `main` branch.
3. In the repository, open `Settings` -> `Pages`.
4. Set `Source` to `GitHub Actions`.
5. Push again if needed and wait for the `Deploy to GitHub Pages` workflow to finish.

Because `vite.config.js` uses `base: "./"`, the app works on a project Pages URL without extra path rewrites.

## Shared team backend

By default the app runs on browser local storage (single user, per browser). To put the whole team on one shared workspace, connect it to **SharePoint Lists** via Microsoft Graph with Entra ID sign-in. The app auto-detects the backend from environment variables and still deploys as a static site to GitHub Pages.

See **[SETUP.md](SETUP.md)** for the full checklist: SharePoint site + lists, Entra ID app registration, and the GitHub repository variables to set.

## Requirements

Node.js 20.19+ or 22.12+ (Vite 8). CI builds on Node 22.

## Notes

Use the Settings page to export a JSON backup or CSV. On the shared SharePoint backend, bulk import and reset are disabled in the UI to protect team data; manage bulk changes directly in SharePoint.
