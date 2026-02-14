from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.calendar import CalendarEvent, Deadline
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate,
    DeadlineCreate, DeadlineResponse, DeadlineUpdate,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.post("/import")
async def import_calendar(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import deadlines and events from JSON array. Updates existing by title match."""
    rows = body.get("data", [])
    import_type = body.get("type", "deadlines")  # "deadlines" or "events"
    if not rows:
        raise HTTPException(status_code=400, detail="No data provided")
    created = 0
    updated = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            title = row.get("title", "").strip()
            if not title:
                errors.append(f"Row {i+1}: title is required")
                continue
            if import_type == "events":
                existing = db.query(CalendarEvent).filter(
                    CalendarEvent.user_id == current_user.id,
                    CalendarEvent.title.ilike(title)
                ).first()
                if existing:
                    for field in ["event_type", "description", "location"]:
                        val = row.get(field)
                        if val is not None and str(val).strip():
                            setattr(existing, field, val)
                    if row.get("start_time"):
                        existing.start_time = datetime.fromisoformat(row["start_time"])
                    if row.get("end_time"):
                        existing.end_time = datetime.fromisoformat(row["end_time"])
                    updated += 1
                else:
                    event = CalendarEvent(
                        user_id=current_user.id,
                        title=title,
                        event_type=row.get("event_type", "other"),
                        description=row.get("description"),
                        location=row.get("location"),
                        start_time=datetime.fromisoformat(row["start_time"]) if row.get("start_time") else datetime.utcnow(),
                        end_time=datetime.fromisoformat(row["end_time"]) if row.get("end_time") else datetime.utcnow(),
                    )
                    db.add(event)
                    created += 1
            else:
                existing = db.query(Deadline).filter(
                    Deadline.user_id == current_user.id,
                    Deadline.title.ilike(title)
                ).first()
                if existing:
                    for field in ["description", "priority", "case_id"]:
                        val = row.get(field)
                        if val is not None and str(val).strip():
                            setattr(existing, field, val if val else None)
                    if row.get("due_date"):
                        existing.due_date = datetime.fromisoformat(row["due_date"])
                    if row.get("reminder_days"):
                        existing.reminder_days = int(row["reminder_days"])
                    updated += 1
                else:
                    deadline = Deadline(
                        user_id=current_user.id,
                        title=title,
                        description=row.get("description"),
                        due_date=datetime.fromisoformat(row["due_date"]) if row.get("due_date") else datetime.utcnow(),
                        priority=row.get("priority", "medium"),
                        case_id=row.get("case_id") or None,
                        reminder_days=int(row.get("reminder_days", 3)),
                    )
                    db.add(deadline)
                    created += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


# --- Calendar Events ---

@router.get("/events", response_model=list[CalendarEventResponse])
async def list_events(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    event_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)
    if start_date:
        query = query.filter(CalendarEvent.start_time >= start_date)
    if end_date:
        query = query.filter(CalendarEvent.end_time <= end_date)
    if event_type:
        query = query.filter(CalendarEvent.event_type == event_type)
    return query.order_by(CalendarEvent.start_time).all()


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    data: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = CalendarEvent(user_id=current_user.id, **data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    data: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(CalendarEvent).filter(
        CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()


# --- Deadlines ---

@router.get("/deadlines", response_model=list[DeadlineResponse])
async def list_deadlines(
    case_id: str | None = None,
    is_completed: bool | None = None,
    priority: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Deadline).filter(Deadline.user_id == current_user.id)
    if case_id:
        query = query.filter(Deadline.case_id == case_id)
    if is_completed is not None:
        query = query.filter(Deadline.is_completed == is_completed)
    if priority:
        query = query.filter(Deadline.priority == priority)
    return query.order_by(Deadline.due_date).all()


@router.post("/deadlines", response_model=DeadlineResponse, status_code=201)
async def create_deadline(
    data: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deadline = Deadline(user_id=current_user.id, **data.model_dump())
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline


@router.patch("/deadlines/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(
    deadline_id: str,
    data: DeadlineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deadline = db.query(Deadline).filter(
        Deadline.id == deadline_id, Deadline.user_id == current_user.id
    ).first()
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")

    update_data = data.model_dump(exclude_unset=True)
    if "is_completed" in update_data and update_data["is_completed"]:
        deadline.completed_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(deadline, field, value)
    db.commit()
    db.refresh(deadline)
    return deadline


@router.delete("/deadlines/{deadline_id}", status_code=204)
async def delete_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deadline = db.query(Deadline).filter(
        Deadline.id == deadline_id, Deadline.user_id == current_user.id
    ).first()
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    db.delete(deadline)
    db.commit()
