from app.schemas.user import RegisterRequest, LoginRequest, UserResponse, UserUpdate, TokenResponse
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.schemas.document import (
    DocumentCreate, DocumentResponse, DocumentUpdate,
    DocumentTemplateCreate, DocumentTemplateResponse,
    DocumentAnalysisRequest, DocumentAnalysisResponse,
    DocumentDraftRequest,
)
from app.schemas.billing import (
    InvoiceCreate, InvoiceResponse, InvoiceUpdate,
    InvoiceItemCreate, InvoiceItemResponse,
    TimeEntryCreate, TimeEntryResponse,
)
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate,
    DeadlineCreate, DeadlineResponse, DeadlineUpdate,
)
from app.schemas.ai import ResearchRequest, ResearchResponse
