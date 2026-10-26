import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    """Application and Azure connection configuration."""
    
    # Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    
    # Azure Credentials
    AZURE_TENANT_ID: str = os.getenv("AZURE_TENANT_ID", "")
    AZURE_CLIENT_ID: str = os.getenv("AZURE_CLIENT_ID", "")
    AZURE_CLIENT_SECRET: str = os.getenv("AZURE_CLIENT_SECRET", "")
    AZURE_SUBSCRIPTION_ID: str = os.getenv("AZURE_SUBSCRIPTION_ID", "")
    AZURE_DEFAULT_REGION: str = os.getenv("AZURE_DEFAULT_REGION", "eastus")
    
    # Server Settings
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    @property
    def has_azure_credentials(self) -> bool:
        """Check if all required credentials for live Azure connection are provided."""
        return bool(
            self.AZURE_SUBSCRIPTION_ID
            and self.AZURE_TENANT_ID
            and self.AZURE_CLIENT_ID
            and self.AZURE_CLIENT_SECRET
        )

    @property
    def effective_demo_mode(self) -> bool:
        """If DEMO_MODE is true or credentials are missing, run in demo mode."""
        return self.DEMO_MODE or not self.has_azure_credentials

settings = Settings()
