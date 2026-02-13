from pydantic import BaseModel, EmailStr
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    firm_name: str | None = None
    bar_number: str | None = None
    phone: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None
    is_active: bool
    firm_name: str | None
    bar_number: str | None
    phone: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
