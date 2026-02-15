from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.models.client import Client, ClientStatus
from app.models.case import Case, CaseStatus
from app.models.document import Document
from app.models.billing import Invoice, InvoiceStatus, TimeEntry
from app.models.calendar import Deadline, Appointment, AppointmentStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    active_clients = db.query(func.count(Client.id)).filter(
        Client.user_id == uid, Client.status == ClientStatus.ACTIVE
    ).scalar()

    open_cases = db.query(func.count(Case.id)).filter(
        Case.user_id == uid, Case.status.in_([CaseStatus.OPEN, CaseStatus.IN_PROGRESS, CaseStatus.PENDING])
    ).scalar()

    documents = db.query(func.count(Document.id)).filter(
        Document.user_id == uid
    ).scalar()

    pending_invoices = db.query(func.count(Invoice.id)).filter(
        Invoice.user_id == uid, Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
    ).scalar()

    # Revenue
    total_billed = db.query(func.coalesce(func.sum(Invoice.total), 0)).filter(
        Invoice.user_id == uid, Invoice.status != InvoiceStatus.CANCELLED
    ).scalar()

    total_collected = db.query(func.coalesce(func.sum(Invoice.total), 0)).filter(
        Invoice.user_id == uid, Invoice.status == InvoiceStatus.PAID
    ).scalar()

    outstanding = db.query(func.coalesce(func.sum(Invoice.total), 0)).filter(
        Invoice.user_id == uid, Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
    ).scalar()

    # Billable hours this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    billable_hours = db.query(func.coalesce(func.sum(TimeEntry.hours), 0)).filter(
        TimeEntry.user_id == uid, TimeEntry.is_billable == True, TimeEntry.date >= month_start
    ).scalar()

    return {
        "active_clients": active_clients,
        "open_cases": open_cases,
        "documents": documents,
        "pending_invoices": pending_invoices,
        "total_billed": float(total_billed),
        "total_collected": float(total_collected),
        "outstanding": float(outstanding),
        "billable_hours_month": float(billable_hours),
    }


@router.get("/deadlines")
async def get_upcoming_deadlines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    deadlines = (
        db.query(Deadline)
        .filter(Deadline.user_id == uid, Deadline.is_completed == False, Deadline.due_date >= datetime.utcnow())
        .order_by(Deadline.due_date)
        .limit(5)
        .all()
    )
    return [
        {
            "id": d.id,
            "title": d.title,
            "due_date": d.due_date.isoformat(),
            "priority": d.priority.value,
            "case_id": d.case_id,
            "case_title": d.case.title if d.case else None,
        }
        for d in deadlines
    ]


@router.get("/activity")
async def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregates recent items from multiple tables as activity feed."""
    uid = current_user.id
    activities = []

    # Recent documents
    recent_docs = (
        db.query(Document)
        .filter(Document.user_id == uid)
        .order_by(Document.created_at.desc())
        .limit(3)
        .all()
    )
    for doc in recent_docs:
        activities.append({
            "type": "document",
            "title": f"Created document: {doc.title}",
            "timestamp": doc.created_at.isoformat(),
            "icon": "FileText",
        })

    # Recent invoices
    recent_inv = (
        db.query(Invoice)
        .filter(Invoice.user_id == uid)
        .order_by(Invoice.created_at.desc())
        .limit(3)
        .all()
    )
    for inv in recent_inv:
        status_verb = {"paid": "Payment received", "sent": "Invoice sent", "draft": "Invoice drafted", "overdue": "Invoice overdue"}.get(inv.status.value, "Invoice updated")
        activities.append({
            "type": "billing",
            "title": f"{status_verb}: {inv.invoice_number} (${float(inv.total):,.0f})",
            "timestamp": inv.created_at.isoformat(),
            "icon": "DollarSign",
        })

    # Recent cases
    recent_cases = (
        db.query(Case)
        .filter(Case.user_id == uid)
        .order_by(Case.created_at.desc())
        .limit(2)
        .all()
    )
    for c in recent_cases:
        activities.append({
            "type": "case",
            "title": f"Case opened: {c.title}",
            "timestamp": c.created_at.isoformat(),
            "icon": "Briefcase",
        })

    # Sort by timestamp descending and return top 8
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:8]


@router.get("/appointments")
async def get_upcoming_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    now = datetime.utcnow()
    window_start = now - timedelta(hours=12)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == uid,
            Appointment.start_time >= window_start,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        )
        .order_by(Appointment.start_time)
        .limit(12)
        .all()
    )

    upcoming = [ap for ap in appointments if ap.end_time >= now]
    if len(upcoming) < 6:
        fallback = [ap for ap in appointments if ap.end_time < now]
        upcoming.extend(fallback)
    upcoming = upcoming[:6]

    return [
        {
            "id": ap.id,
            "title": ap.title,
            "start_time": ap.start_time.isoformat(),
            "end_time": ap.end_time.isoformat(),
            "status": ap.status.value,
            "location": ap.location,
            "notes": ap.notes,
            "case_id": ap.case_id,
            "case_title": ap.case.title if ap.case else None,
            "client_id": ap.client_id,
            "client_name": ap.client.name if ap.client else None,
        }
        for ap in upcoming
    ]
