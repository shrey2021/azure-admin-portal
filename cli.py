"""Azure Cloud Administration & Automation Command-Line Tool."""
import sys
import argparse
from tabulate import tabulate

from app.config import settings
from app.azure_client import test_azure_connection
from app.services import (
    compute_service,
    resource_service,
    storage_service,
    cost_service,
    rbac_service
)

# Ensure utf-8 encoding if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def cmd_status(args):
    """Check Azure connection and environment mode."""
    res = test_azure_connection()
    print("=" * 60)
    print(" AZURE ADMIN PORTAL - CONNECTION STATUS")
    print("=" * 60)
    print(f" Status:        {'Connected' if res['connected'] else 'Disconnected'}")
    print(f" Active Mode:   {res['mode']}")
    print(f" Subscription:  {res.get('subscription_id', 'None')}")
    print(f" Details:       {res.get('message', '')}")
    print("=" * 60)

def cmd_summary(args):
    """Display cloud fleet telemetry summary."""
    vms = compute_service.list_virtual_machines()
    rgs = resource_service.list_resource_groups()
    storage = storage_service.list_storage_accounts()
    costs = cost_service.get_cost_summary()

    running_vms = sum(1 for v in vms if "running" in v.get("power_state", "").lower())
    stopped_vms = sum(1 for v in vms if "stopped" in v.get("power_state", "").lower() or "deallocated" in v.get("power_state", "").lower())

    summary_data = [
        ["Total Virtual Machines", len(vms)],
        ["  - Running VMs", running_vms],
        ["  - Stopped/Deallocated", stopped_vms],
        ["Resource Groups", len(rgs)],
        ["Storage Accounts", len(storage)],
        ["Current Month Spend", f"${costs.get('total_monthly_cost', 0):,.2f}"],
        ["Budget Status", costs.get("budget_status", "N/A")],
        ["Optimization Savings", f"${sum(r.get('potential_savings_monthly', 0) for r in costs.get('recommendations', [])):,.2f}/mo"]
    ]
    print("\nAZURE FLEET TELEMETRY:")
    print(tabulate(summary_data, headers=["Metric", "Value"], tablefmt="grid"))

def cmd_vms_list(args):
    """List Virtual Machines."""
    vms = compute_service.list_virtual_machines()
    rows = []
    for v in vms:
        rows.append([
            v.get("name"),
            v.get("resource_group"),
            v.get("location"),
            v.get("vm_size"),
            v.get("power_state"),
            v.get("private_ip"),
            v.get("public_ip")
        ])
    print("\nAZURE VIRTUAL MACHINES:")
    print(tabulate(rows, headers=["Name", "Resource Group", "Location", "Size", "Power State", "Private IP", "Public IP"], tablefmt="grid"))

def cmd_vms_action(args):
    """Start, stop, restart, or deallocate a VM."""
    print(f"\n[+] Executing '{args.action}' on VM '{args.name}' in '{args.rg}'...")
    res = compute_service.perform_vm_action(args.rg, args.name, args.action)
    if res.get("success"):
        print(f"[SUCCESS] {res.get('message')}")
    else:
        print(f"[FAILED] {res.get('message')}")
        sys.exit(1)

def cmd_rgs_list(args):
    """List Resource Groups."""
    rgs = resource_service.list_resource_groups()
    rows = []
    for r in rgs:
        tags_str = ", ".join(f"{k}={v}" for k, v in (r.get("tags") or {}).items())
        rows.append([
            r.get("name"),
            r.get("location"),
            r.get("provisioning_state"),
            r.get("resource_count"),
            tags_str or "-"
        ])
    print("\nAZURE RESOURCE GROUPS:")
    print(tabulate(rows, headers=["Name", "Location", "State", "Resource Count", "Tags"], tablefmt="grid"))

def cmd_rgs_create(args):
    """Create a new Resource Group."""
    tags = {"Environment": args.env, "ManagedBy": "AzureAdminCLI"}
    print(f"\n[+] Creating resource group '{args.name}' in region '{args.location}'...")
    res = resource_service.create_resource_group(args.name, args.location, tags)
    if res.get("success"):
        print(f"[SUCCESS] {res.get('message')}")
    else:
        print(f"[FAILED] {res.get('message')}")
        sys.exit(1)

