import pytest


def test_policy_lifecycle_workflow(client):
    admin_headers = {"Authorization": "Bearer admin-token-org-a"}
    user_headers = {"Authorization": "Bearer user-token-org-a"}

    # 1. Admin creates policy (starts as draft)
    create_payload = {
        "name": "Access Control Policy",
        "type": "technical",
        "owner": "Security Team",
        "initial_content": "# Access Control Policy\n\nMFA is mandatory.",
        "change_note": "Initial version draft",
    }
    create_res = client.post("/api/admin/policies", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201
    policy_data = create_res.json()
    policy_id = policy_data["id"]
    assert policy_data["status"] == "draft"
    assert policy_data["current_version"] == 1
    assert policy_data["latest_version"]["content"] == "# Access Control Policy\n\nMFA is mandatory."

    # 2. Regular user cannot see draft policy
    user_list_res = client.get("/api/user/policies", headers=user_headers)
    assert user_list_res.status_code == 200
    assert len(user_list_res.json()) == 0

    # User cannot read draft policy directly
    user_read_res = client.get(f"/api/user/policies/{policy_id}", headers=user_headers)
    assert user_read_res.status_code == 404

    # 3. Invalid status jump: draft -> published directly must be rejected
    jump_res = client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "published"},
        headers=admin_headers,
    )
    assert jump_res.status_code == 400
    assert "Invalid transition" in jump_res.json()["detail"]

    # 4. Valid transition: draft -> in_review
    review_res = client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "in_review", "reason": "Ready for security review"},
        headers=admin_headers,
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "in_review"

    # 5. Valid transition: in_review -> approved
    approved_res = client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "approved", "reason": "Approved by CISO"},
        headers=admin_headers,
    )
    assert approved_res.status_code == 200
    assert approved_res.json()["status"] == "approved"

    # 6. Valid transition: approved -> published
    published_res = client.patch(
        f"/api/admin/policies/{policy_id}/status",
        json={"status": "published", "reason": "Published organization-wide"},
        headers=admin_headers,
    )
    assert published_res.status_code == 200
    assert published_res.json()["status"] == "published"
    assert published_res.json()["last_reviewed"] is not None

    # 7. User can now list and view published policy
    user_list_after = client.get("/api/user/policies", headers=user_headers)
    assert user_list_after.status_code == 200
    published_policies = user_list_after.json()
    assert len(published_policies) == 1
    assert published_policies[0]["id"] == policy_id

    # 8. User can read published policy details
    user_view_res = client.get(f"/api/user/policies/{policy_id}", headers=user_headers)
    assert user_view_res.status_code == 200
    assert user_view_res.json()["latest_version"]["content"] == "# Access Control Policy\n\nMFA is mandatory."

    # 9. User acknowledges the policy version
    ack_res = client.post(
        f"/api/user/policies/{policy_id}/acknowledge",
        json={"version": 1},
        headers=user_headers,
    )
    assert ack_res.status_code == 201
    ack_data = ack_res.json()
    assert ack_data["policy_id"] == policy_id
    assert ack_data["version"] == 1
    assert ack_data["uid"] == "user-uid-a"

    # 10. User lists their acknowledgements
    my_acks_res = client.get("/api/user/acknowledgements", headers=user_headers)
    assert my_acks_res.status_code == 200
    my_acks = my_acks_res.json()
    assert len(my_acks) == 1
    assert my_acks[0]["policy_id"] == policy_id
