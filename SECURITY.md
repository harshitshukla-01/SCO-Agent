# Security Policy

## Reporting a Vulnerability

The SOC Agent team takes the security of our software and our users seriously. If you believe you have found a security vulnerability in SOC Agent, please report it to us as described below.

### Where to Report
Please **do NOT** report security vulnerabilities through public GitHub issues, discussions, or pull requests.

Instead, please send an email to:
**security@socagent.dev** (or open a private security advisory on GitHub if enabled).

If you wish to encrypt your report, please request our PGP public key via the security contact email.

### What to Include in Your Report
To help us investigate and triage your report efficiently, please include:
- A description of the issue, including potential impact.
- Clear step-by-step instructions to reproduce the vulnerability (proof of concept, cURL command, or script).
- The affected component, file, or endpoint (e.g., `backend/app/auth/dependencies.py` or `/api/admin/policies`).
- Any potential remediations or patches you have identified.

### Response Timelines
- **Initial Acknowledgment:** Within 48 hours of receipt.
- **Triage and Status Update:** Within 5 business days.
- **Remediation & Coordinated Disclosure:** We aim to release a patch within 30 days of validation, coordinating public disclosure with the reporter.

## Supported Versions

Only the latest release and the current `main` branch are actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Security Architecture Principles
1. **Never Trust the Client**: All authorization checks (`orgId`, `role`) are executed on the backend via cryptographically verified Firebase ID tokens.
2. **Strict Multi-Tenant Scoping**: All Firestore queries are strictly partitioned by `organizations/{orgId}`.
3. **Immutable Audit Logging**: Every mutating administrative or policy action is recorded in an append-only audit log.
4. **Zero Client Writes in Firestore**: Direct writes from client SDKs to Firestore are disabled by default. All mutations flow through backend APIs with strict Pydantic validation.
5. **No Secrets in Source Control**: All sensitive values are managed through environment variables or secret managers, never hardcoded.
