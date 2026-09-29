from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if hasattr(request.state, 'new_tokens') and request.state.new_tokens:
            response.set_cookie(
                key="access_token", 
                value=request.state.new_tokens["access_token"], 
                httponly=True, 
                secure=True, 
                samesite="lax"
            )
            response.set_cookie(
                key="refresh_token", 
                value=request.state.new_tokens["refresh_token"], 
                httponly=True, 
                secure=True, 
                samesite="lax"
            )
        
        return response

# def get_user()