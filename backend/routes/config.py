from fastapi import APIRouter
from services.Config import GetImageConfig

router = APIRouter(prefix="config")


@router.get("image")
def get_image_config():
    return GetImageConfig()