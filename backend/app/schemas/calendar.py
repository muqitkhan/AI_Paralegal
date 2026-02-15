from pydantic import BaseModel
from datetime import datetime


class CalendarEventCreate(BaseModel):
    title: str
    event_type: str = "other"
    description: str | None = None
    location: str | None = None
    start_time: datetime
    end_time: datetime
    is_all_day: bool = False
    reminder_minutes: int = 30


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    is_all_day: bool | None = None
    reminder_minutes: int | None = None


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    event_type: str
    description: str | None
    location: str | None
    start_time: datetime
    end_time: datetime
    is_all_day: bool
    reminder_minutes: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class DeadlineCreate(BaseModel):
    case_id: str | None = None
    title: str
    description: str | None = None
    due_date: datetime
    priority: str = "medium"
    reminder_days: int = 3


class DeadlineUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    priority: str | None = None
    is_completed: bool | None = None
    reminder_days: int | None = None


class DeadlineResponse(BaseModel):
    id: str
    case_id: str | None
    title: str
    description: str | None
    due_date: datetime
    priority: str
    is_completed: bool
    completed_at: datetime | None
    reminder_days: int
    created_at: datetime

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    title: str
    case_id: str | None = None
    client_id: str | None = None
    notes: str | None = None
    location: str | None = None
    start_time: datetime
    end_time: datetime
    status: str = "scheduled"
    reminder_minutes: int = 30
    auto_follow_up: bool = True
    follow_up_template: str | None = None


class AppointmentUpdate(BaseModel):
    title: str | None = None
    case_id: str | None = None
    client_id: str | None = None
    notes: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: str | None = None
    reminder_minutes: int | None = None
    auto_follow_up: bool | None = None
    follow_up_template: str | None = None


class AppointmentResponse(BaseModel):
    id: str
    title: str
    case_id: str | None
    client_id: str | None
    notes: str | None
    location: str | None
    start_time: datetime
    end_time: datetime
    status: str
    reminder_minutes: int
    auto_follow_up: bool
    follow_up_template: str | None
    reminder_sent_at: datetime | None
    follow_up_created_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentAutomationRunRequest(BaseModel):
    reminder_window_minutes: int = 60
    follow_up_due_days: int = 2


class AppointmentAutomationResponse(BaseModel):
    reminders_flagged: int
    appointments_auto_completed: int
    followups_created: int
    reminders: list[str]
