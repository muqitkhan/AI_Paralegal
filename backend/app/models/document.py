import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class DocumentType(str, enum.Enum):
    CONTRACT = "contract"
    AGREEMENT = "agreement"
    MOTION = "motion"
    BRIEF = "brief"
    LETTER = "letter"
    NOTICE = "notice"
    PLEADING = "pleading"
    MEMO = "memo"
    OTHER = "other"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    case_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cases.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    doc_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), default=DocumentType.OTHER)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_risk_flags: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("document_templates.id"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="documents")
    case = relationship("Case", back_populates="documents")
    template = relationship("DocumentTemplate", back_populates="documents")


class DocumentTemplate(Base):
    __tablename__ = "document_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[DocumentType] = mapped_column(SAEnum(DocumentType), default=DocumentType.OTHER)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: list of template variables
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(default=False)  # Pre-built templates
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="template")
