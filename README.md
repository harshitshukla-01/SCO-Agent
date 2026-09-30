# SOC Agent

SOC Agent is an open-source, multi-tenant compliance policy management application. The current MVP helps an organization draft and version policies, move them through an approval workflow, publish approved policies to members, record acknowledgements, and review administrative activity.

It is a policy workflow tool, not an automated compliance assessment product. It does not currently scan repositories, verify SOC 2 or ISO 27001 controls, or determine whether an organization is audit-ready.

## Current Capabilities

- **Policy register:** Administrators create and edit documentary or technical policies, with version history and change notes.
- **Policy lifecycle:** Policies move through `draft` → `in_review` → `approved` → `published`, with controlled return transitions for rework.
- **Member and role management:** Administrators invite members and manage `admin` and `user` roles.
- **Member policy portal:** Members can read published policies and acknowledge a specific version. A dashboard summarizes published policies and the signed-in member's acknowledgements.
- **Administrative audit log:** Policy and member actions are recorded as organization-scoped audit events.
- **Tenant-aware access:** The API verifies Firebase ID tokens, derives organization and role from token claims, and scopes Firestore access to that organization.

The UI also contains roadmap screens for tasks, evidence, AI proposals, and integrations. Those screens are placeholders; they do not yet provide those capabilities.

## Product Roadmap

These are planned directions, not functionality available in the current MVP:

- Deterministic repository checks and security scans
- GitHub integration and pull request impact analysis
- Human-reviewed AI suggestions for policy and test updates
- Evidence collection, project fact sheets, and diagram/document generation
- A configurable, rule-based security release gate
- Framework mappings and control packs for standards such as SOC 2 and ISO 27001

The emulator seed script creates 15 sample policy records in `draft` status. Their text is generic starter content containing `[TO CONFIRM]` markers; they are not reviewed, complete, or ready to use as organizational policy. Review and adapt all policy content before relying on it. Using SOC Agent does not itself establish compliance or guarantee an audit outcome.

## Architecture

- **Frontend:** React 18, TypeScript, Vite, React Router, Firebase Web Authentication
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Firebase Admin SDK
- **Data:** Cloud Firestore, partitioned under `organizations/{orgId}`
- **Local development:** Firebase Authentication and Firestore emulators, orchestrated with Docker Compose

The browser sends Firebase ID tokens to the FastAPI API. The backend validates the token and uses its `orgId` and `role` claims for authorization and tenant scoping. Firestore security rules deny client writes; application mutations go through the backend. Audit events are append-only through the application's audit logger, but the current setup is not a tamper-proof or independently retained audit archive.

## Local Development

### Prerequisites

- Docker Desktop with Docker Compose

### Start the application

From the repository root, create the Compose environment file and start the services:

```powershell
Copy-Item backend/.env.example backend/.env
# Set GEMINI_API_KEY in backend/.env before using AI generation.
docker compose up --build
```

Set `GEMINI_API_KEY` to a Google Gen AI API key in `backend/.env` before starting the backend if you want to generate policy drafts. Gemini calls run only in the backend; the key is never sent to the browser. `GEMINI_MODEL` defaults to `gemini-2.5-flash` and can be changed in the same environment file.

In a second terminal, seed the local Firebase emulators:

```powershell
docker compose run --rm seed
```

The development frontend and API are then available at:

- Frontend: <http://localhost:5173>
- API health: <http://localhost:8000/health>
- Interactive API docs: <http://localhost:8000/docs>
- Firebase Emulator UI: <http://localhost:4000>
- Firebase Auth emulator: <http://localhost:9099>
- Firestore emulator: <http://localhost:8080>

The demo accounts are created by the seed command and exist only in the local emulator:

| Role | Email | Password | Portal |
| --- | --- | --- | --- |
| Admin | `admin@socagent.local` | `Password123!` | `/admin/policies` |
| Member | `user@socagent.local` | `Password123!` | `/app/dashboard` |

These credentials are for local development only. Do not use them in a deployed environment. Emulator data is stored in the `firebase_data` Docker volume; `docker compose down` stops the services without removing that volume.

## Generate and Export Policies

1. Sign in as an administrator and open **Project Facts**. This repository does not have a connected GitHub repository or automated discovery, so fill in the manual questionnaire with verified organization facts and evidence notes. Saving creates a new fact-sheet version.
2. Open **Policies Register**, choose **View / Manage**, then select **Generate with AI**. The backend uses the policy-specific template and relevant saved facts. Missing details should remain marked `[TO CONFIRM: ...]` for review.
3. Review the generated content, its fact references, and the items to confirm. Edit the Markdown as needed, save as a draft version or submit it for review, then use the candidate's separate review, approval, and publish actions. The currently published version remains active until the candidate is published.
4. Admins can download PDF or DOCX from the policy view. Draft downloads require confirmation and are marked `DRAFT - NOT APPROVED`; members can download only published policies. Exports are generated on demand and are not stored in Firestore.

Generated content is advisory, may be incomplete, and is not evidence that a control exists. **AI-generated draft. Review by a qualified person required before use. This tool does not certify compliance.** The generation endpoint is limited to five requests per administrator per hour per backend process.

## Local GitHub Webhook Testing

The repository does not currently include a GitHub webhook handler; this optional tunnel only exposes the local backend for development and future webhook testing.

1. Create a free ngrok account and copy the authtoken from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken). The official ngrok Docker image requires this token. Add it to the root `.env` file as `NGROK_AUTHTOKEN=...`; do not commit the file. The repository ignores `.env` files.

	On a fresh checkout, create the root env file without overwriting an existing one:

	```powershell
	if (!(Test-Path .env)) { Copy-Item .env.example .env }
	notepad .env
	```

2. Start the normal development stack from the repository root:

	```powershell
	docker compose up --build
	```

3. In a separate terminal, start only the tunnel profile:

	```powershell
	docker compose --profile tunnel up ngrok
	```

	Or use `make tunnel`. The tunnel profile is not started by plain `docker compose up`. Compose connects ngrok to the same default network and waits for the backend health check; if the backend or emulator is stopped, Compose starts those dependencies.

4. Open <http://localhost:4040> to see the assigned public HTTPS URL and inspect requests/responses, or run `docker compose logs -f ngrok` to follow the ngrok agent output. The inspection UI is useful for checking the exact GitHub payload and diagnosing signature or payload issues.

5. Each restart gets a new URL on a free ngrok account. Update the GitHub App webhook URL each time by appending `/webhooks/github` to the assigned ngrok URL. The endpoint is not implemented in this repository yet, so that path will return 404 until Phase 2 adds the handler; the tunnel can still expose existing routes such as `/health`.

This tunnel is for local development only. Production should use the backend's real public URL; webhook code should not need to change, only the URL configured in GitHub.

## Tests

The backend test suite uses mocked Firebase services, so the emulators do not need to be running. From the repository root, create and activate a virtual environment, install the backend requirements, then run:

```powershell
py -3.11 -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m pytest backend/tests -v
```

The tests cover authentication and role checks, policy lifecycle behavior, audit logging, and cross-organization isolation.

## Repository Layout

```text
backend/app/       FastAPI routes, authentication, models, repositories, and audit logging
backend/tests/     Backend API and isolation tests
backend/scripts/   Local emulator seed script
frontend/src/      Admin console, member portal, and shared API/auth code
firebase/          Emulator configuration and Firestore rules/indexes
docker-compose.yml Local frontend, backend, and Firebase emulator services
```

## License

Apache License 2.0. See [LICENSE](LICENSE).
