import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SAEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class CaseStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CaseType(str, enum.Enum):
    CIVIL = "civil"
    CRIMINAL = "criminal"
    CORPORATE = "corporate"
    FAMILY = "family"
    REAL_ESTATE = "real_estate"
    IMMIGRATION = "immigration"
    IP = "intellectual_property"
    LABOR = "labor"
    TAX = "tax"
    OTHER = "other"


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    case_number: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    case_type: Mapped[CaseType] = mapped_column(SAEnum(CaseType), default=CaseType.OTHER)
    status: Mapped[CaseStatus] = mapped_column(SAEnum(CaseStatus), default=CaseStatus.OPEN)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    court: Mapped[str | None] = mapped_column(String(255), nullable=True)
    judge: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opposing_counsel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    filing_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estimated_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="cases")
    client = relationship("Client", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="case", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="case", cascade="all, delete-orphan")
