<!-- Workspace-specific guidance for AI coding agents. See https://aka.ms/vscode-instructions-docs -->

# GSE Student Registration – Copilot Instructions

This is a NestJS app for student registration with MongoDB (Mongoose) and Gmail SMTP for OTP emails. Flow: matric number entry → name confirmation → details (dept/faculty/phone/email) → OTP verification (email) → skill selection.

## Tech Stack
- **Framework**: NestJS 11.x (Node.js 20.x)
- **Language**: TypeScript 5.x
- **Database**: MongoDB via Mongoose 8.x
- **Email**: Nodemailer with Gmail SMTP
- **Testing**: Jest 29.x for unit tests and e2e tests
- **Code Quality**: ESLint 9.x, Prettier 3.x
- **Build**: Webpack via NestJS CLI

## Quick start
- Env: create `.env` with MONGODB_URI, GMAIL_USER, GMAIL_PASS. Optional: PORT. See Environment variables section for all options.
- Dev: `npm run start:dev` (task "Start NestJS App" exists) – serves static UI from `src/public/index.html` and API under `/student`.
- Build: `npm run build` (webpack build to dist/)
- Tests: `npm run test`, e2e `npm run test:e2e`
- Lint: `npm run lint` (ESLint with auto-fix)
- Format: `npm run format` (Prettier)
- Production: `npm run start:prod` (requires prior build)

## Core architecture
- `src/main.ts`: NestExpress app; serves `src/public` as static; logs each API request and JSON body.
- `src/app.module.ts`: ConfigModule (global), Mongoose connection via `MONGODB_URI`, models registered via `MongooseModule.forFeature`.
- Data models:
	- `Student` (`src/student.schema.ts`): matricNumber (unique), name, department, faculty, phone, email (unique sparse), isEmailVerified, skills[], otp, otpExpires, firstname/lastname, course_code, isCarryOver.
	- `Skill` (`src/skill.schema.ts`): code (unique), description, trainer, phone, maxSelection (default 160), selectedCount (default 0), hidden (default false).
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
- OTP is 6 digits (`crypto.randomInt`), does not expire (reusable); stored in Student. Verification sets `isEmailVerified = true` but keeps OTP for potential reuse.
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
- Carry-over students: Set `isCarryOver: true` via POST `/student/confirm` with `carryOver` field.
- Email validation: Controller validates email format, checks MX records, and suggests corrections for common typos (gmail/yahoo/outlook).
- OTP never expires (otpExpires always undefined after generation) – students can reuse the same OTP indefinitely for convenience.

## Code style and patterns
- TypeScript with strict mode enabled
- Use NestJS decorators: `@Controller`, `@Injectable`, `@Post`, `@Get`, etc.
- Services handle business logic; controllers handle HTTP requests/responses
- Mongoose models use `@Prop`, `@Schema` decorators from `@nestjs/mongoose`
- Error handling: Return `{ error: string }` or throw exceptions; controller catches and returns appropriate responses
- Use `lean()` for read-only queries to get plain objects instead of Mongoose documents
- Async/await preferred over promises/callbacks
- ESLint rules enforced via `npm run lint` – fix warnings/errors before committing

## Testing
- Unit tests: Located in `src/*.spec.ts` files (currently has issues with app.controller.spec.ts)
- E2E tests: Located in `test/app.e2e-spec.ts`
- Run tests with `npm run test` or `npm run test:watch` for watch mode
- Coverage: `npm run test:cov`
- Note: Some existing tests may fail due to refactoring. Update tests to match current implementation.

## File map (start here)
- API: `src/student.controller.ts`, `src/student.service.ts`
- Models: `src/student.schema.ts`, `src/skill.schema.ts`
- App setup: `src/app.module.ts`, `src/main.ts`
- Email service: `src/mailer.service.ts`
- UI: `src/public/index.html` (single-page static HTML with inline CSS/JS)
- Seeders: `data-seeder/seed-*.ts` (see Data seeder utilities section for details)
- Config: `.env` (not in repo), `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`

## Data seeder utilities
- `seed-students.ts`: Import students from Excel file (pass file path as argument)
- `seed-skills.ts`: Import skills from `datas/GSE 301 SKILL LIST.xlsx`
- `clear-students.ts`: Remove all students from database
- `clear-skills.ts`: Remove all skills from database
- `manage-hidden-skills.ts`: Interactive CLI to hide/unhide skills (uses `hide-skills.ts` internally)
- `update-skill-limits.ts`: Bulk update maxSelection for skills
- `add-new-skills.ts`: Add new skills to database
- All seeders use `npx ts-node data-seeder/<script>.ts` to run

## Environment variables
Required:
- `MONGODB_URI`: MongoDB connection string
- `GMAIL_USER`: Gmail account for sending OTP emails
- `GMAIL_PASS`: Gmail App Password (requires 2FA enabled)

Optional:
- `PORT`: Server port (default: 3000)
- `GMAIL_SENDER_NAME`: Display name for email sender (default: "GSE Student Registration")
- `EMAIL_SENDER`: Sender email address (defaults to GMAIL_USER)
- `JWT_SECRET`: JWT secret (currently unused but may be needed for future auth features)

## Deployment
- Heroku ready: `heroku-postbuild` script runs `npm run build`
- Engine: Node 20.x specified in package.json
- Production build: Webpack bundles to `dist/` directory
- Static assets served from `src/public/` at runtime (not bundled)
