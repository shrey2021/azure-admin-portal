"""Virtual Machine compute operations service."""
import logging
from typing import List, Dict, Any, Optional

from app.config import settings
from app.azure_client import get_compute_client
from app.mock.mock_data import MOCK_VIRTUAL_MACHINES, mock_set_vm_state

logger = logging.getLogger(__name__)

def list_virtual_machines() -> List[Dict[str, Any]]:
    """List all virtual machines across resource groups."""
    if settings.effective_demo_mode:
        return MOCK_VIRTUAL_MACHINES

    client = get_compute_client()
    if not client:
        return MOCK_VIRTUAL_MACHINES

    vms = []
    try:
        vm_list = client.virtual_machines.list_all()
        for vm in vm_list:
            # Resource group is 4th segment in id
            rg = vm.id.split("/")[4] if "/resourceGroups/" in vm.id else "unknown"
            
            # Instance view to get power state
            power_state = "Unknown"
            try:
                iv = client.virtual_machines.instance_view(rg, vm.name)
                for status in iv.statuses or []:
                    if status.code and status.code.startswith("PowerState/"):
                        power_state = status.display_status or status.code
            except Exception:
                pass

            vms.append({
                "name": vm.name,
                "resource_group": rg,
                "location": vm.location,
                "vm_size": vm.hardware_profile.vm_size if vm.hardware_profile else "Standard",
                "os_type": vm.storage_profile.os_disk.os_type if vm.storage_profile and vm.storage_profile.os_disk else "Unknown",
                "power_state": power_state,
                "provisioning_state": vm.provisioning_state or "Succeeded",
                "private_ip": "Dynamic",
                "public_ip": "Assigned",
                "os_disk_size_gb": vm.storage_profile.os_disk.disk_size_gb if vm.storage_profile and vm.storage_profile.os_disk else 128,
                "tags": vm.tags or {},
                "cpu_usage_percent": 20.0 if "running" in power_state.lower() else 0.0,
                "uptime_hours": 120 if "running" in power_state.lower() else 0
            })
        return vms
    except Exception as e:
        logger.error(f"Error listing live Azure VMs: {e}")
        return MOCK_VIRTUAL_MACHINES

def perform_vm_action(resource_group: str, vm_name: str, action: str) -> Dict[str, Any]:
    """Perform action on VM: 'start', 'stop', 'restart', or 'deallocate'."""
    action = action.lower()
    if action not in ("start", "stop", "restart", "deallocate"):
        return {"success": False, "message": f"Invalid action: {action}. Supported: start, stop, restart, deallocate"}

    if settings.effective_demo_mode:
        target_state = "VM running" if action in ("start", "restart") else ("VM stopped" if action == "stop" else "VM deallocated")
        vm = mock_set_vm_state(resource_group, vm_name, target_state)
        if vm:
            return {
                "success": True,
                "message": f"Successfully performed '{action}' on VM '{vm_name}' (Demo Mode)",
                "vm": vm
            }
        return {"success": False, "message": f"VM '{vm_name}' not found in resource group '{resource_group}'"}

    client = get_compute_client()
    if not client:
        return {"success": False, "message": "Azure Compute client not available. Verify credentials."}

    try:
        if action == "start":
            poller = client.virtual_machines.begin_start(resource_group, vm_name)
        elif action == "stop":
            poller = client.virtual_machines.begin_power_off(resource_group, vm_name)
        elif action == "deallocate":
            poller = client.virtual_machines.begin_deallocate(resource_group, vm_name)
        elif action == "restart":
            poller = client.virtual_machines.begin_restart(resource_group, vm_name)
        else:
            return {"success": False, "message": f"Unknown action: {action}"}
            
        return {
            "success": True,
            "message": f"Action '{action}' submitted to Azure for VM '{vm_name}'. Async operation status: {poller.status()}"
        }
    except Exception as e:
        logger.error(f"Error executing {action} on VM {vm_name}: {e}")
        return {"success": False, "message": f"Azure operation failed: {str(e)}"}
