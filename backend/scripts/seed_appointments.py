from datetime import datetime, timedelta
import uuid
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User
from app.models.case import Case
from app.models.client import Client
from app.models.calendar import Appointment, AppointmentStatus


def main() -> None:
    db = SessionLocal()
    now = datetime.utcnow()

    user = db.query(User).filter(User.email == "demo@lawfirm.com").first()
    if not user:
        print("No demo user found: demo@lawfirm.com")
        db.close()
        return

    cases = db.query(Case).filter(Case.user_id == user.id).order_by(Case.created_at.asc()).all()
    clients = db.query(Client).filter(Client.user_id == user.id).order_by(Client.created_at.asc()).all()

    if not cases or not clients:
        print("No cases/clients found for demo user")
        db.close()
        return

    def case_id(idx: int) -> str:
        return cases[min(idx, len(cases) - 1)].id

    def client_id(idx: int) -> str:
        return clients[min(idx, len(clients) - 1)].id

    seed = [
        {
            "title": "TechCorp PI Hearing Prep Call",
            "day": 1,
            "start": (9, 30),
            "end": (10, 0),
            "status": AppointmentStatus.CONFIRMED,
            "location": "Zoom",
            "notes": "Finalize hearing outline and witness sequence.",
            "case_id": case_id(0),
            "client_id": client_id(0),
        },
        {
            "title": "Whitfield Property Site Walkthrough",
            "day": 2,
            "start": (13, 0),
            "end": (14, 0),
            "status": AppointmentStatus.SCHEDULED,
            "location": "42 Lakeshore Ave, Oakland",
            "notes": "Take photos and verify easement obstruction points.",
            "case_id": case_id(1),
            "client_id": client_id(1),
        },
        {
            "title": "Santos Immigration Check-in",
            "day": 4,
            "start": (11, 0),
            "end": (11, 30),
            "status": AppointmentStatus.SCHEDULED,
            "location": "Phone",
            "notes": "Review USCIS biometrics prep checklist.",
            "case_id": case_id(3),
            "client_id": client_id(3),
        },
        {
            "title": "BARG Compliance Debrief",
            "day": 6,
            "start": (15, 0),
            "end": (16, 0),
            "status": AppointmentStatus.CONFIRMED,
            "location": "Office - Conference Room B",
            "notes": "Discuss investigator questions and remediation.",
            "case_id": case_id(4),
            "client_id": client_id(4),
        },
        {
            "title": "Nimbus Contract Redline Review",
            "day": 8,
            "start": (10, 0),
            "end": (11, 0),
            "status": AppointmentStatus.SCHEDULED,
            "location": "Zoom",
            "notes": "Walk through indemnity and liability cap revisions.",
            "case_id": case_id(6),
            "client_id": client_id(7),
        },
    ]

    created = 0
    for item in seed:
        existing = (
            db.query(Appointment)
            .filter(Appointment.user_id == user.id, Appointment.title == item["title"])
            .first()
        )
        if existing:
            continue

        start_hour, start_minute = item["start"]
        end_hour, end_minute = item["end"]
        start_time = (now + timedelta(days=item["day"])).replace(
            hour=start_hour, minute=start_minute, second=0, microsecond=0
        )
        end_time = (now + timedelta(days=item["day"])).replace(
            hour=end_hour, minute=end_minute, second=0, microsecond=0
        )

        appointment = Appointment(
            id=str(uuid.uuid4()),
            user_id=user.id,
            case_id=item["case_id"],
            client_id=item["client_id"],
            title=item["title"],
            start_time=start_time,
            end_time=end_time,
            status=item["status"],
            location=item["location"],
            notes=item["notes"],
            reminder_minutes=30,
            auto_follow_up=True,
        )
        db.add(appointment)
        created += 1

    db.commit()
    total = db.query(Appointment).filter(Appointment.user_id == user.id).count()
    db.close()

    print(f"Inserted {created} demo appointments")
    print(f"Total appointments for demo user: {total}")


if __name__ == "__main__":
    main()
