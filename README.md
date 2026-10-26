# Azure Admin & Operations Portal ☁️

An enterprise-grade, Python-based Azure Administration, Monitoring, FinOps, and Governance Portal. It comes equipped with a modern web dashboard, automated REST API, command-line companion (`cli.py`), and official Azure SDK integration.

---

## 🚀 Key Features

- **📊 Comprehensive Telemetry Dashboard**: Real-time fleet health, running/stopped VM counters, storage footprint, and multi-region deployment counts.
- **💻 Virtual Machine Management**: List VMs across subscriptions, inspect power states, CPU/RAM sizes, private/public IPs, and execute live power operations (**Start**, **Stop**, **Restart**, **Deallocate**).
- **📁 Resource Group Governance**: Discover, filter, tag, and create Azure resource groups with automated lifecycle tracking.
- **🗄️ Storage Account Explorer**: Inspect storage accounts, replication tiers (LRS, GRS, ZRS), access tiers (Hot, Cool, Archive), and primary blob endpoints.
- **💰 FinOps Cost Management**: Track monthly Azure spending against budget caps, visualize 6-month spending trends and service breakdowns, and review automated cost-saving recommendations (orphaned disks, idle VMs).
- **🛡️ RBAC & Security Posture**: Audit subscription role assignments (Owner, Contributor, Reader), review privileged access, and verify security baselines.
- **⚡ Dual Mode (Live Azure + Offline Demo)**: Zero-friction startup. Works out of the box with realistic simulation data, and connects seamlessly to live Azure with your Service Principal credentials.
- **💻 CLI Companion (`cli.py`)**: Scriptable command-line interface for DevOps engineers and terminal automation.

---

## 📁 Project Architecture

```
Azure Project/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application & REST endpoints
│   ├── config.py                # Environment configuration loader
│   ├── azure_client.py          # Azure SDK client manager & demo fallback
│   ├── services/
│   │   ├── compute_service.py   # VM listing, power state, and start/stop actions
│   │   ├── resource_service.py  # Resource groups, resource inventory & tagging
│   │   ├── storage_service.py   # Storage accounts & endpoints
│   │   ├── cost_service.py      # Azure cost analysis & FinOps recommendations
│   │   └── rbac_service.py      # RBAC role assignments & governance checks
│   ├── mock/
│   │   └── mock_data.py         # Realistic Azure dataset for sandbox/offline mode
│   ├── static/
│   │   ├── css/style.css        # Azure Portal design styling & responsiveness
│   │   └── js/app.js            # Client-side SPA routing & Chart.js visualizations
│   └── templates/
│       └── index.html           # Single-Page Dashboard application
├── tests/
│   └── test_api.py              # Automated test suite
├── cli.py                       # Standalone admin CLI
├── requirements.txt             # Python dependencies
├── .env.example                 # Azure credentials configuration template
├── run.ps1                      # Windows PowerShell one-click launcher
├── run.bat                      # Windows Batch one-click launcher
└── README.md                    # Project guide and documentation
```

---

## ⚡ Quick Start

### Option 1: One-Click Startup (PowerShell)
Right-click or run in PowerShell:
```powershell
.\run.ps1
```
This will automatically configure the virtual environment, install requirements, and open `http://localhost:8000` in your default browser.

### Option 2: Windows Command Prompt
```cmd
run.bat
```

### Option 3: Manual Startup
```powershell
# 1. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# 2. Run the server with hot reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🖥️ Command-Line Interface (`cli.py`)

The companion CLI provides instant terminal operations:

```powershell
# Check Azure connectivity and current mode
python cli.py status

# Show summary fleet telemetry
python cli.py summary

# List all Virtual Machines
python cli.py vms list

# Start, stop, or restart a VM
python cli.py vms action --rg "rg-web-apps-prod" --name "vm-prod-web-01" --action stop
python cli.py vms action --rg "rg-web-apps-prod" --name "vm-prod-web-01" --action start

# List all Resource Groups
python cli.py rgs list

# Create a new Resource Group
python cli.py rgs create --name "rg-analytics-dev" --location "eastus2" --env "Development"

# List Storage Accounts
python cli.py storage list

# Show Cost & FinOps recommendations
python cli.py costs summary
```

---

## 🔗 Connecting to Live Microsoft Azure

By default, the project runs in **Demo Mode** (`DEMO_MODE=true`). To connect to real Azure resources:

### 1. Create an Azure Service Principal
If you have the Azure CLI (`az`) installed:
```powershell
az ad sp create-for-rbac --name "AzureAdminPortal-SP" --role Contributor --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>
```
This outputs JSON containing `appId`, `password`, `tenant`, and `subscriptionId`.

### 2. Configure `.env`
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Edit `.env` with your values:
```ini
DEMO_MODE=false
AZURE_TENANT_ID=xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your_client_secret_here
AZURE_SUBSCRIPTION_ID=xxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_DEFAULT_REGION=eastus
```

### 3. Restart Server
Restart the portal or visit the **Settings & Connect** tab in the dashboard and click **Test Connection**.

---

## 🚀 Deploying to GitHub & Vercel

### Step 1: Push to GitHub

1. If you have the GitHub CLI logged in:
   ```powershell
   gh auth login
   gh repo create azure-admin-portal --public --source=. --push
   ```
2. Or create a new repository on [GitHub](https://github.com/new) and run:
   ```powershell
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/azure-admin-portal.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com) and click **"Add New"** > **"Project"**.
2. Select your `azure-admin-portal` repository from the list and click **"Import"**.
3. Vercel automatically detects `vercel.json` and Python dependencies from `requirements.txt`.
4. (Optional) In **Environment Variables**, add:
   - `DEMO_MODE` = `true` (or your live Azure credentials `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SUBSCRIPTION_ID`).
5. Click **"Deploy"**.
6. Your portal will be live at `https://your-project.vercel.app`!

---

## 📖 API Documentation

Interactive Swagger and OpenAPI documentation are automatically generated by FastAPI:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Running Automated Tests

Run the test suite using pytest:
```powershell
.\venv\Scripts\python.exe -m pytest tests/test_api.py -v
```
