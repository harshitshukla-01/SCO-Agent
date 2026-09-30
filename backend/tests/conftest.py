import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Ensure test environment variables are loaded
os.environ["ENVIRONMENT"] = "testing"
os.environ["PROJECT_ID"] = "test-soc-agent"

from app.main import app
import app.auth.firebase as firebase_module
import app.auth.dependencies as deps_module
import app.repositories.member_repo as member_repo_module
import app.repositories.policy_repo as policy_repo_module
import app.repositories.acknowledgement_repo as ack_repo_module
import app.repositories.project_facts_repo as project_facts_repo_module
import app.audit.logger as audit_logger_module


class FakeDoc:
    def __init__(self, doc_id, data, exists=True):
        self.id = doc_id
        self._data = dict(data) if data is not None else {}
        self.exists = exists

    def to_dict(self):
        return dict(self._data)


class FakeDocRef:
    def __init__(self, doc_id, store):
        self.id = doc_id
        self._store = store
        self._subcollections = {}

    def get(self):
        data = self._store.get(self.id)
        return FakeDoc(self.id, data, exists=(data is not None))

    def set(self, data):
        self._store[self.id] = dict(data)

    def update(self, data):
        if self.id in self._store:
            self._store[self.id].update(data)
        else:
            self._store[self.id] = dict(data)

    def collection(self, name):
        if name not in self._subcollections:
            sub_store = {}
            self._subcollections[name] = FakeCollectionRef(name, sub_store)
        return self._subcollections[name]


class FakeCollectionRef:
    def __init__(self, name, store):
        self.name = name
        self._store = store
        self._doc_refs = {}
        self._filters = []
        self._order_field = None
        self._order_dir = "ASCENDING"
        self._limit_n = None

    def document(self, doc_id=None):
        if not doc_id:
            import uuid
            doc_id = uuid.uuid4().hex
        if doc_id not in self._doc_refs:
            self._doc_refs[doc_id] = FakeDocRef(doc_id, self._store)
        return self._doc_refs[doc_id]

    def where(self, field, op, val):
        new_ref = FakeCollectionRef(self.name, self._store)
        new_ref._doc_refs = self._doc_refs
        new_ref._filters = list(self._filters) + [(field, op, val)]
        new_ref._order_field = self._order_field
        new_ref._order_dir = self._order_dir
        new_ref._limit_n = self._limit_n
        return new_ref

    def order_by(self, field, direction="ASCENDING"):
        new_ref = FakeCollectionRef(self.name, self._store)
        new_ref._doc_refs = self._doc_refs
        new_ref._filters = list(self._filters)
        new_ref._order_field = field
        new_ref._order_dir = direction
        new_ref._limit_n = self._limit_n
        return new_ref

    def limit(self, n):
        new_ref = FakeCollectionRef(self.name, self._store)
        new_ref._doc_refs = self._doc_refs
        new_ref._filters = list(self._filters)
        new_ref._order_field = self._order_field
        new_ref._order_dir = self._order_dir
        new_ref._limit_n = n
        return new_ref

    def stream(self):
        results = []
        for doc_id, data in list(self._store.items()):
            match = True
            for field, op, val in self._filters:
                if op == "==" and data.get(field) != val:
                    match = False
                    break
            if match:
                results.append(FakeDoc(doc_id, data, exists=True))

        if self._order_field:
            reverse = (self._order_dir == "DESCENDING")
            results.sort(key=lambda d: d.to_dict().get(self._order_field, ""), reverse=reverse)

        if self._limit_n is not None:
            results = results[:self._limit_n]
        return results


class FakeFirestoreDB:
    def __init__(self):
        self._root_collections = {}

    def collection(self, name):
        if name not in self._root_collections:
            self._root_collections[name] = FakeCollectionRef(name, {})
        return self._root_collections[name]


