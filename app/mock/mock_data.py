"""Realistic Azure data store for Demo & Simulation Mode."""
import datetime
from typing import List, Dict, Any, Optional

# In-memory mock state
MOCK_SUBSCRIPTION = {
    "subscription_id": "9a3f124c-e87b-4921-b4f0-8c6328e1d51a",
    "display_name": "Production-Enterprise-Sub-01",
    "state": "Enabled",
    "tenant_id": "72f988bf-86f1-41af-91ab-2d7cd011db47",
    "spending_limit": "Off"
}

MOCK_RESOURCE_GROUPS: List[Dict[str, Any]] = [
    {
        "id": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-core-infrastructure",
        "name": "rg-core-infrastructure",
        "location": "eastus",
        "provisioning_state": "Succeeded",
        "tags": {"Environment": "Production", "Owner": "DevOps", "CostCenter": "CC-101"},
        "resource_count": 8
    },
    {
        "id": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-web-apps-prod",
        "name": "rg-web-apps-prod",
        "location": "eastus2",
        "provisioning_state": "Succeeded",
        "tags": {"Environment": "Production", "App": "CustomerPortal", "ManagedBy": "CloudAdmin"},
        "resource_count": 12
    },
    {
        "id": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-data-analytics",
        "name": "rg-data-analytics",
        "location": "westeurope",
        "provisioning_state": "Succeeded",
        "tags": {"Environment": "Analytics", "Project": "BI-Pipeline"},
        "resource_count": 6
    },
    {
        "id": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-dev-sandbox",
        "name": "rg-dev-sandbox",
        "location": "centralus",
        "provisioning_state": "Succeeded",
        "tags": {"Environment": "Development", "AutoShutdown": "Enabled"},
        "resource_count": 4
    }
]

MOCK_VIRTUAL_MACHINES: List[Dict[str, Any]] = [
    {
        "name": "vm-prod-web-01",
        "resource_group": "rg-web-apps-prod",
        "location": "eastus2",
        "vm_size": "Standard_D4s_v5",
        "vcpus": 4,
        "memory_gb": 16,
        "os_type": "Linux (Ubuntu 22.04 LTS)",
        "power_state": "VM running",
        "provisioning_state": "Succeeded",
        "private_ip": "10.0.1.4",
        "public_ip": "20.84.142.91",
        "os_disk_size_gb": 128,
        "tags": {"Environment": "Production", "Tier": "Frontend"},
        "cpu_usage_percent": 34.2,
        "uptime_hours": 312
    },
    {
        "name": "vm-prod-web-02",
        "resource_group": "rg-web-apps-prod",
        "location": "eastus2",
        "vm_size": "Standard_D4s_v5",
        "vcpus": 4,
        "memory_gb": 16,
        "os_type": "Linux (Ubuntu 22.04 LTS)",
        "power_state": "VM running",
        "provisioning_state": "Succeeded",
        "private_ip": "10.0.1.5",
        "public_ip": "20.84.142.92",
        "os_disk_size_gb": 128,
        "tags": {"Environment": "Production", "Tier": "Frontend"},
        "cpu_usage_percent": 28.7,
        "uptime_hours": 312
    },
    {
        "name": "vm-db-cluster-node1",
        "resource_group": "rg-core-infrastructure",
        "location": "eastus",
        "vm_size": "Standard_E8s_v5",
        "vcpus": 8,
        "memory_gb": 64,
        "os_type": "Linux (RHEL 9.2)",
        "power_state": "VM running",
        "provisioning_state": "Succeeded",
        "private_ip": "10.0.2.10",
        "public_ip": "None (Internal)",
        "os_disk_size_gb": 256,
        "tags": {"Environment": "Production", "Role": "Database"},
        "cpu_usage_percent": 58.4,
        "uptime_hours": 740
    },
    {
        "name": "vm-jumpbox-bastion",
        "resource_group": "rg-core-infrastructure",
        "location": "eastus",
        "vm_size": "Standard_B2s",
        "vcpus": 2,
        "memory_gb": 4,
        "os_type": "Windows Server 2022 Datacenter",
        "power_state": "VM stopped",
        "provisioning_state": "Succeeded",
        "private_ip": "10.0.0.5",
        "public_ip": "52.170.88.19",
        "os_disk_size_gb": 128,
        "tags": {"Role": "Bastion", "Owner": "SecOps"},
        "cpu_usage_percent": 0.0,
        "uptime_hours": 0
    },
    {
        "name": "vm-analytics-worker",
        "resource_group": "rg-data-analytics",
        "location": "westeurope",
        "vm_size": "Standard_F8s_v2",
        "vcpus": 8,
        "memory_gb": 16,
        "os_type": "Linux (Debian 11)",
        "power_state": "VM deallocated",
        "provisioning_state": "Succeeded",
        "private_ip": "10.2.1.8",
        "public_ip": "None",
        "os_disk_size_gb": 128,
        "tags": {"Project": "Spark-Jobs", "Schedule": "Nightly"},
        "cpu_usage_percent": 0.0,
        "uptime_hours": 0
    },
    {
        "name": "vm-dev-testbox",
        "resource_group": "rg-dev-sandbox",
        "location": "centralus",
        "vm_size": "Standard_B1ms",
        "vcpus": 1,
        "memory_gb": 2,
        "os_type": "Linux (Ubuntu 22.04 LTS)",
        "power_state": "VM running",
        "provisioning_state": "Succeeded",
        "private_ip": "10.3.0.4",
        "public_ip": "13.88.22.45",
        "os_disk_size_gb": 64,
        "tags": {"Environment": "Dev", "Owner": "jdoe"},
        "cpu_usage_percent": 12.1,
        "uptime_hours": 48
    }
]

