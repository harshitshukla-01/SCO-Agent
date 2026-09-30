import pytest


def test_audit_log_records_all_mutations(client):
    admin_headers = {"Authorization": "Bearer admin-token-org-a"}
    user_headers = {"Authorization": "Bearer user-token-org-a"}

    # 1. Create policy -> Audit POLICY_CREATED
    create_res = client.post(
        "/api/admin/policies",
        json={"name": "Incident Response Plan", "type": "documentary"},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    policy_id = create_res.json()["id"]

    # 2. Update policy content -> Audit POLICY_UPDATED
    update_res = client.put(
        f"/api/admin/policies/{policy_id}",
        json={"content": "Updated incident handling steps", "change_note": "Added triage phase"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200

    # 3. Status change to in_review -> Audit POLICY_STATUS_CHANGED
    client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "in_review", "reason": "Draft complete"},
        headers=admin_headers,
    )

    # 4. Status change to approved -> Audit POLICY_STATUS_CHANGED
    client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "approved", "reason": "Approved"},
        headers=admin_headers,
    )

    # 5. Status change to published -> Audit POLICY_STATUS_CHANGED
    client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "published", "reason": "Published"},
        headers=admin_headers,
    )

    # 6. User acknowledges -> Audit POLICY_ACKNOWLEDGED
    client.post(
        f"/api/user/policies/{policy_id}/acknowledge",
        json={"version": 2},
        headers=user_headers,
    )

    # 7. Admin invites a new member -> Audit MEMBER_INVITED
    client.post(
        "/api/admin/members",
        json={"name": "Alice Auditor", "email": "alice@org-a.com", "role": "user"},
        headers=admin_headers,
    )

    # Retrieve audit log
    audit_res = client.get("/api/admin/audit-log", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 7

    actions_recorded = [item["action"] for item in logs]
    assert "POLICY_CREATED" in actions_recorded
    assert "POLICY_UPDATED" in actions_recorded
    assert "POLICY_STATUS_CHANGED" in actions_recorded
    assert "POLICY_ACKNOWLEDGED" in actions_recorded
    assert "MEMBER_INVITED" in actions_recorded

    # Check actor details on an entry
    policy_create_entry = next(item for item in logs if item["action"] == "POLICY_CREATED")
    assert policy_create_entry["actor_uid"] == "admin-uid-a"
    assert policy_create_entry["actor_email"] == "admin@org-a.com"
    assert policy_create_entry["target_type"] == "policy"
    assert policy_create_entry["target_id"] == policy_id