MOCK_TOKENS = {
    "admin-token-org-a": {
        "uid": "admin-uid-a",
        "email": "admin@org-a.com",
        "orgId": "org-a",
        "role": "admin",
        "name": "Org A Admin",
    },
    "user-token-org-a": {
        "uid": "user-uid-a",
        "email": "user@org-a.com",
        "orgId": "org-a",
        "role": "user",
        "name": "Org A User",
    },
    "admin-token-org-b": {
        "uid": "admin-uid-b",
        "email": "admin@org-b.com",
        "orgId": "org-b",
        "role": "admin",
        "name": "Org B Admin",
    },
    "user-token-org-b": {
        "uid": "user-uid-b",
        "email": "user@org-b.com",
        "orgId": "org-b",
        "role": "user",
        "name": "Org B User",
    },
    "token-no-claims": {
        "uid": "uid-no-claims",
        "email": "noclaims@example.com",
    },
    "token-invalid-role": {
        "uid": "uid-bad-role",
        "email": "badrole@example.com",
        "orgId": "org-a",
        "role": "superman",
    },
}


class MockFirebaseAuth:
    def verify_id_token(self, token: str):
        if token in MOCK_TOKENS:
            return MOCK_TOKENS[token]
        raise ValueError("Invalid authentication token")

    def get_user_by_email(self, email: str):
        mock_user = MagicMock()
        mock_user.uid = f"uid-{email.split('@')[0]}"
        return mock_user

    def create_user(self, **kwargs):
        mock_user = MagicMock()
        email = kwargs.get("email", "newuser@test.com")
        mock_user.uid = f"uid-{email.split('@')[0]}"
        return mock_user

    def set_custom_user_claims(self, uid: str, claims: dict):
        pass


import app.api.admin.policies as admin_policies_module
import app.api.admin.members as admin_members_module
import app.api.admin.audit as admin_audit_module
import app.api.user.policies as user_policies_module
import app.api.user.acknowledgements as user_acks_module
import app.api.admin.project_facts as project_facts_api_module
import app.api.admin.policy_generation as policy_generation_api_module
import firebase_admin.firestore
import firebase_admin.auth


@pytest.fixture(autouse=True)
def mock_backend_services(monkeypatch):
    fake_db = FakeFirestoreDB()
    mock_auth = MockFirebaseAuth()

    # Monkeypatch low-level firebase_admin
    monkeypatch.setattr(firebase_admin.firestore, "client", lambda *a, **k: fake_db)
    monkeypatch.setattr(firebase_admin.auth, "verify_id_token", mock_auth.verify_id_token)
    monkeypatch.setattr(firebase_admin.auth, "get_user_by_email", mock_auth.get_user_by_email)
    monkeypatch.setattr(firebase_admin.auth, "create_user", mock_auth.create_user)
    monkeypatch.setattr(firebase_admin.auth, "set_custom_user_claims", mock_auth.set_custom_user_claims)

    # Monkeypatch app.auth.firebase
    monkeypatch.setattr(firebase_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(firebase_module, "get_auth", lambda: mock_auth)
    monkeypatch.setattr(deps_module, "get_auth", lambda: mock_auth)

    # Monkeypatch in repo modules
    monkeypatch.setattr(member_repo_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(policy_repo_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(ack_repo_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(project_facts_repo_module, "get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(audit_logger_module, "get_firestore_client", lambda: fake_db)

    # Instantiate repositories backed by fake_db
    test_member_repo = member_repo_module.MemberRepository(fake_db)
    test_policy_repo = policy_repo_module.PolicyRepository(fake_db)
    test_ack_repo = ack_repo_module.AcknowledgementRepository(fake_db)
    test_facts_repo = project_facts_repo_module.ProjectFactsRepository(fake_db)

    # Inject into API router modules
    admin_policies_module.policy_repo = test_policy_repo
    user_policies_module.policy_repo = test_policy_repo
    user_policies_module.ack_repo = test_ack_repo
    admin_members_module.member_repo = test_member_repo
    user_acks_module.ack_repo = test_ack_repo
    project_facts_api_module.facts_repo = test_facts_repo
    policy_generation_api_module.facts_repo = test_facts_repo
    policy_generation_api_module.policy_repo = test_policy_repo

    yield fake_db


@pytest.fixture
def client():
    return TestClient(app)
