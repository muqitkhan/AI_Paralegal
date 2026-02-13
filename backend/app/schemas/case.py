from pydantic import BaseModel
from datetime import datetime


class CaseCreate(BaseModel):
    client_id: str
    title: str
    case_number: str | None = None
    case_type: str = "other"
    description: str | None = None
    court: str | None = None
    judge: str | None = None
    opposing_counsel: str | None = None
    filing_date: datetime | None = None
    estimated_value: float | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    case_number: str | None = None
    case_type: str | None = None
    status: str | None = None
    description: str | None = None
    court: str | None = None
    judge: str | None = None
    opposing_counsel: str | None = None
    filing_date: datetime | None = None
    estimated_value: float | None = None


class CaseResponse(BaseModel):
    id: str
    client_id: str
    title: str
    case_number: str | None
    case_type: str
    status: str
    description: str | None
    court: str | None
    judge: str | None
    opposing_counsel: str | None
    filing_date: datetime | None
    estimated_value: float | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