def cmd_storage_list(args):
    """List Storage Accounts."""
    storage = storage_service.list_storage_accounts()
    rows = []
    for s in storage:
        rows.append([
            s.get("name"),
            s.get("resource_group"),
            s.get("location"),
            s.get("sku"),
            s.get("access_tier"),
            s.get("primary_endpoints", {}).get("blob", "-")
        ])
    print("\nAZURE STORAGE ACCOUNTS:")
    print(tabulate(rows, headers=["Name", "Resource Group", "Location", "SKU", "Tier", "Blob Endpoint"], tablefmt="grid"))

def cmd_costs_summary(args):
    """Show FinOps spending & optimization recommendations."""
    costs = cost_service.get_cost_summary()
    print(f"\nMONTHLY SPEND:   ${costs.get('total_monthly_cost', 0):,.2f}")
    print(f"FORECASTED:      ${costs.get('forecasted_cost', 0):,.2f}")
    print(f"BUDGET CAP:      ${costs.get('budget_limit', 0):,.2f}")
    print(f"STATUS:          {costs.get('budget_status', 'N/A')}\n")

    recs = costs.get("recommendations", [])
    rec_rows = []
    for r in recs:
        rec_rows.append([r.get("type"), r.get("resource"), r.get("impact"), f"${r.get('potential_savings_monthly', 0):.2f}/mo", r.get("description")])
    print("FINOPS RECOMMENDATIONS:")
    print(tabulate(rec_rows, headers=["Type", "Resource", "Impact", "Savings", "Description"], tablefmt="grid"))

def main():
    parser = argparse.ArgumentParser(description="Azure Cloud Admin & Operations CLI")
    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # status
    p_status = subparsers.add_parser("status", help="Check Azure connection and credentials")
    p_status.set_defaults(func=cmd_status)

    # summary
    p_sum = subparsers.add_parser("summary", help="Show fleet overview telemetry")
    p_sum.set_defaults(func=cmd_summary)

    # vms
    p_vms = subparsers.add_parser("vms", help="Virtual Machine management")
    vms_sub = p_vms.add_subparsers(dest="vm_action")
    p_vms_list = vms_sub.add_parser("list", help="List all VMs")
    p_vms_list.set_defaults(func=cmd_vms_list)

    p_vms_act = vms_sub.add_parser("action", help="Perform start/stop/restart/deallocate")
    p_vms_act.add_argument("--rg", required=True, help="Resource Group name")
    p_vms_act.add_argument("--name", required=True, help="VM Name")
    p_vms_act.add_argument("--action", required=True, choices=["start", "stop", "restart", "deallocate"], help="Action to execute")
    p_vms_act.set_defaults(func=cmd_vms_action)

    # rgs
    p_rgs = subparsers.add_parser("rgs", help="Resource Group management")
    rgs_sub = p_rgs.add_subparsers(dest="rg_action")
    p_rgs_list = rgs_sub.add_parser("list", help="List all Resource Groups")
    p_rgs_list.set_defaults(func=cmd_rgs_list)

    p_rgs_create = rgs_sub.add_parser("create", help="Create a Resource Group")
    p_rgs_create.add_argument("--name", required=True, help="Resource Group name")
    p_rgs_create.add_argument("--location", default="eastus", help="Azure Region (default: eastus)")
    p_rgs_create.add_argument("--env", default="Production", help="Environment tag value")
    p_rgs_create.set_defaults(func=cmd_rgs_create)

    # storage
    p_storage = subparsers.add_parser("storage", help="Storage accounts inspection")
    storage_sub = p_storage.add_subparsers(dest="storage_action")
    p_storage_list = storage_sub.add_parser("list", help="List storage accounts")
    p_storage_list.set_defaults(func=cmd_storage_list)

    # costs
    p_costs = subparsers.add_parser("costs", help="Cost and FinOps analytics")
    costs_sub = p_costs.add_subparsers(dest="costs_action")
    p_costs_sum = costs_sub.add_parser("summary", help="Show cost breakdown and recommendations")
    p_costs_sum.set_defaults(func=cmd_costs_summary)

    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
