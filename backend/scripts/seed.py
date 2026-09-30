#!/usr/bin/env python3
"""
Seed script for SOC Agent local emulator development.
Only executes when FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST are detected.
Never seeds production data or external cloud projects.
"""

import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set emulator hosts if not explicitly set in environment
os.environ.setdefault("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099")
os.environ.setdefault("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080")
os.environ.setdefault("PROJECT_ID", "soc-agent-demo")

# Never allow a stale cloud service-account JSON to override emulator mode.
os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)

import firebase_admin
from firebase_admin import auth, firestore
from app.models.member import RoleEnum
from app.models.policy import PolicyStatus, PolicyType, PolicySource

# Safety check: strictly prevent execution without emulator flags
auth_host = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST")
firestore_host = os.environ.get("FIRESTORE_EMULATOR_HOST")

if not auth_host or not firestore_host:
    print("ERROR: Safety refusal. seed.py must ONLY be run with emulator hosts configured.")
    sys.exit(1)

# Initialize Firebase app for emulator
if not firebase_admin._apps:
    firebase_admin.initialize_app(options={"projectId": os.environ["PROJECT_ID"]})

if os.environ.get("FIRESTORE_EMULATOR_HOST"):
    from google.cloud import firestore as gcloud_firestore
    db = gcloud_firestore.Client(project=os.environ["PROJECT_ID"])
else:
    db = firestore.client()

BASE_POLICIES = [
    ("Human Resource Security Policy", PolicyType.DOCUMENTARY),
    ("Code of Conduct", PolicyType.DOCUMENTARY),
    ("Third-Party Management Policy", PolicyType.DOCUMENTARY),
    ("Risk Management Policy", PolicyType.DOCUMENTARY),
    ("Asset Management Policy", PolicyType.TECHNICAL),
    ("Data Management Policy", PolicyType.TECHNICAL),
    ("Cryptography Policy", PolicyType.TECHNICAL),
    ("Secure Development Policy", PolicyType.TECHNICAL),
    ("Access Control Policy", PolicyType.TECHNICAL),
    ("Business Continuity and Disaster Recovery Plan", PolicyType.DOCUMENTARY),
    ("Operations Security Policy", PolicyType.TECHNICAL),
    ("Physical Security Policy", PolicyType.DOCUMENTARY),
    ("Information Security Roles and Responsibilities", PolicyType.DOCUMENTARY),
    ("Information Security Policy (AUP)", PolicyType.DOCUMENTARY),
    ("Incident Response Plan", PolicyType.DOCUMENTARY),
]

DEMO_ORG_ID = "demo-org"


def get_or_create_user(email: str, password: str, display_name: str, role: str) -> str:
    try:
        user = auth.get_user_by_email(email)
        print(f"  [i] Found existing user: {email} ({user.uid})")
        uid = user.uid
    except auth.UserNotFoundError:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
        )
        print(f"  [+] Created user: {email} ({user.uid})")
        uid = user.uid

    # Set custom claims with orgId and role
    auth.set_custom_user_claims(uid, {"orgId": DEMO_ORG_ID, "role": role})
    print(f"  [✓] Set custom claims for {email}: {{ orgId: '{DEMO_ORG_ID}', role: '{role}' }}")
    return uid


def run_seed():
    print(f"\n=======================================================")
    print(f"Seeding SOC Agent Demo Data against Firebase Emulator")
    print(f"Auth Emulator:      {auth_host}")
    print(f"Firestore Emulator: {firestore_host}")
    print(f"Project ID:         {os.environ['PROJECT_ID']}")
    print(f"Organization:       {DEMO_ORG_ID}")
    print(f"=======================================================\n")

    now = datetime.now(timezone.utc).isoformat()
    org_ref = db.collection("organizations").document(DEMO_ORG_ID)

    # 1. Organization document
    org_ref.set({
        "id": DEMO_ORG_ID,
        "name": "Acme Cyber Demo Org",
        "created_at": now,
        "updated_at": now,
    })
    print(f"[✓] Initialized organization: {DEMO_ORG_ID}")

    # 2. Admin User
    admin_uid = get_or_create_user(
        email="admin@socagent.local",
        password="Password123!",
        display_name="Demo Admin",
        role="admin",
    )
    org_ref.collection("members").document(admin_uid).set({
        "uid": admin_uid,
        "name": "Demo Admin",
        "email": "admin@socagent.local",
        "role": RoleEnum.ADMIN.value,
        "created_at": now,
        "updated_at": now,
    })

    # 3. Regular User
    user_uid = get_or_create_user(
        email="user@socagent.local",
        password="Password123!",
        display_name="Demo Member",
        role="user",
    )
    org_ref.collection("members").document(user_uid).set({
        "uid": user_uid,
        "name": "Demo Member",
        "email": "user@socagent.local",
        "role": RoleEnum.USER.value,
        "created_at": now,
        "updated_at": now,
    })

    # 4. Seed the 15 base compliance policies
    print(f"\n[+] Seeding 15 base compliance policies as 'draft'...")
    for idx, (policy_name, p_type) in enumerate(BASE_POLICIES, start=1):
        slug = policy_name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-")
        policy_id = f"pol-{slug}"
        policy_doc_ref = org_ref.collection("policies").document(policy_id)

        placeholder_content = f"""# {policy_name}

## 1. Purpose & Objective
This document outlines the standard compliance and operational requirements for **{policy_name}** within the organization.

## 2. Scope
This policy applies to all personnel, systems, and assets interacting with organizational data.

## 3. Policy Statements
- [TO CONFIRM] Organizational baseline requirements.
- [TO CONFIRM] Operational and technical controls.

## 4. Revision History
- **Version 1.0**: Initial baseline draft imported during environment setup.
"""

        policy_data = {
            "id": policy_id,
            "name": policy_name,
            "type": p_type.value,
            "owner": None,
            "status": PolicyStatus.DRAFT.value,
            "current_version": 1,
            "last_reviewed": None,
            "next_review": None,
            "created_at": now,
            "updated_at": now,
        }

        version_data = {
            "id": "v1",
            "policy_id": policy_id,
            "version_number": 1,
            "content": placeholder_content,
            "change_note": "Initial baseline draft imported",
            "source": PolicySource.MANUAL.value,
            "created_by": admin_uid,
            "created_by_email": "admin@socagent.local",
            "created_at": now,
        }

        policy_doc_ref.set(policy_data)
        policy_doc_ref.collection("versions").document("v1").set(version_data)
        print(f"  [{idx:02d}/15] Seeded: {policy_name} ({policy_id}) [status: draft]")

    # 5. Seed initial audit log entry
    audit_id = f"aud_seed_{int(datetime.now().timestamp())}"
    org_ref.collection("auditLog").document(audit_id).set({
        "id": audit_id,
        "actor_uid": admin_uid,
        "actor_email": "admin@socagent.local",
        "actor_role": "admin",
        "action": "ENVIRONMENT_SEEDED",
        "target_type": "organization",
        "target_id": DEMO_ORG_ID,
        "details": {"policies_count": len(BASE_POLICIES), "users": ["admin@socagent.local", "user@socagent.local"]},
        "timestamp": now,
    })
    print(f"\n[✓] Seeded initial audit log entry.")
    print("\n=======================================================")
    print("SUCCESS: Emulator database seeded successfully!")
    print("Demo Admin: admin@socagent.local / Password123!")
    print("Demo User:  user@socagent.local  / Password123!")
    print("=======================================================\n")


if __name__ == "__main__":
    run_seed()
