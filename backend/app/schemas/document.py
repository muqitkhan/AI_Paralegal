from pydantic import BaseModel
from datetime import datetime


class DocumentCreate(BaseModel):
    case_id: str | None = None
    title: str
    doc_type: str = "other"
    content: str | None = None
    template_id: str | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    doc_type: str | None = None
    content: str | None = None


class DocumentResponse(BaseModel):
    id: str
    case_id: str | None
    title: str
    doc_type: str
    content: str | None
    file_path: str | None
    ai_summary: str | None
    ai_risk_flags: str | None
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentTemplateCreate(BaseModel):
    name: str
    doc_type: str = "other"
    content: str
    variables: str | None = None  # JSON string
    description: str | None = None


class DocumentTemplateResponse(BaseModel):
    id: str
    name: str
    doc_type: str
    content: str
    variables: str | None
    description: str | None
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentAnalysisRequest(BaseModel):
    document_id: str | None = None
    content: str | None = None  # Direct text input


class DocumentAnalysisResponse(BaseModel):
    summary: str
    key_clauses: list[str]
    risk_flags: list[dict]
    recommendations: list[str]


class DocumentDraftRequest(BaseModel):
    doc_type: str
    template_id: str | None = None
    context: str  # Natural language description
    variables: dict | None = None  # Template variable values
