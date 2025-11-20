# Contributing

Thanks for helping improve the Creative Growth Accessibility Report project!

## Prerequisites

- Node.js 18+ installed
- npm (bundled with Node)

## Setup

- Install dependencies: `npm ci`
- Useful scripts:
  - `npm run typecheck` — TypeScript type checking
  - `npm run lint` — ESLint on TS/JS files
  - `npm run format` — Format with Prettier
  - `npm run format:check` — Check formatting

## Branch & PR Flow

- Create a feature branch from `main`: `git checkout -b feature/<short-name>`
- Keep PRs focused and small; link to the relevant issue and milestone.
- Ensure CI passes (lint + typecheck) before requesting review.

## Commit Style

- Use clear, descriptive messages. Example:
  - `scanner: add axe-core integration`
  - `web: scaffold Next.js app`
  - `docs: update README with usage`

## Code Style

- TypeScript strict mode is enabled. Prefer explicit types for public APIs.
- Run `npm run lint` and `npm run format` before opening a PR.

## Reporting Issues

- Use the provided issue templates (Bug, Feature, Task).
- Include context, steps to reproduce (if applicable), and acceptance criteria.

## Security & Accessibility

- Do not include sensitive tokens/keys in commits.
- The report UI itself should meet basic accessibility standards (keyboard, landmarks, color contrast).

