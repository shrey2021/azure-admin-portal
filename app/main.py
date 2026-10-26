"""FastAPI Application Entry Point for Azure Admin & Operations Portal."""
import os
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.azure_client import test_azure_connection
from app.services import (
    compute_service,
    resource_service,
    storage_service,
    cost_service,
    rbac_service
)
from app.mock.mock_data import MOCK_ACTIVITY_LOG, MOCK_SUBSCRIPTION

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Azure Admin & Operations Portal",
    description="Unified management, monitoring, FinOps, and governance portal for Microsoft Azure",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Robust directory resolution for local, serverless & container environments
possible_dirs = [
    BASE_DIR,
    Path.cwd() / "app",
    Path.cwd(),
    Path("/var/task/app"),
    Path("/var/task")
]

static_dir = None
template_dir = None

for d in possible_dirs:
    if (d / "static").is_dir() and static_dir is None:
        static_dir = d / "static"
    if (d / "templates").is_dir() and template_dir is None:
        template_dir = d / "templates"

if not static_dir or not static_dir.exists():
    static_dir = BASE_DIR / "static"
    static_dir.mkdir(parents=True, exist_ok=True)

if not template_dir or not template_dir.exists():
    template_dir = BASE_DIR / "templates"
    template_dir.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(template_dir))

# --- Pydantic Models ---
class CreateResourceGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=90, description="Resource Group Name")
    location: str = Field(default="eastus", description="Azure Region")
    tags: Optional[Dict[str, str]] = Field(default_factory=dict, description="Tags dictionary")

class ToggleModeRequest(BaseModel):
    demo_mode: bool

# --- Frontend HTML Endpoint ---
@app.get("/")
async def render_dashboard(request: Request):
    """Render the single-page admin dashboard."""
    try:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "app_title": "Azure Admin Portal",
            "demo_mode": settings.effective_demo_mode
        })
    except Exception:
        # Fallback to direct file read if Jinja2 template loader has path discrepancy
        for d in possible_dirs:
            html_path = d / "templates" / "index.html"
            if html_path.is_file():
                return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
        return HTMLResponse("<h2>Azure Admin Portal</h2><p>Dashboard loaded in serverless mode.</p>")


# --- REST API Endpoints ---
@app.get("/api/status")
async def get_system_status():
    """Return Azure connection status, subscription, and active mode."""
    conn_info = test_azure_connection()
    return {
        "status": "healthy",
        "demo_mode": settings.effective_demo_mode,
        "subscription": MOCK_SUBSCRIPTION if settings.effective_demo_mode else {
            "subscription_id": settings.AZURE_SUBSCRIPTION_ID,
            "display_name": "Azure Live Subscription",
            "state": "Enabled"
        },
        "connection": conn_info
    }

@app.get("/api/summary")
async def get_portal_summary():
    """Return top-level KPIs and telemetry across all Azure services."""
    vms = compute_service.list_virtual_machines()
    rgs = resource_service.list_resource_groups()
    storage = storage_service.list_storage_accounts()
    costs = cost_service.get_cost_summary()

    running_vms = sum(1 for vm in vms if "running" in vm.get("power_state", "").lower())
    stopped_vms = sum(1 for vm in vms if "stopped" in vm.get("power_state", "").lower())
    deallocated_vms = sum(1 for vm in vms if "deallocated" in vm.get("power_state", "").lower())

    return {
        "summary": {
            "total_vms": len(vms),
            "running_vms": running_vms,
            "stopped_vms": stopped_vms,
            "deallocated_vms": deallocated_vms,
            "total_resource_groups": len(rgs),
            "total_storage_accounts": len(storage),
            "total_monthly_cost": costs.get("total_monthly_cost", 0.0),
            "budget_status": costs.get("budget_status", "Normal"),
            "potential_savings": sum(r.get("potential_savings_monthly", 0) for r in costs.get("recommendations", []))
        },
        "recent_activities": MOCK_ACTIVITY_LOG[:8]
    }

@app.get("/api/vms")
async def get_virtual_machines():
    """List virtual machines with their live status and details."""
    vms = compute_service.list_virtual_machines()
    return {"count": len(vms), "vms": vms}

@app.post("/api/vms/{resource_group}/{vm_name}/{action}")
async def trigger_vm_action(resource_group: str, vm_name: str, action: str):
    """Trigger start, stop, restart, or deallocate on a VM."""
    result = compute_service.perform_vm_action(resource_group, vm_name, action)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@app.get("/api/resource-groups")
async def get_resource_groups():
    """List all resource groups."""
    rgs = resource_service.list_resource_groups()
    return {"count": len(rgs), "resource_groups": rgs}

@app.post("/api/resource-groups")
async def create_new_resource_group(payload: CreateResourceGroupRequest):
    """Create a new Azure Resource Group."""
    result = resource_service.create_resource_group(payload.name, payload.location, payload.tags)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@app.get("/api/storage")
async def get_storage_accounts():
    """List all storage accounts."""
    storage = storage_service.list_storage_accounts()
    return {"count": len(storage), "storage_accounts": storage}

@app.get("/api/costs")
async def get_costs():
    """Return FinOps cost trends, breakdowns, and optimization recommendations."""
    costs = cost_service.get_cost_summary()
    return costs

@app.get("/api/rbac")
async def get_rbac_assignments():
    """List RBAC assignments."""
    assignments = rbac_service.list_role_assignments()
    return {"count": len(assignments), "role_assignments": assignments}

@app.get("/api/activities")
async def get_activities():
    """List recent operations and activity audit trail."""
    return {"activities": MOCK_ACTIVITY_LOG}

@app.post("/api/mode/toggle")
async def toggle_demo_mode(payload: ToggleModeRequest):
    """Toggle between Demo/Simulation and Live Azure Mode."""
    settings.DEMO_MODE = payload.demo_mode
    return {
        "success": True,
        "demo_mode": settings.effective_demo_mode,
        "message": f"Switched to {'Demo / Sandbox' if settings.effective_demo_mode else 'Live Azure'} Mode"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
