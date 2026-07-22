from fastapi.routing import APIRoute
from fastapi.requests import Request


router = APIRoute("/auth")


# i need to use pydantic for type validation later

# @router.post("")
# def email_auth(request:Request, email: )
