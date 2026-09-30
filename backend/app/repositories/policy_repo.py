import uuid
from datetime import datetime, timezone
from typing import List, Optional
from app.auth.firebase import get_firestore_client
from app.models.policy import (
    Policy,
    PolicyStatus,
    PolicyType,
    PolicyVersion,
    PolicySource,
    PolicyVersionStatus,
)


class PolicyRepository:
    def __init__(self, db=None):
        self._db = db

    def _get_db(self):
        if self._db is not None:
            return self._db
        return get_firestore_client()

    def _policies_collection(self, org_id: str):
        return self._get_db().collection("organizations").document(org_id).collection("policies")

    def _versions_collection(self, org_id: str, policy_id: str):
        return self._policies_collection(org_id).document(policy_id).collection("versions")

    def list_policies(
        self, org_id: str, status: Optional[PolicyStatus] = None
    ) -> List[Policy]:
        query = self._policies_collection(org_id)
        if status:
            status_val = status.value if hasattr(status, "value") else str(status)
            query = query.where("status", "==", status_val)
        
        docs = query.stream()
        policies = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            policies.append(Policy(**data))
        # Sort by name
        policies.sort(key=lambda p: p.name)
        return policies

    def get_policy(self, org_id: str, policy_id: str) -> Optional[Policy]:
        doc = self._policies_collection(org_id).document(policy_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        
        policy = Policy(**data)
        # Fetch latest version
        latest_ver_doc = (
            self._versions_collection(org_id, policy_id)
            .document(f"v{policy.current_version}")
            .get()
        )
        if latest_ver_doc.exists:
            v_data = latest_ver_doc.to_dict()
            v_data["id"] = latest_ver_doc.id
            policy.latest_version = PolicyVersion(**v_data)
            
        return policy

    def create_policy(
        self,
        org_id: str,
        name: str,
        policy_type: PolicyType,
        owner: Optional[str],
        content: str,
        created_by_uid: str,
        created_by_email: Optional[str] = None,
        change_note: str = "Initial draft",
        status: PolicyStatus = PolicyStatus.DRAFT,
        next_review: Optional[str] = None,
        custom_policy_id: Optional[str] = None,
    ) -> Policy:
        policy_id = custom_policy_id or f"pol_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        version_data = {
            "id": "v1",
            "policy_id": policy_id,
            "version_number": 1,
            "content": content,
            "change_note": change_note,
            "source": PolicySource.MANUAL.value,
            "created_by": created_by_uid,
            "created_by_email": created_by_email,
            "created_at": now,
        }
        
        policy_data = {
            "name": name,
            "type": policy_type.value if hasattr(policy_type, "value") else str(policy_type),
            "owner": owner,
            "status": status.value if hasattr(status, "value") else str(status),
            "current_version": 1,
            "last_reviewed": now if status == PolicyStatus.PUBLISHED else None,
            "next_review": next_review,
            "created_at": now,
            "updated_at": now,
        }
        
        # Write policy document
        self._policies_collection(org_id).document(policy_id).set(policy_data)
        # Write version document
        self._versions_collection(org_id, policy_id).document("v1").set(version_data)
        
        policy_data["id"] = policy_id
        created_policy = Policy(**policy_data)
        created_policy.latest_version = PolicyVersion(**version_data)
        return created_policy

    def update_policy(
        self,
        org_id: str,
        policy_id: str,
        name: Optional[str] = None,
        policy_type: Optional[PolicyType] = None,
        owner: Optional[str] = None,
        content: Optional[str] = None,
        change_note: Optional[str] = None,
        updated_by_uid: Optional[str] = None,
        updated_by_email: Optional[str] = None,
        next_review: Optional[str] = None,
    ) -> Optional[Policy]:
        policy_ref = self._policies_collection(org_id).document(policy_id)
        doc = policy_ref.get()
        if not doc.exists:
            return None
        
        existing = doc.to_dict()
        now = datetime.now(timezone.utc).isoformat()
        update_fields = {"updated_at": now}
        
        if name is not None:
            update_fields["name"] = name
        if policy_type is not None:
            update_fields["type"] = policy_type.value if hasattr(policy_type, "value") else str(policy_type)
        if owner is not None:
            update_fields["owner"] = owner
        if next_review is not None:
            update_fields["next_review"] = next_review

        # If content changed, create new version
        new_version_obj = None
        if content is not None:
            new_version_num = existing.get("current_version", 1) + 1
            version_id = f"v{new_version_num}"
            version_data = {
                "id": version_id,
                "policy_id": policy_id,
                "version_number": new_version_num,
                "content": content,
                "change_note": change_note or f"Updated to version {new_version_num}",
                "source": PolicySource.MANUAL.value,
                "created_by": updated_by_uid or "system",
                "created_by_email": updated_by_email,
                "created_at": now,
            }
            self._versions_collection(org_id, policy_id).document(version_id).set(version_data)
            update_fields["current_version"] = new_version_num
            new_version_obj = PolicyVersion(**version_data)

        policy_ref.update(update_fields)
        return self.get_policy(org_id, policy_id)

    def update_policy_status(
        self,
        org_id: str,
        policy_id: str,
        new_status: PolicyStatus,
        actor_uid: Optional[str] = None,
        actor_email: Optional[str] = None,
    ) -> Optional[Policy]:
        policy_ref = self._policies_collection(org_id).document(policy_id)
        doc = policy_ref.get()
        if not doc.exists:
            return None
        
        now = datetime.now(timezone.utc).isoformat()
        status_val = new_status.value if hasattr(new_status, "value") else str(new_status)
        update_fields = {
            "status": status_val,
            "updated_at": now,
        }
        if new_status in [PolicyStatus.APPROVED, PolicyStatus.PUBLISHED]:
            update_fields["last_reviewed"] = now

        policy_ref.update(update_fields)
        current_version = doc.to_dict().get("current_version", 1)
        version_fields = {
            "status": new_status.value,
            "updated_at": now,
        }
        if new_status == PolicyStatus.APPROVED:
            version_fields.update({
                "approved_by": actor_uid,
                "approved_by_email": actor_email,
                "approved_at": now,
            })
        elif new_status in (PolicyStatus.DRAFT, PolicyStatus.IN_REVIEW):
            version_fields.update({
                "approved_by": None,
                "approved_by_email": None,
                "approved_at": None,
            })
        self._versions_collection(org_id, policy_id).document(f"v{current_version}").update(version_fields)
        return self.get_policy(org_id, policy_id)

    def list_versions(self, org_id: str, policy_id: str) -> List[PolicyVersion]:
        docs = (
            self._versions_collection(org_id, policy_id)
            .order_by("version_number", direction="DESCENDING")
            .stream()
        )
        versions = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            versions.append(PolicyVersion(**data))
        return versions

    def create_draft_version(
        self,
        org_id: str,
        policy_id: str,
        content: str,
        created_by_uid: str,
        created_by_email: Optional[str],
        change_note: str,
        source: PolicySource = PolicySource.MANUAL,
        model_name: Optional[str] = None,
        fact_sheet_version: Optional[int] = None,
        fact_sources: Optional[list] = None,
        derived_from_version: Optional[int] = None,
    ) -> Optional[PolicyVersion]:
        policy_ref = self._policies_collection(org_id).document(policy_id)
        policy_doc = policy_ref.get()
        if not policy_doc.exists:
            return None

        versions = self.list_versions(org_id, policy_id)
        version_number = max((version.version_number for version in versions), default=0) + 1
        version_id = f"v{version_number}"
        now = datetime.now(timezone.utc).isoformat()
        version_data = {
            "id": version_id,
            "policy_id": policy_id,
            "version_number": version_number,
            "content": content,
            "change_note": change_note,
            "source": source.value,
            "created_by": created_by_uid,
            "created_by_email": created_by_email,
            "created_at": now,
            "status": PolicyVersionStatus.DRAFT.value,
            "model_name": model_name,
            "fact_sheet_version": fact_sheet_version,
            "fact_sources": fact_sources or [],
            "derived_from_version": derived_from_version,
        }
        self._versions_collection(org_id, policy_id).document(version_id).set(version_data)
        policy_ref.update({"draft_version": version_number, "updated_at": now})
        return PolicyVersion(**version_data)

    def transition_draft_version(
        self,
        org_id: str,
        policy_id: str,
        version_number: int,
        new_status: PolicyVersionStatus,
        actor_uid: str,
        actor_email: str,
    ) -> Optional[PolicyVersion]:
        version_ref = self._versions_collection(org_id, policy_id).document(f"v{version_number}")
        version_doc = version_ref.get()
        if not version_doc.exists:
            return None

        now = datetime.now(timezone.utc).isoformat()
        update_fields = {"status": new_status.value}
        if new_status == PolicyVersionStatus.APPROVED:
            update_fields.update({
                "approved_by": actor_uid,
                "approved_by_email": actor_email,
                "approved_at": now,
            })
        elif new_status == PolicyVersionStatus.DRAFT:
            update_fields.update({
                "approved_by": None,
                "approved_by_email": None,
                "approved_at": None,
            })
        version_ref.update(update_fields)

        policy_ref = self._policies_collection(org_id).document(policy_id)
        if new_status == PolicyVersionStatus.PUBLISHED:
            policy_ref.update({
                "current_version": version_number,
                "draft_version": None,
                "status": PolicyStatus.PUBLISHED.value,
                "last_reviewed": now,
                "updated_at": now,
            })
        elif new_status == PolicyVersionStatus.DISCARDED:
            policy_doc = policy_ref.get()
            if policy_doc.exists and policy_doc.to_dict().get("draft_version") == version_number:
                policy_ref.update({"draft_version": None, "updated_at": now})

        updated = version_ref.get()
        data = updated.to_dict()
        data["id"] = updated.id
        return PolicyVersion(**data)

    def get_version(
        self, org_id: str, policy_id: str, version_number: int
    ) -> Optional[PolicyVersion]:
        doc = (
            self._versions_collection(org_id, policy_id)
            .document(f"v{version_number}")
            .get()
        )
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return PolicyVersion(**data)
