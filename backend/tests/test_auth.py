import pytest
from app.models.member import Member, RoleEnum
from app.models.user import AuthenticatedUser


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SOC Agent API"


def test_docs_page_allows_swagger_ui_assets(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text
    csp = response.headers.get("content-security-policy", "")
    assert "cdn.jsdelivr.net" in csp


def test_local_emulator_email_claim_is_accepted():
    user = AuthenticatedUser(
        uid="demo-admin",
        email="admin@socagent.local",
        org_id="demo-org",
        role=RoleEnum.ADMIN,
    )

    assert user.email == "admin@socagent.local"

    member = Member(
        uid="demo-member",
        name="Demo Member",
        email="user@socagent.local",
        role=RoleEnum.USER,
    )

    assert member.email == "user@socagent.local"


def test_missing_auth_header(client):
    response = client.get("/api/admin/policies")
    assert response.status_code == 401
    assert "Missing authentication credentials" in response.json()["detail"]


def test_invalid_bearer_token(client):
    response = client.get(
        "/api/admin/policies",
        headers={"Authorization": "Bearer completely-invalid-token"},
    )
    assert response.status_code == 401
    assert "Invalid or expired authentication token" in response.json()["detail"]


def test_token_missing_claims(client):
    response = client.get(
        "/api/admin/policies",
        headers={"Authorization": "Bearer token-no-claims"},
    )
    assert response.status_code == 401
    assert "missing required orgId" in response.json()["detail"]


def test_token_invalid_role(client):
    response = client.get(
        "/api/admin/policies",
        headers={"Authorization": "Bearer token-invalid-role"},
    )
    assert response.status_code == 403
    assert "Invalid user role" in response.json()["detail"]


def test_normal_user_denied_admin_endpoint(client):
    # User token attempting to access admin route
    response = client.get(
        "/api/admin/policies",
        headers={"Authorization": "Bearer user-token-org-a"},
    )
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]


def test_admin_can_access_user_endpoint(client):
    # Admin role is also an allowed org member on user routes
    response = client.get(
        "/api/user/policies",
        headers={"Authorization": "Bearer admin-token-org-a"},
    )
    assert response.status_code == 200


def test_emulator_mode_ignores_service_account_credentials(monkeypatch):
    import firebase_admin
    import app.auth.firebase as firebase_module

    monkeypatch.setattr(firebase_module, "_firebase_app", None)
    monkeypatch.setattr(firebase_module.settings, "FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099")
    monkeypatch.setattr(firebase_module.settings, "FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080")
    monkeypatch.setattr(firebase_module.settings, "GOOGLE_APPLICATION_CREDENTIALS", "/tmp/invalid.json")

    def fake_init_app(*args, **kwargs):
        return object()

    monkeypatch.setattr(firebase_admin, "_apps", [])
    monkeypatch.setattr(firebase_admin, "initialize_app", fake_init_app)

    called = {"certificate": False}

    def fake_certificate(path):
        called["certificate"] = True
        raise AssertionError("service-account credentials should not be used while emulator hosts are set")

    monkeypatch.setattr(firebase_module.credentials, "Certificate", fake_certificate)

    firebase_module.get_firebase_app()

    assert called["certificate"] is False
