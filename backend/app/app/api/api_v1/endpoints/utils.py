import logging
from typing import Any

from app import models, schemas
from app.api import deps
from app.utils import send_test_email
from fastapi import APIRouter, Depends
from pydantic.networks import EmailStr

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/test-email/", response_model=schemas.Msg, status_code=201)
def test_email(
    email_to: EmailStr,
    to_lang: str = "en",
    _current_user: models.AuthUser = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Test emails.
    """
    send_test_email(email_to=email_to, to_lang=to_lang)
    return {"msg": "Test email sent"}


@router.get("/hello")
async def hello():
    return {"message": "Cruel World"}


@router.get("/authed")
def authed(
    current_user: schemas.TokenPayload = Depends(deps.get_current_good_tokenpayload),
):
    return {"exp": current_user.exp}
