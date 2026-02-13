from pydantic import BaseModel, EmailStr
from datetime import datetime


class ClientCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    company: str | None = None
    status: str = "active"
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    company: str | None = None
    status: str | None = None
    notes: str | None = None


class ClientResponse(BaseModel):
    id: str
    name: str
    email: str | None
    phone: str | None
    address: str | None
    company: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