MOCK_STORAGE_ACCOUNTS: List[Dict[str, Any]] = [
    {
        "name": "stprodcoreblob01",
        "resource_group": "rg-core-infrastructure",
        "location": "eastus",
        "sku": "Standard_GRS",
        "kind": "StorageV2 (general purpose v2)",
        "access_tier": "Hot",
        "primary_endpoints": {
            "blob": "https://stprodcoreblob01.blob.core.windows.net/",
            "file": "https://stprodcoreblob01.file.core.windows.net/"
        },
        "used_capacity_gb": 1420.5,
        "enable_https_traffic_only": True,
        "allow_blob_public_access": False
    },
    {
        "name": "stwebassetsprod",
        "resource_group": "rg-web-apps-prod",
        "location": "eastus2",
        "sku": "Premium_LRS",
        "kind": "BlockBlobStorage",
        "access_tier": "Hot",
        "primary_endpoints": {
            "blob": "https://stwebassetsprod.blob.core.windows.net/"
        },
        "used_capacity_gb": 348.0,
        "enable_https_traffic_only": True,
        "allow_blob_public_access": True
    },
    {
        "name": "stdatalakewesteu",
        "resource_group": "rg-data-analytics",
        "location": "westeurope",
        "sku": "Standard_ZRS",
        "kind": "StorageV2 (general purpose v2)",
        "access_tier": "Cool",
        "primary_endpoints": {
            "blob": "https://stdatalakewesteu.blob.core.windows.net/",
            "dfs": "https://stdatalakewesteu.dfs.core.windows.net/"
        },
        "used_capacity_gb": 4890.2,
        "enable_https_traffic_only": True,
        "allow_blob_public_access": False
    },
    {
        "name": "stbackupdevdaily",
        "resource_group": "rg-dev-sandbox",
        "location": "centralus",
        "sku": "Standard_LRS",
        "kind": "StorageV2 (general purpose v2)",
        "access_tier": "Archive",
        "primary_endpoints": {
            "blob": "https://stbackupdevdaily.blob.core.windows.net/"
        },
        "used_capacity_gb": 112.4,
        "enable_https_traffic_only": True,
        "allow_blob_public_access": False
    }
]

MOCK_COSTS: Dict[str, Any] = {
    "currency": "USD",
    "total_monthly_cost": 2487.65,
    "forecasted_cost": 2850.00,
    "budget_limit": 3000.00,
    "budget_status": "Within Budget (82.9%)",
    "monthly_trends": [
        {"month": "Apr", "actual": 2100.40, "budget": 2800.00},
        {"month": "May", "actual": 2240.15, "budget": 2800.00},
        {"month": "Jun", "actual": 2315.80, "budget": 2900.00},
        {"month": "Jul", "actual": 2390.50, "budget": 3000.00},
        {"month": "Aug", "actual": 2450.10, "budget": 3000.00},
        {"month": "Sep (Current)", "actual": 2487.65, "budget": 3000.00}
    ],
    "costs_by_service": [
        {"service": "Virtual Machines", "cost": 1245.50, "percentage": 50.1},
        {"service": "Storage Accounts", "cost": 498.20, "percentage": 20.0},
        {"service": "Virtual Network & Bandwidth", "cost": 320.40, "percentage": 12.9},
        {"service": "Azure SQL & Cosmos DB", "cost": 275.55, "percentage": 11.1},
        {"service": "Monitor & Log Analytics", "cost": 148.00, "percentage": 5.9}
    ],
    "costs_by_resource_group": [
        {"resource_group": "rg-web-apps-prod", "cost": 1050.40},
        {"resource_group": "rg-core-infrastructure", "cost": 820.75},
        {"resource_group": "rg-data-analytics", "cost": 475.20},
        {"resource_group": "rg-dev-sandbox", "cost": 141.30}
    ],
    "recommendations": [
        {
            "id": "rec-01",
            "type": "Unattached Disk",
            "resource": "disk-legacy-archive-01 (128 GB Standard SSD)",
            "impact": "High",
            "potential_savings_monthly": 19.20,
            "description": "Managed disk has been detached for over 45 days. Consider backing up and deleting."
        },
        {
            "id": "rec-02",
            "type": "Idle Virtual Machine",
            "resource": "vm-jumpbox-bastion",
            "impact": "Medium",
            "potential_savings_monthly": 42.50,
            "description": "VM has 0% compute usage over the past 14 days. Consider deallocating or auto-scheduling."
        },
        {
            "id": "rec-03",
            "type": "Storage Tiering",
            "resource": "stdatalakewesteu",
            "impact": "High",
            "potential_savings_monthly": 68.30,
            "description": "1.8 TB of blobs have not been accessed in 90 days. Enable lifecycle rule to move to Archive tier."
        }
    ]
}

