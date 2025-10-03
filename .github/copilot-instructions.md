<!-- Workspace-specific guidance for AI coding agents. See https://aka.ms/vscode-instructions-docs -->

# GSE Student Registration – Copilot Instructions

This is a NestJS app for student registration with MongoDB (Mongoose) and Gmail SMTP for OTP emails. Flow: matric number entry → name confirmation → details (dept/faculty/phone/email) → OTP verification (email) → skill selection.

## Quick start
- Env: create `.env` with MONGODB_URI, GMAIL_USER, GMAIL_PASS, optional PORT.
- Dev: `npm run start:dev` (task "Start NestJS App" exists) – serves static UI from `src/public/index.html` and API under `/student`.
- Tests: `npm run test`, e2e `npm run test:e2e`.

## Core architecture
- `src/main.ts`: NestExpress app; serves `src/public` as static; logs each API request and JSON body.
- `src/app.module.ts`: ConfigModule (global), Mongoose connection via `MONGODB_URI`, models registered via `MongooseModule.forFeature`.
- Data models:
	- `Student` (`src/student.schema.ts`): matricNumber (unique), name, department, faculty, phone, email (unique sparse), isEmailVerified, skills[], otp, otpExpires, firstname/lastname, course_code.
	- `Skill` (`src/skill.schema.ts`): code (unique), description, trainer, phone, maxSelection (default 144), selectedCount.
- Business logic in `src/student.service.ts`; HTTP endpoints in `src/student.controller.ts`.

## API used by the static UI (`src/public/index.html`)
- POST `/student/matric` { matricNumber } → returns student fields if found and not yet registered; otherwise `{ error }`. Does NOT create records here.
- POST `/student/confirm` { matricNumber, name } → upserts student name.
- POST `/student/details` { matricNumber, department, faculty, phone, email } → upserts details, sends OTP email if not yet verified; if already verified returns `{ error: 'Email already verified. No OTP sent.' }`.
- POST `/student/verify-otp` { email, otp } → `{ verified: boolean }`. OTP and later steps always use email as identifier.
- GET `/student/skills` → `{ skills: Skill[] }` sorted by description.
- POST `/student/skills` { email, skills: string[] } → `{ success | error }`. Enforces: no reselection once set; checks and enforces `maxSelection` by incrementing `selectedCount`.

## Email/OTP
- Email is the single source of truth for OTP and skill assignment. Use email to look up/update OTP and skills; do not use matric for these steps.
- OTP is 6 digits (`crypto.randomInt`), expires in 10 minutes; stored in Student. Verification sets `isEmailVerified = true` and clears OTP.
- SMTP via `nodemailer` with Gmail: `GMAIL_USER`/`GMAIL_PASS` (App Password recommended).

## Seeding and data sources
- Students: `data-seeder/seed-students.ts` reads Excel (path passed as arg) and upserts students by `matricNumber`.
- Skills: `data-seeder/seed-skills.ts` reads `datas/GSE 301 SKILL LIST.xlsx` by default and upserts skills by `code`.
- Run with ts-node, for example on Windows PowerShell:
	- `npx ts-node data-seeder/seed-students.ts .\datas\gse202_assessment_score.xlsx`
	- `npx ts-node data-seeder/seed-skills.ts`

## Conventions and gotchas
- Do not auto-create Student on `/student/matric`; records should come from seeding/imports first.
- Enforce unique email across students; controller checks duplicate email and rejects cross-matric reuse.
- After email verification, `/student/details` returns a specific error string used by the UI to skip OTP and show skills.
- When adding features, keep using email as the identifier post-OTP; update both controller and `index.html` fetch calls together.
- Static UI is a single HTML file – no framework build. Keep API contract stable or edit `src/public/index.html` accordingly.

## File map (start here)
- API: `src/student.controller.ts`, `src/student.service.ts`
- Models: `src/student.schema.ts`, `src/skill.schema.ts`
- App setup: `src/app.module.ts`, `src/main.ts`
- UI: `src/public/index.html`
- Seeders: `data-seeder/seed-*.ts`
