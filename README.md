# CloudReady

CloudReady is an independent study companion for learners preparing for cloud fundamentals certifications. It uses original practice questions and plain language learning notes. It is not affiliated with Microsoft and does not contain official exam questions.

## Included

* Public pages for Home, About, Contact, Resources, and a study tools dropdown
* Sign up and sign in pages with a Back home link
* Local demo account is created automatically during development startup
* Practice quiz with answer explanations
* Flashcards and a weekly study planner
* Progress report and searchable learning resources
* In platform study assistant for summaries and topic research
* Turso compatible database for accounts, quiz history, study plans, and feedback
* Local SQLite compatible mode for development
* Responsive Electric Indigo and Soft Lilac design

## Requirements

Node.js 20 or later and npm.

## Local setup

1. Copy `.env.example` to `.env`.
2. Leave `TURSO_DATABASE_URL=file:./cloudready.db` for a local database, or use a Turso database URL and token.
3. Set `JWT_SECRET` to a long random value.
4. Set `OPENAI_API_KEY` to enable live study assistant responses. The AI key is used only on the server. Without it, the assistant returns a configuration message instead of fabricated content.
5. To enable the local demo account, copy the demo email and password from the section below into `DEMO_ACCOUNT_EMAIL` and `DEMO_ACCOUNT_PASSWORD` in `.env`. Do not add these values to frontend files.
6. Run `npm install`.
7. Run `npm run dev`.
8. Open the Vite URL, normally `http://localhost:5173`.

Demo sign in:

* Email: `demo@cloudready.com`
* Password: `CloudReady123!`

The local demo user is created when the API server initializes the database outside production. Demo credentials are documented here only and are not displayed anywhere in the application UI. Use them for local testing only. Production does not seed a demo account by default. If a shared demo account is specifically needed for a controlled production demo, set `ENABLE_DEMO_ACCOUNT=true`, `DEMO_ACCOUNT_EMAIL`, and `DEMO_ACCOUNT_PASSWORD` in the hosting environment. Use a unique strong password that is not the local demo password, and disable this access after the demo.

## Production deployment

The easiest deployment is a Node host that runs the Express API and serves the Vite build from the same origin.

1. Set `NODE_ENV=production`.
2. Set `TURSO_DATABASE_URL` to the database URL from Turso.
3. Set `TURSO_AUTH_TOKEN` to the database token.
4. Set `JWT_SECRET` to a secure random secret.
5. Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to enable AI features.
6. Set `CLIENT_ORIGIN` to the trusted frontend origin when frontend and API are separate.
7. Leave demo account seeding disabled for normal production use. For a controlled demo, set `ENABLE_DEMO_ACCOUNT=true` plus a unique `DEMO_ACCOUNT_EMAIL` and strong `DEMO_ACCOUNT_PASSWORD` in the hosting environment. Do not reuse the documented local demo password in production.
8. Install dependencies with `npm ci` after committing a lockfile, build with `npm run build`, then start with `npm start`.

If deploying the frontend and API separately, deploy the `dist` directory to your static host and the Express server to a Node host. Configure the frontend `/api` requests to reach the API using your platform's rewrite or proxy configuration. Keep all secrets in the server environment, never in Vite variables.

## API routes

* `GET /api/health`
* `POST /api/auth/signup`
* `POST /api/auth/signin`
* `GET /api/me`
* `GET /api/progress` and `POST /api/progress` (authenticated)
* `GET /api/plan` and `PUT /api/plan` (authenticated)
* `POST /api/feedback`
* `POST /api/study/summary`
* `POST /api/study/research`

## Important production notes

* The study assistant uses an LLM provider API, not live web browsing. Research responses are general knowledge and should be verified against authoritative resources. Do not represent generated summaries as official guidance.
* Before launch, disable the demo account or restrict it, add rate limiting and monitoring, review privacy requirements, and configure backups and database access policies.
* Run `npm audit` and review all dependency advisories before release. A clean audit cannot be guaranteed in advance because dependency advisories change.
* Contact form messages are persisted in the database. Protect access to the database and define a retention policy.
* Quiz data in the current UI is sample content. Account APIs and progress storage are provided, and the next integration step is connecting quiz submissions and planner updates to those endpoints.
