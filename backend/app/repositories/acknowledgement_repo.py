import uuid
from datetime import datetime, timezone
from typing import List, Optional
from app.auth.firebase import get_firestore_client
from app.models.acknowledgement import Acknowledgement


class AcknowledgementRepository:
    def __init__(self, db=None):
        self._db = db

    def _get_db(self):
        if self._db is not None:
            return self._db
        return get_firestore_client()

    def _ack_collection(self, org_id: str):
        return self._get_db().collection("organizations").document(org_id).collection("acknowledgements")

    def create_acknowledgement(
        self,
        org_id: str,
        policy_id: str,
        policy_name: str,
        version: int,
        uid: str,
        user_email: str,
        user_name: Optional[str] = None,
    ) -> Acknowledgement:
        ack_id = f"ack_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        ack_data = {
            "id": ack_id,
            "policy_id": policy_id,
            "policy_name": policy_name,
            "version": version,
            "uid": uid,
            "user_email": user_email,
            "user_name": user_name,
            "timestamp": now,
        }
        
        self._ack_collection(org_id).document(ack_id).set(ack_data)
        return Acknowledgement(**ack_data)

    def list_user_acknowledgements(self, org_id: str, uid: str) -> List[Acknowledgement]:
        docs = self._ack_collection(org_id).where("uid", "==", uid).stream()
        acks = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            acks.append(Acknowledgement(**data))
        acks.sort(key=lambda a: a.timestamp, reverse=True)
        return acks

    def list_policy_acknowledgements(self, org_id: str, policy_id: str) -> List[Acknowledgement]:
        docs = self._ack_collection(org_id).where("policy_id", "==", policy_id).stream()
        acks = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            acks.append(Acknowledgement(**data))
        acks.sort(key=lambda a: a.timestamp, reverse=True)
        return acks

    def get_user_policy_acknowledgement(
        self, org_id: str, uid: str, policy_id: str, version: int
    ) -> Optional[Acknowledgement]:
        docs = (
            self._ack_collection(org_id)
            .where("uid", "==", uid)
            .where("policy_id", "==", policy_id)
            .where("version", "==", version)
            .limit(1)
            .stream()
        )
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return Acknowledgement(**data)
        return None
