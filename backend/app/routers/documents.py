from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document, DocumentTemplate
from app.models.user import User
from app.schemas.document import (
    DocumentCreate, DocumentResponse, DocumentUpdate,
    DocumentTemplateCreate, DocumentTemplateResponse,
    DocumentAnalysisRequest, DocumentAnalysisResponse,
    DocumentDraftRequest,
)
from app.services.auth import get_current_user
from app.services.ai_service import analyze_document, draft_document

router = APIRouter(prefix="/documents", tags=["Documents"])


# --- Documents CRUD ---

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    case_id: str | None = None,
    doc_type: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if case_id:
        query = query.filter(Document.case_id == case_id)
    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if search:
        query = query.filter(Document.title.ilike(f"%{search}%"))
    return query.order_by(Document.created_at.desc()).all()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(
    data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = Document(user_id=current_user.id, **data.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.patch("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: str,
    data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    doc.version += 1
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()


# --- AI Document Analysis ---

@router.post("/analyze", response_model=DocumentAnalysisResponse)
async def analyze_doc(
    request: DocumentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = request.content
    if request.document_id:
        doc = db.query(Document).filter(
            Document.id == request.document_id, Document.user_id == current_user.id
        ).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        content = doc.content

    if not content:
        raise HTTPException(status_code=400, detail="No content to analyze")

    result = await analyze_document(content)

    # Save analysis to document if document_id provided
    if request.document_id:
        import json
        doc.ai_summary = result.get("summary", "")
        doc.ai_risk_flags = json.dumps(result.get("risk_flags", []))
        db.commit()

    return DocumentAnalysisResponse(**result)


# --- AI Document Drafting ---

@router.post("/draft", response_model=DocumentResponse)
async def draft_doc(
    request: DocumentDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template_content = None
    if request.template_id:
        template = db.query(DocumentTemplate).filter(DocumentTemplate.id == request.template_id).first()
        if template:
            template_content = template.content

    content = await draft_document(request.doc_type, request.context, template_content)

    doc = Document(
        user_id=current_user.id,
        title=f"Draft - {request.doc_type.title()}",
        doc_type=request.doc_type,
        content=content,
        template_id=request.template_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


# --- Templates ---

@router.get("/templates/", response_model=list[DocumentTemplateResponse])
async def list_templates(db: Session = Depends(get_db)):
    return db.query(DocumentTemplate).order_by(DocumentTemplate.name).all()


@router.post("/templates/", response_model=DocumentTemplateResponse, status_code=201)
async def create_template(
    data: DocumentTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = DocumentTemplate(**data.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template
