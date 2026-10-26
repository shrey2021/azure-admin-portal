"""Automated tests for Azure Admin Portal API and services."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_status():
    """Test /api/status endpoint."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "demo_mode" in data
    assert "subscription" in data
    assert "connection" in data

def test_api_summary():
    """Test /api/summary returns key telemetry metrics."""
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    summary = data["summary"]
    assert "total_vms" in summary
    assert "running_vms" in summary
    assert "total_resource_groups" in summary
    assert "total_storage_accounts" in summary
    assert "total_monthly_cost" in summary
    assert "recent_activities" in data

def test_api_vms_listing():
    """Test /api/vms returns virtual machine list."""
    response = client.get("/api/vms")
    assert response.status_code == 200
    data = response.json()
    assert "vms" in data
    assert len(data["vms"]) > 0
    vm = data["vms"][0]
    assert "name" in vm
    assert "power_state" in vm
    assert "resource_group" in vm

def test_api_vm_action_lifecycle():
    """Test starting and stopping a virtual machine in demo mode."""
    rg = "rg-web-apps-prod"
    vm_name = "vm-prod-web-01"

    # Stop VM
    res_stop = client.post(f"/api/vms/{rg}/{vm_name}/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["success"] is True
    assert "stopped" in res_stop.json()["vm"]["power_state"].lower()

    # Restart / Start VM
    res_start = client.post(f"/api/vms/{rg}/{vm_name}/start")
    assert res_start.status_code == 200
    assert res_start.json()["success"] is True
    assert "running" in res_start.json()["vm"]["power_state"].lower()

def test_api_resource_groups_list_and_create():
    """Test listing and creating a resource group."""
    # List
    res_list = client.get("/api/resource-groups")
    assert res_list.status_code == 200
    initial_count = res_list.json()["count"]

    # Create new RG
    payload = {
        "name": "rg-test-automation-99",
        "location": "eastus2",
        "tags": {"Environment": "Test", "CreatedBy": "PyTest"}
    }
    res_create = client.post("/api/resource-groups", json=payload)
    assert res_create.status_code == 200
    assert res_create.json()["success"] is True

    # Check that count increased
    res_list_after = client.get("/api/resource-groups")
    assert res_list_after.json()["count"] == initial_count + 1

def test_api_storage():
    """Test /api/storage endpoint."""
    response = client.get("/api/storage")
    assert response.status_code == 200
    data = response.json()
    assert "storage_accounts" in data
    assert len(data["storage_accounts"]) > 0

def test_api_costs():
    """Test /api/costs endpoint returns FinOps data."""
    response = client.get("/api/costs")
    assert response.status_code == 200
    data = response.json()
    assert "total_monthly_cost" in data
    assert "monthly_trends" in data
    assert "costs_by_service" in data
    assert "recommendations" in data

def test_api_rbac():
    """Test /api/rbac returns role assignments."""
    response = client.get("/api/rbac")
    assert response.status_code == 200
    data = response.json()
    assert "role_assignments" in data
    assert len(data["role_assignments"]) > 0
