from datetime import datetime, timezone
from typing import Dict

from app.auth.firebase import get_firestore_client
from app.models.project_facts import (
    PROJECT_FACT_FIELDS,
    ProjectFactInput,
    ProjectFacts,
    new_fact_value,
)


class ProjectFactsRepository:
    def __init__(self, db=None):
        self._db = db

    def _get_db(self):
        return self._db if self._db is not None else get_firestore_client()

    def _document(self, org_id: str):
        return (
            self._get_db()
            .collection("organizations")
            .document(org_id)
            .collection("projectFacts")
            .document("current")
        )

    def get(self, org_id: str) -> ProjectFacts:
        snapshot = self._document(org_id).get()
        if not snapshot.exists:
            empty_facts = ProjectFacts()
            self._document(org_id).set(empty_facts.model_dump())
            return empty_facts
        data = snapshot.to_dict()
        data["id"] = snapshot.id
        return ProjectFacts(**data)

    def save(
        self,
        org_id: str,
        fields: Dict[str, ProjectFactInput],
        updated_by: str,
    ) -> ProjectFacts:
        unknown_fields = set(fields) - PROJECT_FACT_FIELDS
        if unknown_fields:
            raise ValueError(f"Unknown project fact fields: {', '.join(sorted(unknown_fields))}")

        document = self._document(org_id)
        snapshot = document.get()
        existing = snapshot.to_dict() if snapshot.exists else {}
        facts = dict(existing.get("facts", {}))
        for key, fact in fields.items():
            facts[key] = new_fact_value(fact.value, fact.evidence)

        now = datetime.now(timezone.utc).isoformat()
        document.set({
            "id": "current",
            "version": int(existing.get("version", 0)) + 1,
            "facts": facts,
            "updated_at": now,
            "updated_by": updated_by,
        })
        return self.get(org_id)