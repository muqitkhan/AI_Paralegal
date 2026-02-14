from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.billing import Invoice, InvoiceItem, TimeEntry
from app.models.case import Case
from app.models.user import User
from app.schemas.billing import (
    InvoiceCreate, InvoiceResponse, InvoiceUpdate,
    TimeEntryCreate, TimeEntryResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.post("/import")
async def import_billing(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import time entries from JSON array. Updates existing by description+date match."""
    rows = body.get("data", [])
    if not rows:
        raise HTTPException(status_code=400, detail="No data provided")
    created = 0
    updated = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            description = row.get("description", "").strip()
            if not description:
                errors.append(f"Row {i+1}: description is required")
                continue
            entry_date = datetime.fromisoformat(row["date"]) if row.get("date") else datetime.utcnow()
            existing = db.query(TimeEntry).filter(
                TimeEntry.user_id == current_user.id,
                TimeEntry.description.ilike(description),
            ).first()
            if existing:
                for field, val in [("hours", row.get("hours")), ("rate", row.get("rate")),
                                   ("is_billable", row.get("is_billable")), ("case_id", row.get("case_id"))]:
                    if val is not None:
                        if field in ("hours", "rate"):
                            setattr(existing, field, float(val))
                        else:
                            setattr(existing, field, val if val else None)
                existing.date = entry_date
                updated += 1
            else:
                entry = TimeEntry(
                    user_id=current_user.id,
                    description=description,
                    hours=float(row.get("hours", 0)),
                    rate=float(row.get("rate", 250)),
                    date=entry_date,
                    is_billable=row.get("is_billable", True),
                    case_id=row.get("case_id") or None,
                )
                db.add(entry)
                created += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


# --- Invoices ---

@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    client_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if status:
        query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()


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


# --- Auto-generate Invoice from unbilled time entries ---

@router.post("/invoices/auto-generate", response_model=InvoiceResponse, status_code=201)
async def auto_generate_invoice(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auto-generate an invoice from unbilled time entries for a client."""
    client_id = data.get("client_id")
    tax_rate = data.get("tax_rate", 0)
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")

    # Find all cases for this client
    case_ids = [
        c.id for c in db.query(Case).filter(
            Case.user_id == current_user.id,
            Case.client_id == client_id
        ).all()
    ]

    if not case_ids:
        raise HTTPException(status_code=400, detail="No cases found for this client")

    # Find unbilled, billable time entries for those cases
    entries = db.query(TimeEntry).filter(
        TimeEntry.user_id == current_user.id,
        TimeEntry.case_id.in_(case_ids),
        TimeEntry.is_billable == True,
        TimeEntry.is_billed == False,
    ).order_by(TimeEntry.date).all()

    if not entries:
        raise HTTPException(status_code=400, detail="No unbilled time entries found for this client")

    # Auto-generate invoice number
    count = db.query(Invoice).filter(Invoice.user_id == current_user.id).count()
    invoice_number = f"INV-{count + 1:05d}"

    # Calculate totals
    subtotal = sum(float(e.hours) * float(e.rate) for e in entries)
    tax_amount = subtotal * (tax_rate / 100)
    total = subtotal + tax_amount

    # Create invoice
    invoice = Invoice(
        user_id=current_user.id,
        client_id=client_id,
        invoice_number=invoice_number,
        tax_rate=tax_rate,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        notes=f"Auto-generated from {len(entries)} time entries",
        due_date=datetime.utcnow() + timedelta(days=30),
    )
    db.add(invoice)
    db.flush()

    # Create invoice items from time entries
    for entry in entries:
        amount = float(entry.hours) * float(entry.rate)
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=f"{entry.description} ({float(entry.hours)}h @ ${float(entry.rate)}/hr)",
            quantity=float(entry.hours),
            rate=float(entry.rate),
            amount=amount,
        )
        db.add(item)
        # Mark entry as billed
        entry.is_billed = True

    db.commit()
    db.refresh(invoice)
    return invoice


# --- Time Entries ---

@router.get("/time-entries", response_model=list[TimeEntryResponse])
async def list_time_entries(
    case_id: str | None = None,
    is_billed: bool | None = None,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TimeEntry).filter(TimeEntry.user_id == current_user.id)
    if case_id:
        query = query.filter(TimeEntry.case_id == case_id)
    if is_billed is not None:
        query = query.filter(TimeEntry.is_billed == is_billed)
    return query.order_by(TimeEntry.date.desc()).offset(offset).limit(limit).all()


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
