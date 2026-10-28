# CasePilot

CasePilot is a Smart India Hackathon 2026 prototype for PS 26262: integrated AICTE approval workflow automation, compliance monitoring and alert management. This phase provides the foundation and operations shell. It has no marketing landing page or 3D content.

## Run locally

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm test
npm run lint
npm run build
```

## Included foundation

- Vite, React 18 and strict TypeScript, React Router, Zustand persistence, TanStack Table, date-fns, Zod, Tailwind CSS, Lucide and Vitest.
- Warm forest / cream design tokens, WCAG AA foreground and status combinations, Fraunces / Hanken Grotesk / JetBrains Mono typography and reusable interface primitives.
- Zod contracts for institutions, cases, routes, stages, officers, committees, documents, observations, undertakings, validity, alerts, escalation rules, audit events, rule versions and roles.
- Clearly marked illustrative seed data: 60 cases across eight regions, 15 institutions, 12 officers, five committees, 25 undertakings, 24 documents and 150 initial audit events.
- Pure routing, stage transition, SLA, escalation and compliance engines. Human decisions and evidence verification require named authorized actors and create audit events.
- REST-shaped mock API boundary, localStorage demo state, clock fast-forward and reset, role picker, case register, compliance watch, audit/alerts and engine console.

## Demo walkthrough

1. Start the app and choose a role on `/login`.
2. Use the role switcher to see role-specific navigation and actions.
3. Open **Engine console** as a Bureau Officer or Authority and advance the demo clock by 7 or 30 days.
4. Open **Audit & alerts** to inspect generated SLA, escalation and compliance output.
5. Open a case at the Authority Decision stage as Authority to record a named decision, or use Compliance Watch to record evidence verification as an authorized officer.

The persistent notice in the app states: “Alerts and recommendations support the approval process; they do not replace statutory scrutiny, verification, inspection or decisions by the competent authority.”
