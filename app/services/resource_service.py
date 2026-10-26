"""Azure Resource Groups and Resource Inventory Service."""
import logging
from typing import List, Dict, Any

from app.config import settings
from app.azure_client import get_resource_client
from app.mock.mock_data import MOCK_RESOURCE_GROUPS, mock_add_resource_group

logger = logging.getLogger(__name__)

def list_resource_groups() -> List[Dict[str, Any]]:
    """List all resource groups in the subscription."""
    if settings.effective_demo_mode:
        return MOCK_RESOURCE_GROUPS

    client = get_resource_client()
    if not client:
        return MOCK_RESOURCE_GROUPS

    rgs = []
    try:
        for rg in client.resource_groups.list():
            # Get resource count in this resource group
            count = 0
            try:
                resources = list(client.resources.list_by_resource_group(rg.name))
                count = len(resources)
            except Exception:
                pass

            rgs.append({
                "id": rg.id,
                "name": rg.name,
                "location": rg.location,
                "provisioning_state": rg.properties.provisioning_state if rg.properties else "Succeeded",
                "tags": rg.tags or {},
                "resource_count": count
            })
        return rgs
    except Exception as e:
        logger.error(f"Error listing live Azure resource groups: {e}")
        return MOCK_RESOURCE_GROUPS

def create_resource_group(name: str, location: str, tags: Dict[str, str] = None) -> Dict[str, Any]:
    """Create a new Resource Group in the specified location."""
    tags = tags or {"CreatedBy": "AzureAdminPortal"}
    
    if settings.effective_demo_mode:
        created = mock_add_resource_group(name, location, tags)
        return {
            "success": True,
            "message": f"Resource group '{name}' created successfully (Demo Mode)",
            "resource_group": created
        }

    client = get_resource_client()
    if not client:
        return {"success": False, "message": "Azure Resource client not available. Verify credentials."}

    try:
        rg_params = {"location": location, "tags": tags}
        result = client.resource_groups.create_or_update(name, rg_params)
        return {
            "success": True,
            "message": f"Resource group '{name}' created in '{location}' on Azure.",
            "resource_group": {
                "id": result.id,
                "name": result.name,
                "location": result.location,
                "provisioning_state": result.properties.provisioning_state if result.properties else "Succeeded",
                "tags": result.tags or {},
                "resource_count": 0
            }
        }
    except Exception as e:
        logger.error(f"Error creating resource group {name}: {e}")
        return {"success": False, "message": f"Azure operation failed: {str(e)}"}
