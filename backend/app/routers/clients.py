from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("/import")
async def import_clients(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import clients from JSON array. Updates existing by name match."""
    rows = body.get("data", [])
    if not rows:
        raise HTTPException(status_code=400, detail="No data provided")
    created = 0
    updated = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            name = row.get("name", "").strip()
            if not name:
                errors.append(f"Row {i+1}: name is required")
                continue
            # Check if client already exists (by name + user)
            existing = db.query(Client).filter(
                Client.user_id == current_user.id,
                Client.name.ilike(name)
            ).first()
            if existing:
                # Update existing record with non-empty fields
                for field in ["email", "phone", "address", "company", "status", "notes"]:
                    val = row.get(field)
                    if val is not None and str(val).strip():
                        setattr(existing, field, val)
                updated += 1
            else:
                client = Client(
                    user_id=current_user.id,
                    name=name,
                    email=row.get("email"),
                    phone=row.get("phone"),
                    address=row.get("address"),
                    company=row.get("company"),
                    status=row.get("status", "active"),
                    notes=row.get("notes"),
                )
                db.add(client)
                created += 1
        except Exception as e:
            errors.append(f"Row {i+1}: {str(e)}")
    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.get("/addresses")
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return distinct non-empty addresses used by this user's clients."""
    rows = (
        db.query(Client.address)
        .filter(Client.user_id == current_user.id, Client.address.isnot(None), Client.address != "")
        .distinct()
        .order_by(Client.address)
        .all()
    )
    return [r[0] for r in rows]


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Client).filter(Client.user_id == current_user.id)
    if status:
        query = query.filter(Client.status == status)
    if search:
        query = query.filter(Client.name.ilike(f"%{search}%"))
    return query.order_by(Client.created_at.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = Client(user_id=current_user.id, **data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()
