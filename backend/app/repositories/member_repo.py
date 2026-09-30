from datetime import datetime, timezone
from typing import List, Optional
from app.auth.firebase import get_firestore_client
from app.models.member import Member, RoleEnum


class MemberRepository:
    def __init__(self, db=None):
        self._db = db

    def _get_db(self):
        if self._db is not None:
            return self._db
        return get_firestore_client()

    def _members_collection(self, org_id: str):
        return self._get_db().collection("organizations").document(org_id).collection("members")

    def list_members(self, org_id: str) -> List[Member]:
        docs = self._members_collection(org_id).stream()
        members = []
        for doc in docs:
            data = doc.to_dict()
            data["uid"] = doc.id
            members.append(Member(**data))
        return members

    def get_member(self, org_id: str, uid: str) -> Optional[Member]:
        doc = self._members_collection(org_id).document(uid).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["uid"] = doc.id
        return Member(**data)

    def create_member(self, org_id: str, uid: str, name: str, email: str, role: RoleEnum) -> Member:
        now = datetime.now(timezone.utc).isoformat()
        member_data = {
            "name": name,
            "email": email,
            "role": role.value if hasattr(role, "value") else str(role),
            "created_at": now,
            "updated_at": now,
        }
        self._members_collection(org_id).document(uid).set(member_data)
        member_data["uid"] = uid
        return Member(**member_data)

    def update_member_role(self, org_id: str, uid: str, role: RoleEnum) -> Optional[Member]:
        doc_ref = self._members_collection(org_id).document(uid)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        now = datetime.now(timezone.utc).isoformat()
        doc_ref.update({
            "role": role.value if hasattr(role, "value") else str(role),
            "updated_at": now,
        })
        updated_doc = doc_ref.get()
        data = updated_doc.to_dict()
        data["uid"] = uid
        return Member(**data)
