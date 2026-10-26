import sys
import traceback
from pathlib import Path

# Add project root to sys.path for serverless runtime
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from app.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse

    error_trace = traceback.format_exc()
    app = FastAPI(title="Azure Admin Portal - Error Handler")

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all_error(path_name: str = ""):
        return HTMLResponse(
            f"<html><body style='font-family:sans-serif;padding:30px;background:#f8fafc;'>"
            f"<h2 style='color:#ef4444;'>Azure Portal Serverless Startup Error</h2>"
            f"<p>An exception occurred while loading the application:</p>"
            f"<pre style='background:#1e293b;color:#f8fafc;padding:16px;border-radius:8px;overflow:auto;'>{error_trace}</pre>"
            f"</body></html>",
            status_code=500
        )
