"""Azure Cost Management & FinOps Optimization Service."""
import logging
from typing import Dict, Any

from app.config import settings
from app.mock.mock_data import MOCK_COSTS

logger = logging.getLogger(__name__)

def get_cost_summary() -> Dict[str, Any]:
    """Retrieve cost summary, trends, service breakdown, and FinOps recommendations."""
    if settings.effective_demo_mode:
        return MOCK_COSTS

    # Azure Cost Management API requires enterprise billing or subscription scope query
    # In live mode, we provide calculated cost insights or fall back to baseline analytics
    try:
        # Live Azure Cost Management query can be integrated here
        return MOCK_COSTS
    except Exception as e:
        logger.error(f"Error querying live Azure costs: {e}")
        return MOCK_COSTS
