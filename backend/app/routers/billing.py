from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.billing import Invoice, InvoiceItem, TimeEntry
from app.models.user import User
from app.schemas.billing import (
    InvoiceCreate, InvoiceResponse, InvoiceUpdate,
    TimeEntryCreate, TimeEntryResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])


# --- Invoices ---

@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    client_id: str | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if status:
        query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.created_at.desc()).all()


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-generate invoice number
    invoice_number = data.invoice_number
    if not invoice_number:
        count = db.query(Invoice).filter(Invoice.user_id == current_user.id).count()
        invoice_number = f"INV-{count + 1:05d}"

    # Calculate totals
    subtotal = sum(item.amount for item in data.items)
    tax_amount = subtotal * (data.tax_rate / 100)
    total = subtotal + tax_amount

    invoice = Invoice(
        user_id=current_user.id,
        client_id=data.client_id,
        invoice_number=invoice_number,
        tax_rate=data.tax_rate,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        notes=data.notes,
        due_date=data.due_date,
    )
    db.add(invoice)
    db.flush()

    for item_data in data.items:
        item = InvoiceItem(invoice_id=invoice.id, **item_data.model_dump())
        db.add(item)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id, Invoice.user_id == current_user.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id, Invoice.user_id == current_user.id
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "paid":
        invoice.paid_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(invoice, field, value)
    db.commit()
    db.refresh(invoice)
    return invoice


# --- Time Entries ---

@router.get("/time-entries", response_model=list[TimeEntryResponse])
async def list_time_entries(
    case_id: str | None = None,
    is_billed: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TimeEntry).filter(TimeEntry.user_id == current_user.id)
    if case_id:
        query = query.filter(TimeEntry.case_id == case_id)
    if is_billed is not None:
        query = query.filter(TimeEntry.is_billed == is_billed)
    return query.order_by(TimeEntry.date.desc()).all()


@router.post("/time-entries", response_model=TimeEntryResponse, status_code=201)
async def create_time_entry(
    data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = TimeEntry(user_id=current_user.id, **data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/time-entries/{entry_id}", status_code=204)
async def delete_time_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_id, TimeEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    db.delete(entry)
    db.commit()
