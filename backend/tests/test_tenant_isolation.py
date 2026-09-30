import pytest


def test_cross_tenant_isolation_strictly_enforced(client):
    admin_a_headers = {"Authorization": "Bearer admin-token-org-a"}
    user_a_headers = {"Authorization": "Bearer user-token-org-a"}
    admin_b_headers = {"Authorization": "Bearer admin-token-org-b"}
    user_b_headers = {"Authorization": "Bearer user-token-org-b"}

    # 1. Admin of Org A creates a policy
    create_res = client.post(
        "/api/admin/policies",
        json={"name": "Org A Confidential Security Policy", "type": "technical"},
        headers=admin_a_headers,
    )
    assert create_res.status_code == 201
    policy_a_id = create_res.json()["id"]

    # 2. Admin of Org B lists policies -> sees 0 policies (cannot see Org A)
    list_b_res = client.get("/api/admin/policies", headers=admin_b_headers)
    assert list_b_res.status_code == 200
    assert len(list_b_res.json()) == 0

    # 3. Admin of Org B attempts to read Org A policy directly -> 404
    read_b_res = client.get(f"/api/admin/policies/{policy_a_id}", headers=admin_b_headers)
    assert read_b_res.status_code == 404

    # 4. Admin of Org B attempts to update Org A policy -> 404
    update_b_res = client.put(
        f"/api/admin/policies/{policy_a_id}",
        json={"name": "Tampered By Org B"},
        headers=admin_b_headers,
    )
    assert update_b_res.status_code == 404

    # 5. Admin of Org B attempts to change status of Org A policy -> 404
    status_b_res = client.patch(
        f"/api/admin/policies/{policy_a_id}/status",
        json={"status": "in_review"},
        headers=admin_b_headers,
    )
    assert status_b_res.status_code == 404

    # 6. Admin A approves and publishes Org A policy
    client.patch(
        f"/api/admin/policies/{policy_a_id}/status",
        json={"status": "in_review"},
        headers=admin_a_headers,
    )
    client.patch(
        f"/api/admin/policies/{policy_a_id}/status",
        json={"status": "approved"},
        headers=admin_a_headers,
    )
    client.patch(
        f"/api/admin/policies/{policy_a_id}/status",
        json={"status": "published"},
        headers=admin_a_headers,
    )

    # 7. User B from Org B lists published policies -> sees 0 policies
    user_b_list = client.get("/api/user/policies", headers=user_b_headers)
    assert user_b_list.status_code == 200
    assert len(user_b_list.json()) == 0

    # 8. User B attempts to acknowledge Org A policy -> 404
    user_b_ack = client.post(
        f"/api/user/policies/{policy_a_id}/acknowledge",
        json={"version": 1},
        headers=user_b_headers,
    )
    assert user_b_ack.status_code == 404

    # 9. Admin B lists audit logs -> sees 0 entries from Org A
    audit_b_res = client.get("/api/admin/audit-log", headers=admin_b_headers)
    assert audit_b_res.status_code == 200
    assert len(audit_b_res.json()) == 0

    # 10. Admin A lists audit logs -> sees Org A's logged actions
    audit_a_res = client.get("/api/admin/audit-log", headers=admin_a_headers)
    assert audit_a_res.status_code == 200
    assert len(audit_a_res.json()) > 0
