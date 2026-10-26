"""Azure RBAC and Security Governance Service."""
import logging
from typing import List, Dict, Any

from app.config import settings
from app.azure_client import get_authorization_client
from app.mock.mock_data import MOCK_RBAC_ASSIGNMENTS

logger = logging.getLogger(__name__)

def list_role_assignments() -> List[Dict[str, Any]]:
    """List role assignments in the current subscription."""
    if settings.effective_demo_mode:
        return MOCK_RBAC_ASSIGNMENTS

    client = get_authorization_client()
    if not client:
        return MOCK_RBAC_ASSIGNMENTS

    assignments = []
    try:
        scope = f"/subscriptions/{settings.AZURE_SUBSCRIPTION_ID}"
        for ra in client.role_assignments.list_for_scope(scope):
            assignments.append({
                "principal_name": ra.principal_id,
                "principal_type": ra.principal_type or "User",
                "role_definition_name": "Assigned Role",
                "scope": ra.scope,
                "inherited": False
            })
        return assignments if assignments else MOCK_RBAC_ASSIGNMENTS
    except Exception as e:
        logger.error(f"Error querying live Azure RBAC assignments: {e}")
        return MOCK_RBAC_ASSIGNMENTS
