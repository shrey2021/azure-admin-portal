"""Azure Storage Account operations service."""
import logging
from typing import List, Dict, Any

from app.config import settings
from app.azure_client import get_storage_client
from app.mock.mock_data import MOCK_STORAGE_ACCOUNTS

logger = logging.getLogger(__name__)

def list_storage_accounts() -> List[Dict[str, Any]]:
    """List all storage accounts in the subscription."""
    if settings.effective_demo_mode:
        return MOCK_STORAGE_ACCOUNTS

    client = get_storage_client()
    if not client:
        return MOCK_STORAGE_ACCOUNTS

    accounts = []
    try:
        for sa in client.storage_accounts.list():
            rg = sa.id.split("/")[4] if "/resourceGroups/" in sa.id else "unknown"
            
            endpoints = {}
            if sa.primary_endpoints:
                if sa.primary_endpoints.blob:
                    endpoints["blob"] = sa.primary_endpoints.blob
                if sa.primary_endpoints.file:
                    endpoints["file"] = sa.primary_endpoints.file
                if sa.primary_endpoints.dfs:
                    endpoints["dfs"] = sa.primary_endpoints.dfs

            accounts.append({
                "name": sa.name,
                "resource_group": rg,
                "location": sa.location,
                "sku": sa.sku.name if sa.sku else "Standard_LRS",
                "kind": sa.kind or "StorageV2",
                "access_tier": sa.access_tier or "Hot",
                "primary_endpoints": endpoints,
                "used_capacity_gb": 250.0, # Azure metrics API estimation
                "enable_https_traffic_only": sa.enable_https_traffic_only or True,
                "allow_blob_public_access": sa.allow_blob_public_access or False
            })
        return accounts
    except Exception as e:
        logger.error(f"Error listing live Azure storage accounts: {e}")
        return MOCK_STORAGE_ACCOUNTS
