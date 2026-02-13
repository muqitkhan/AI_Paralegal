from pydantic import BaseModel
from datetime import datetime


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = 1
    rate: float
    amount: float


class InvoiceItemResponse(BaseModel):
    id: str
    description: str
    quantity: float
    rate: float
    amount: float

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: str | None = None  # Auto-generate if not provided
    tax_rate: float = 0
    notes: str | None = None
    due_date: datetime | None = None
    items: list[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    status: str | None = None
    tax_rate: float | None = None
    notes: str | None = None
    due_date: datetime | None = None


class InvoiceResponse(BaseModel):
    id: str
    client_id: str
    invoice_number: str
    status: str
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: str | None
    due_date: datetime | None
    paid_at: datetime | None
    items: list[InvoiceItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimeEntryCreate(BaseModel):
    case_id: str | None = None
    description: str
    hours: float
    rate: float
    date: datetime
    is_billable: bool = True


class TimeEntryResponse(BaseModel):
    id: str
    case_id: str | None
    description: str
    hours: float
    rate: float
    date: datetime
    is_billable: bool
    is_billed: bool
    created_at: datetime

    class Config:
        from_attributes = True
