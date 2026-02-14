from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.models.calendar import Deadline
from app.models.user import User
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("/import")
async def import_cases(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import cases from JSON array. Updates existing by title match."""
    rows = body.get("data", [])
    if not rows:
        raise HTTPException(status_code=400, detail="No data provided")
    created = 0
    updated = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            title = row.get("title", "").strip()
            client_id = row.get("client_id", "").strip()
            if not title or not client_id:
                errors.append(f"Row {i+1}: title and client_id are required")
                continue
            existing = db.query(Case).filter(
                Case.user_id == current_user.id,
                Case.title.ilike(title)
            ).first()
            if existing:
                for field in ["client_id", "case_number", "case_type", "description", "court", "judge", "opposing_counsel", "status"]:
                    val = row.get(field)
                    if val is not None and str(val).strip():
                        setattr(existing, field, val)
                updated += 1
            else:
                case = Case(
                    user_id=current_user.id,
                    client_id=client_id,
                    title=title,
                    case_number=row.get("case_number"),
                    case_type=row.get("case_type", "other"),
                    description=row.get("description"),
                    court=row.get("court"),
                    judge=row.get("judge"),
                    opposing_counsel=row.get("opposing_counsel"),
                    status=row.get("status", "open"),
                )
                db.add(case)
                created += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.get("", response_model=list[CaseResponse])
async def list_cases(
    status: str | None = None,
    client_id: str | None = None,
    search: str | None = None,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Case).filter(Case.user_id == current_user.id)
    if status:
        query = query.filter(Case.status == status)
    if client_id:
        query = query.filter(Case.client_id == client_id)
    if search:
        query = query.filter(Case.title.ilike(f"%{search}%"))
    return query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=CaseResponse, status_code=201)
async def create_case(
    data: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = Case(user_id=current_user.id, **data.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    data: CaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=204)
async def delete_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()


@router.post("/automation/status-sync")
async def sync_case_statuses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    soon = now + timedelta(days=7)

    cases = db.query(Case).filter(
        Case.user_id == current_user.id,
        Case.status.notin_(["closed", "archived"]),
    ).all()

    updated = 0
    for case in cases:
        deadlines = db.query(Deadline).filter(
            Deadline.user_id == current_user.id,
            Deadline.case_id == case.id,
            Deadline.is_completed == False,
        ).all()

        if not deadlines:
            continue

        has_overdue = any(d.due_date < now for d in deadlines)
        has_upcoming = any(now <= d.due_date <= soon for d in deadlines)

        target_status = case.status
        if has_overdue:
            target_status = "pending"
        elif has_upcoming:
            target_status = "in_progress"
        else:
            target_status = "open"

        if case.status != target_status:
            case.status = target_status
            updated += 1

    if updated:
        db.commit()

    return {"updated": updated, "scanned": len(cases)}


@router.post("/automation/deadline-templates")
async def generate_case_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    cases = db.query(Case).filter(
        Case.user_id == current_user.id,
        Case.status.notin_(["closed", "archived"]),
    ).all()

    templates = [
        {"title": "Initial Case Review", "days": 3, "priority": "medium", "reminder_days": 1},
        {"title": "Evidence & Document Collection", "days": 10, "priority": "medium", "reminder_days": 2},
        {"title": "Draft Filing / Motion", "days": 21, "priority": "high", "reminder_days": 3},
        {"title": "Client Status Update", "days": 30, "priority": "low", "reminder_days": 2},
    ]

    created = 0
    skipped_cases = 0
    for case in cases:
        base_date = case.filing_date or now
        existing_titles = {
            d.title.strip().lower() for d in db.query(Deadline).filter(
                Deadline.user_id == current_user.id,
                Deadline.case_id == case.id,
            ).all()
        }

        case_created = 0
        for t in templates:
            if t["title"].lower() in existing_titles:
                continue
            deadline = Deadline(
                user_id=current_user.id,
                case_id=case.id,
                title=t["title"],
                description=f"Auto-generated milestone for {case.title}",
                due_date=base_date + timedelta(days=t["days"]),
                priority=t["priority"],
                reminder_days=t["reminder_days"],
            )
            db.add(deadline)
            case_created += 1

        if case_created == 0:
            skipped_cases += 1
        created += case_created

    if created:
        db.commit()

    return {
        "created": created,
        "cases_processed": len(cases),
        "cases_skipped": skipped_cases,
    }
