from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.calendar import CalendarEvent, Deadline, Appointment
from app.models.user import User
from app.schemas.calendar import (
    CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate,
    DeadlineCreate, DeadlineResponse, DeadlineUpdate,
    AppointmentCreate, AppointmentResponse, AppointmentUpdate,
    AppointmentAutomationRunRequest, AppointmentAutomationResponse,
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


# --- Appointments ---

@router.get("/appointments", response_model=list[AppointmentResponse])
async def list_appointments(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    status: str | None = None,
    case_id: str | None = None,
    client_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment).filter(Appointment.user_id == current_user.id)
    if start_date:
        query = query.filter(Appointment.start_time >= start_date)
    if end_date:
        query = query.filter(Appointment.end_time <= end_date)
    if status:
        query = query.filter(Appointment.status == status)
    if case_id:
        query = query.filter(Appointment.case_id == case_id)
    if client_id:
        query = query.filter(Appointment.client_id == client_id)
    return query.order_by(Appointment.start_time).all()


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    appointment = Appointment(user_id=current_user.id, **data.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id, Appointment.user_id == current_user.id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)

    if appointment.end_time <= appointment.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/appointments/{appointment_id}", status_code=204)
async def delete_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id, Appointment.user_id == current_user.id
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()


@router.post("/appointments/automation/run", response_model=AppointmentAutomationResponse)
async def run_appointment_automation(
    data: AppointmentAutomationRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    reminder_cutoff = now + timedelta(minutes=max(data.reminder_window_minutes, 0))

    appointments = db.query(Appointment).filter(
        Appointment.user_id == current_user.id,
    ).all()

    reminders: list[str] = []
    reminders_flagged = 0
    appointments_auto_completed = 0
    followups_created = 0

    for appointment in appointments:
        if appointment.status in ["scheduled", "confirmed"] and appointment.end_time <= now:
            appointment.status = "completed"
            appointments_auto_completed += 1

        if (
            appointment.status in ["scheduled", "confirmed"]
            and appointment.reminder_sent_at is None
            and appointment.start_time <= reminder_cutoff
        ):
            reminder_time = appointment.start_time - timedelta(minutes=max(appointment.reminder_minutes, 0))
            if now >= reminder_time:
                appointment.reminder_sent_at = now
                reminders_flagged += 1
                reminders.append(
                    f"{appointment.title} at {appointment.start_time.strftime('%Y-%m-%d %H:%M')}"
                )

        if (
            appointment.status == "completed"
            and appointment.auto_follow_up
            and appointment.follow_up_created_at is None
        ):
            followup_deadline = Deadline(
                user_id=current_user.id,
                case_id=appointment.case_id,
                title=f"Follow-up: {appointment.title}",
                description=appointment.follow_up_template or appointment.notes or "Follow up with client after appointment",
                due_date=appointment.end_time + timedelta(days=max(data.follow_up_due_days, 0)),
                priority="medium",
                reminder_days=1,
            )
            db.add(followup_deadline)
            appointment.follow_up_created_at = now
            followups_created += 1

    if reminders_flagged or appointments_auto_completed or followups_created:
        db.commit()

    return {
        "reminders_flagged": reminders_flagged,
        "appointments_auto_completed": appointments_auto_completed,
        "followups_created": followups_created,
        "reminders": reminders,
    }