MOCK_RBAC_ASSIGNMENTS: List[Dict[str, Any]] = [
    {
        "principal_name": "DevOps Engineers Lead",
        "principal_type": "Group",
        "role_definition_name": "Owner",
        "scope": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a",
        "inherited": False
    },
    {
        "principal_name": "CI/CD Pipeline Service Principal",
        "principal_type": "ServicePrincipal",
        "role_definition_name": "Contributor",
        "scope": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-web-apps-prod",
        "inherited": False
    },
    {
        "principal_name": "Cloud Security Auditor",
        "principal_type": "User",
        "role_definition_name": "Security Reader",
        "scope": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a",
        "inherited": False
    },
    {
        "principal_name": "App Developers Team",
        "principal_type": "Group",
        "role_definition_name": "Reader",
        "scope": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a/resourceGroups/rg-dev-sandbox",
        "inherited": False
    },
    {
        "principal_name": "FinOps Cost Analyst",
        "principal_type": "User",
        "role_definition_name": "Cost Management Reader",
        "scope": "/subscriptions/9a3f124c-e87b-4921-b4f0-8c6328e1d51a",
        "inherited": False
    }
]

# Activity audit log
MOCK_ACTIVITY_LOG: List[Dict[str, Any]] = [
    {
        "timestamp": (datetime.datetime.now() - datetime.timedelta(minutes=14)).strftime("%Y-%m-%d %H:%M:%S"),
        "caller": "admin@contoso.onmicrosoft.com",
        "action": "Microsoft.Compute/virtualMachines/restart/action",
        "resource": "vm-prod-web-01",
        "status": "Succeeded"
    },
    {
        "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=2, minutes=40)).strftime("%Y-%m-%d %H:%M:%S"),
        "caller": "pipeline-spn",
        "action": "Microsoft.Resources/deployments/write",
        "resource": "rg-web-apps-prod",
        "status": "Succeeded"
    },
    {
        "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S"),
        "caller": "admin@contoso.onmicrosoft.com",
        "action": "Microsoft.Compute/virtualMachines/deallocate/action",
        "resource": "vm-analytics-worker",
        "status": "Succeeded"
    }
]

# State mutation helpers for mock actions
def mock_set_vm_state(rg: str, vm_name: str, new_state: str) -> Optional[Dict[str, Any]]:
    for vm in MOCK_VIRTUAL_MACHINES:
        if vm["resource_group"].lower() == rg.lower() and vm["name"].lower() == vm_name.lower():
            vm["power_state"] = new_state
            if "running" in new_state.lower():
                vm["cpu_usage_percent"] = 25.0
            else:
                vm["cpu_usage_percent"] = 0.0
            
            # Log action
            MOCK_ACTIVITY_LOG.insert(0, {
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "caller": "portal-admin",
                "action": f"Microsoft.Compute/virtualMachines/{new_state.replace(' ', '_')}",
                "resource": vm_name,
                "status": "Succeeded"
            })
            return vm
    return None

def mock_add_resource_group(name: str, location: str, tags: Dict[str, str]) -> Dict[str, Any]:
    new_rg = {
        "id": f"/subscriptions/{MOCK_SUBSCRIPTION['subscription_id']}/resourceGroups/{name}",
        "name": name,
        "location": location,
        "provisioning_state": "Succeeded",
        "tags": tags,
        "resource_count": 0
    }
    MOCK_RESOURCE_GROUPS.append(new_rg)
    MOCK_ACTIVITY_LOG.insert(0, {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "caller": "portal-admin",
        "action": "Microsoft.Resources/resourceGroups/write",
        "resource": name,
        "status": "Succeeded"
    })
    return new_rg
