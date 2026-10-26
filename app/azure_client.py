"""Azure SDK Client Manager with graceful fallback to mock mode."""
import logging
from typing import Optional, Tuple, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)

# Flags and cached clients
_CREDENTIAL = None
_COMPUTE_CLIENT = None
_RESOURCE_CLIENT = None
_STORAGE_CLIENT = None
_COST_CLIENT = None
_AUTH_CLIENT = None

def get_credential():
    """Obtain Azure credential via Service Principal or DefaultAzureCredential."""
    global _CREDENTIAL
    if _CREDENTIAL is not None:
        return _CREDENTIAL

    try:
        from azure.identity import ClientSecretCredential, DefaultAzureCredential
        
        if settings.has_azure_credentials:
            _CREDENTIAL = ClientSecretCredential(
                tenant_id=settings.AZURE_TENANT_ID,
                client_id=settings.AZURE_CLIENT_ID,
                client_secret=settings.AZURE_CLIENT_SECRET
            )
            logger.info("Initialized ClientSecretCredential for Azure")
        else:
            _CREDENTIAL = DefaultAzureCredential()
            logger.info("Initialized DefaultAzureCredential for Azure")
        return _CREDENTIAL
    except Exception as e:
        logger.warning(f"Could not initialize Azure credential: {e}")
        return None

def get_resource_client():
    """Return ResourceManagementClient or None."""
    global _RESOURCE_CLIENT
    if settings.effective_demo_mode:
        return None
    if _RESOURCE_CLIENT is not None:
        return _RESOURCE_CLIENT
    try:
        from azure.mgmt.resource import ResourceManagementClient
        cred = get_credential()
        if cred and settings.AZURE_SUBSCRIPTION_ID:
            _RESOURCE_CLIENT = ResourceManagementClient(cred, settings.AZURE_SUBSCRIPTION_ID)
            return _RESOURCE_CLIENT
    except Exception as e:
        logger.error(f"Failed to create ResourceManagementClient: {e}")
    return None

def get_compute_client():
    """Return ComputeManagementClient or None."""
    global _COMPUTE_CLIENT
    if settings.effective_demo_mode:
        return None
    if _COMPUTE_CLIENT is not None:
        return _COMPUTE_CLIENT
    try:
        from azure.mgmt.compute import ComputeManagementClient
        cred = get_credential()
        if cred and settings.AZURE_SUBSCRIPTION_ID:
            _COMPUTE_CLIENT = ComputeManagementClient(cred, settings.AZURE_SUBSCRIPTION_ID)
            return _COMPUTE_CLIENT
    except Exception as e:
        logger.error(f"Failed to create ComputeManagementClient: {e}")
    return None

def get_storage_client():
    """Return StorageManagementClient or None."""
    global _STORAGE_CLIENT
    if settings.effective_demo_mode:
        return None
    if _STORAGE_CLIENT is not None:
        return _STORAGE_CLIENT
    try:
        from azure.mgmt.storage import StorageManagementClient
        cred = get_credential()
        if cred and settings.AZURE_SUBSCRIPTION_ID:
            _STORAGE_CLIENT = StorageManagementClient(cred, settings.AZURE_SUBSCRIPTION_ID)
            return _STORAGE_CLIENT
    except Exception as e:
        logger.error(f"Failed to create StorageManagementClient: {e}")
    return None

def get_authorization_client():
    """Return AuthorizationManagementClient or None."""
    global _AUTH_CLIENT
    if settings.effective_demo_mode:
        return None
    if _AUTH_CLIENT is not None:
        return _AUTH_CLIENT
    try:
        from azure.mgmt.authorization import AuthorizationManagementClient
        cred = get_credential()
        if cred and settings.AZURE_SUBSCRIPTION_ID:
            _AUTH_CLIENT = AuthorizationManagementClient(cred, settings.AZURE_SUBSCRIPTION_ID)
            return _AUTH_CLIENT
    except Exception as e:
        logger.error(f"Failed to create AuthorizationManagementClient: {e}")
    return None

def test_azure_connection() -> Dict[str, Any]:
    """Test connection to Azure or return current mode status."""
    if settings.effective_demo_mode:
        return {
            "connected": True,
            "mode": "Demo / Sandbox Mode",
            "subscription_id": "9a3f124c-e87b-4921-b4f0-8c6328e1d51a",
            "subscription_name": "Production-Enterprise-Sub-01 (Simulated)",
            "message": "Running in Demo Mode with realistic simulated data. Set Azure credentials in .env to connect to live Azure."
        }
    
    try:
        rc = get_resource_client()
        if rc is None:
            return {
                "connected": False,
                "mode": "Live Mode (Config Error)",
                "message": "Azure Resource Client could not be initialized. Check credentials in .env."
            }
        
        # Test an actual quick list call
        rgs = list(rc.resource_groups.list(top=1))
        return {
            "connected": True,
            "mode": "Live Azure Connected",
            "subscription_id": settings.AZURE_SUBSCRIPTION_ID,
            "message": f"Successfully connected to Azure Subscription {settings.AZURE_SUBSCRIPTION_ID}"
        }
    except Exception as e:
        return {
            "connected": False,
            "mode": "Live Mode (Connection Failed)",
            "message": f"Failed connecting to Azure: {str(e)}"
        }
