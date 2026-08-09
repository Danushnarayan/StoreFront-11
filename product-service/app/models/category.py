import uuid
from typing import Dict, Any, Optional
from datetime import datetime

class Category:
    def __init__(
        self,
        name: str,
        category_id: Optional[str] = None,
        description: Optional[str] = None,
        icon_url: Optional[str] = None,
        banner_url: Optional[str] = None,
        product_count: int = 0,
        display_order: int = 0,
        featured: bool = False,
        is_active: bool = True,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None,
    ):
        self.category_id = category_id or f"CAT-{uuid.uuid4().hex}"
        self.name = name
        self.description = description or ""
        self.icon_url = icon_url or ""
        self.banner_url = banner_url or ""
        self.product_count = product_count
        self.display_order = display_order
        self.featured = featured
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        self.updated_at = updated_at or self.created_at

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "product_id": self.category_id,  # Stored in product_id PK of danush_products_table
            "entity_type": "CATEGORY",
            "name": self.name,
            "description": self.description,
            "icon_url": self.icon_url,
            "banner_url": self.banner_url,
            "product_count": self.product_count,
            "display_order": self.display_order,
            "featured": self.featured,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        # Prevent DynamoDB ValidationException on empty strings
        return {k: v for k, v in data.items() if v != ""}

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Category":
        return Category(
            category_id=data.get("product_id"),
            name=data.get("name", ""),
            description=data.get("description", ""),
            icon_url=data.get("icon_url", ""),
            banner_url=data.get("banner_url", ""),
            product_count=data.get("product_count", 0),
            display_order=data.get("display_order", 0),
            featured=data.get("featured", False),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
