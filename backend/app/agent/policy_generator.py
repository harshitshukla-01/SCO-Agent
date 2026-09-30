import json
from pathlib import Path
from typing import List, Tuple

from app.config import get_settings
from app.models.project_facts import ProjectFacts


TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "doc_generation" / "templates"
TEMPLATE_BY_POLICY_ID = {
    "pol-human-resource-security-policy": "human_resource_security.md",
    "pol-code-of-conduct": "code_of_conduct.md",
    "pol-third-party-management-policy": "third_party_management.md",
    "pol-risk-management-policy": "risk_management.md",
    "pol-asset-management-policy": "asset_management.md",
    "pol-data-management-policy": "data_management.md",
    "pol-cryptography-policy": "cryptography.md",
    "pol-secure-development-policy": "secure_development.md",
    "pol-access-control-policy": "access_control.md",
    "pol-business-continuity-and-disaster-recovery-plan": "business_continuity.md",
    "pol-operations-security-policy": "operations_security.md",
    "pol-physical-security-policy": "physical_security.md",
    "pol-information-security-roles-and-responsibilities": "information_security_roles.md",
    "pol-information-security-policy-aup": "information_security_aup.md",
    "pol-incident-response-plan": "incident_response.md",
}

RELEVANT_FACTS = {
    "pol-human-resource-security-policy": ["company_name", "work_model", "incident_contact"],
    "pol-code-of-conduct": ["company_name", "work_model", "customer_type", "incident_contact"],
    "pol-third-party-management-policy": ["company_name", "data_types", "hosting_provider", "customer_type"],
    "pol-risk-management-policy": ["company_name", "data_types", "hosting_provider", "customer_type", "incident_contact"],
    "pol-asset-management-policy": ["company_name", "work_model", "hosting_provider", "data_types"],
    "pol-data-management-policy": ["company_name", "data_types", "customer_type", "retention_practices", "hosting_provider"],
    "pol-cryptography-policy": ["company_name", "data_types", "hosting_provider", "retention_practices"],
    "pol-secure-development-policy": ["company_name", "hosting_provider", "data_types", "work_model"],
    "pol-access-control-policy": ["company_name", "work_model", "data_types", "hosting_provider", "customer_type"],
    "pol-business-continuity-and-disaster-recovery-plan": ["company_name", "hosting_provider", "work_model", "incident_contact", "data_types"],
    "pol-operations-security-policy": ["company_name", "hosting_provider", "data_types", "retention_practices"],
    "pol-physical-security-policy": ["company_name", "work_model", "hosting_provider"],
    "pol-information-security-roles-and-responsibilities": ["company_name", "work_model", "incident_contact"],
    "pol-information-security-policy-aup": ["company_name", "work_model", "data_types", "customer_type"],
    "pol-incident-response-plan": ["company_name", "data_types", "hosting_provider", "incident_contact", "customer_type"],
}

DISCLAIMER = (
    "AI-generated draft. Review by a qualified person required before use. "
    "This tool does not certify compliance."
)


def load_template(policy_id: str, policy_name: str, policy_type: str) -> str:
    template_name = TEMPLATE_BY_POLICY_ID.get(policy_id)
    if template_name:
        return (TEMPLATE_DIR / template_name).read_text(encoding="utf-8")
    return f"""# {policy_name}

## Purpose and scope
Define the objective and people, systems, and information covered.

## Roles and responsibilities
Assign accountable owners and approval responsibilities.

## Policy requirements
Describe practical, reviewable requirements appropriate to this {policy_type} policy.

## Exceptions and review
Define exception approval, records, and review cadence.
"""


def relevant_fact_sources(policy_id: str, facts: ProjectFacts) -> List[dict]:
    field_names = RELEVANT_FACTS.get(policy_id, list(facts.facts))
    sources = []
    for field_name in field_names:
        fact = facts.facts.get(field_name)
        if fact is None or fact.value in (None, "", []):
            continue
        sources.append({
            "field": field_name,
            "value": fact.value,
            "source": fact.source.value,
            "evidence": fact.evidence,
            "updated_at": fact.updated_at,
        })
    return sources


def build_generation_prompt(policy_name: str, template: str, fact_sources: List[dict]) -> str:
    fact_payload = json.dumps(fact_sources, ensure_ascii=False, indent=2)
    return f"""You draft internal security policy text for an organization. Return Markdown body only, with no preamble or code fence.

Policy name: {policy_name}

Use this section structure and cover every section:
{template}

Only use these project facts for organization-specific statements. Each fact has a stable field name, source, and evidence. At the end of each sentence that relies on an organization-specific fact, add a concise trace marker such as [Fact: hosting_provider]. Do not state a fact absent from this input. For missing organization-specific details, write [TO CONFIRM: <specific missing detail>] rather than guessing. Treat facts as supplied context, not proof of a control being implemented.

Write plain, actionable policy language. Do not claim legal compliance, certification, audit readiness, or that a control is already implemented unless a supplied fact explicitly supports it. Separate requirements the organization adopts from verified facts. Preserve all headings and replace template guidance with useful draft policy content. Do not include a preamble.

Project facts (the complete allowed fact set):
{fact_payload}

Required footer text:
{DISCLAIMER}
"""


def generate_policy_content(
    policy_name: str,
    policy_id: str,
    policy_type: str,
    facts: ProjectFacts,
) -> Tuple[str, str, List[dict]]:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY in the backend environment.")

    from google import genai

    fact_sources = relevant_fact_sources(policy_id, facts)
    template = load_template(policy_id, policy_name, policy_type)
    prompt = build_generation_prompt(policy_name, template, fact_sources)
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )
    content = (response.text or "").strip()
    if not content:
        raise RuntimeError("Gemini returned an empty policy draft.")
    return content, settings.GEMINI_MODEL, fact_sources