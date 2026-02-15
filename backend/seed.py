"""
Seed script: populates the database with realistic demo data.
Run:  cd backend && python seed.py
"""

import uuid, sys, os
from datetime import datetime, timedelta

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.client import Client, ClientStatus
from app.models.case import Case, CaseStatus, CaseType
from app.models.document import Document, DocumentType, DocumentTemplate
from app.models.billing import Invoice, InvoiceStatus, InvoiceItem, TimeEntry
from app.models.calendar import (
     CalendarEvent,
     EventType,
     Deadline,
     DeadlinePriority,
     Appointment,
     AppointmentStatus,
)
from app.services.auth import hash_password

# Create tables if missing
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ──────────── helper ────────────
now = datetime.utcnow()
uid = lambda: str(uuid.uuid4())


def d(days: int) -> datetime:
    """Return a datetime `days` from now (negative = past)."""
    return now + timedelta(days=days)


# ──────────── 1. demo user ────────────
demo_user = db.query(User).filter(User.email == "demo@lawfirm.com").first()
if not demo_user:
    demo_user = User(
        id=uid(),
        email="demo@lawfirm.com",
        name="Sarah Mitchell",
        hashed_password=hash_password("demo1234"),
        firm_name="Mitchell & Associates LLP",
        bar_number="CA-287401",
        phone="(415) 555-0142",
    )
    db.add(demo_user)
    db.flush()

USER = demo_user.id

# ──────────── 2. clients ────────────
clients_data = [
    dict(name="TechCorp Inc.", email="legal@techcorp.io", phone="(415) 555-1001",
         company="TechCorp Inc.", status=ClientStatus.ACTIVE,
         address="100 Market St, Suite 400, San Francisco, CA 94105",
         notes="Series B startup – employment & IP matters."),
    dict(name="James Whitfield", email="j.whitfield@email.com", phone="(510) 555-2002",
         company=None, status=ClientStatus.ACTIVE,
         address="42 Lakeshore Ave, Oakland, CA 94610",
         notes="Real-estate investor – ongoing lease disputes."),
    dict(name="Greenleaf Properties LLC", email="info@greenleaf.com", phone="(650) 555-3003",
         company="Greenleaf Properties LLC", status=ClientStatus.ACTIVE,
         address="200 Sand Hill Rd, Menlo Park, CA 94025",
         notes="Commercial real estate company. Multiple properties."),
    dict(name="Maria Santos", email="m.santos@email.com", phone="(408) 555-4004",
         company=None, status=ClientStatus.ACTIVE,
         address="880 N 1st St, San Jose, CA 95112",
         notes="Immigration case – H-1B to green card pathway."),
    dict(name="Bay Area Restaurants Group", email="legal@baresg.com", phone="(415) 555-5005",
         company="Bay Area Restaurants Group", status=ClientStatus.ACTIVE,
         address="500 Columbus Ave, San Francisco, CA 94133",
         notes="Restaurant chain – labor law compliance."),
    dict(name="Chen Medical Group", email="admin@chenmed.com", phone="(650) 555-6006",
         company="Chen Medical Group", status=ClientStatus.PROSPECTIVE,
         address="300 El Camino Real, Palo Alto, CA 94301",
         notes="Prospective – healthcare compliance consultation."),
    dict(name="David Park", email="dpark@email.com", phone="(510) 555-7007",
         company=None, status=ClientStatus.INACTIVE,
         address="123 Telegraph Ave, Berkeley, CA 94704",
         notes="Prior DUI defense – case closed, paid in full."),
    dict(name="Nimbus Software Solutions", email="legal@nimbus.dev", phone="(415) 555-8008",
         company="Nimbus Software Solutions", status=ClientStatus.ACTIVE,
         address="600 Townsend St, San Francisco, CA 94103",
         notes="SaaS company – contract reviews & IP licensing."),
]

client_objs = []
for cd in clients_data:
    c = Client(id=uid(), user_id=USER, **cd)
    db.add(c)
    client_objs.append(c)
db.flush()

# ──────────── 3. cases ────────────
cases_data = [
    dict(client=0, title="TechCorp v. DataSync – Trade Secret Misappropriation",
         case_number="2024-CV-04821", case_type=CaseType.IP, status=CaseStatus.IN_PROGRESS,
         description="Trade secret misappropriation claim arising from former employee's data transfer to competitor DataSync Labs.",
         court="U.S. District Court – N.D. California", judge="Hon. Patricia Chen",
         opposing_counsel="Robert Kline, Kline & Meyers LLP",
         filing_date=d(-45), estimated_value=2500000),
    dict(client=1, title="Whitfield v. Lakewood HOA – Easement Dispute",
         case_number="2024-CV-07293", case_type=CaseType.REAL_ESTATE, status=CaseStatus.OPEN,
         description="Dispute over shared driveway easement rights with Lakewood Homeowners Association.",
         court="Alameda County Superior Court", judge="Hon. Michael Torres",
         opposing_counsel="Lisa Huang, Hartley & Associates",
         filing_date=d(-20), estimated_value=350000),
    dict(client=2, title="Greenleaf – 200 Sand Hill Lease Negotiations",
         case_number="2024-CORP-0098", case_type=CaseType.CORPORATE, status=CaseStatus.IN_PROGRESS,
         description="Negotiation of 10-year commercial lease for anchor tenant at Sand Hill Road property.",
         court=None, judge=None, opposing_counsel="William Drake, Drake Law Group",
         filing_date=d(-30), estimated_value=4800000),
    dict(client=3, title="Santos – I-140 / Adjustment of Status",
         case_number="2024-IMM-2047", case_type=CaseType.IMMIGRATION, status=CaseStatus.PENDING,
         description="Employment-based green card petition (EB-2) with concurrent adjustment of status filing.",
         court="USCIS – California Service Center", judge=None,
         opposing_counsel=None, filing_date=d(-60), estimated_value=15000),
    dict(client=4, title="BARG – DOL Wage & Hour Audit Response",
         case_number="2024-LAB-0512", case_type=CaseType.LABOR, status=CaseStatus.IN_PROGRESS,
         description="Response to Department of Labor audit regarding tip pooling and overtime compliance for 12 restaurant locations.",
         court=None, judge=None, opposing_counsel="DOL Investigator – M. Richardson",
         filing_date=d(-15), estimated_value=180000),
    dict(client=0, title="TechCorp – Series B Financing Agreements",
         case_number="2024-CORP-0145", case_type=CaseType.CORPORATE, status=CaseStatus.OPEN,
         description="Review and negotiation of Series B preferred stock purchase agreement, investor rights agreement, and related documents.",
         court=None, judge=None, opposing_counsel="Fenwick & West LLP (lead investor counsel)",
         filing_date=d(-10), estimated_value=25000000),
    dict(client=7, title="Nimbus – SaaS License Agreement Review",
         case_number="2024-IP-0876", case_type=CaseType.IP, status=CaseStatus.OPEN,
         description="Review master SaaS subscription agreement and data processing addendum for enterprise client.",
         court=None, judge=None, opposing_counsel=None,
         filing_date=d(-5), estimated_value=500000),
]

case_objs = []
for cd in cases_data:
    ci = cd.pop("client")
    c = Case(id=uid(), user_id=USER, client_id=client_objs[ci].id, **cd)
    db.add(c)
    case_objs.append(c)
db.flush()

# ──────────── 4. documents ────────────
docs_data = [
    dict(case=0, title="Complaint – Trade Secret Misappropriation", doc_type=DocumentType.PLEADING,
         content="UNITED STATES DISTRICT COURT\nNORTHERN DISTRICT OF CALIFORNIA\n\nTECHCORP INC., Plaintiff,\nv.\nDATASYNC LABS INC., Defendant.\n\nCase No. 2024-CV-04821\n\nCOMPLAINT FOR TRADE SECRET MISAPPROPRIATION\n\nPlaintiff TechCorp Inc. alleges as follows...",
         ai_summary="Complaint alleging trade secret misappropriation under DTSA and California UTSA. Key claims involve unauthorized transfer of proprietary ML algorithms by former lead engineer."),
    dict(case=0, title="Motion for Preliminary Injunction", doc_type=DocumentType.MOTION,
         content="MOTION FOR PRELIMINARY INJUNCTION\n\nPlaintiff TechCorp Inc. respectfully moves this Court for a preliminary injunction prohibiting Defendant DataSync Labs from using, disclosing, or benefiting from Plaintiff's trade secrets...",
         ai_summary="Motion seeking immediate injunctive relief to prevent continued use of misappropriated trade secrets. Argues irreparable harm and likelihood of success on the merits."),
    dict(case=1, title="Demand Letter – Easement Rights", doc_type=DocumentType.LETTER,
         content="Dear Lakewood HOA Board of Directors,\n\nThis firm represents Mr. James Whitfield regarding the shared driveway easement recorded in Book 4521, Page 287 of the Alameda County Recorder's Office...",
         ai_summary="Demand letter asserting client's easement rights, requesting removal of unauthorized barriers, and threatening suit if not resolved within 30 days."),
    dict(case=2, title="Commercial Lease Agreement – Draft v3", doc_type=DocumentType.CONTRACT,
         content="COMMERCIAL LEASE AGREEMENT\n\nThis Lease Agreement ('Agreement') is made as of [DATE] by and between Greenleaf Properties LLC ('Landlord') and [TENANT NAME] ('Tenant')...\n\nTerm: 10 years with two 5-year renewal options\nBase Rent: $48/sq ft/year with 3% annual escalation...",
         ai_summary="Draft commercial lease for 15,000 sq ft anchor space. Key terms: 10-year term, $48/sqft base rent, 3% annual escalation, $500K TI allowance. Notable risk: broad force majeure clause favoring tenant."),
    dict(case=3, title="I-140 Petition Cover Letter", doc_type=DocumentType.LETTER,
         content="U.S. Citizenship and Immigration Services\nCalifornia Service Center\n\nRe: I-140 Immigrant Petition – Maria Santos\n\nDear Officer,\n\nEnclosed please find Form I-140, Immigrant Petition for Alien Workers, filed on behalf of Ms. Maria Santos under the EB-2 category...",
         ai_summary="Cover letter for EB-2 immigrant petition. Highlights advanced degree qualifications, 8 years experience in biomedical engineering, and employer sponsorship by BioTech Solutions Inc."),
    dict(case=4, title="Response to DOL Investigation", doc_type=DocumentType.BRIEF,
         content="RESPONSE TO DEPARTMENT OF LABOR INVESTIGATION\nCase Reference: WHD-2024-0512\n\nOn behalf of Bay Area Restaurants Group, we submit this response to the Wage and Hour Division's investigation...",
         ai_summary="Comprehensive response to DOL wage/hour investigation. Addresses tip pooling compliance, overtime calculations, and record-keeping requirements across 12 locations."),
    dict(case=5, title="Series B Stock Purchase Agreement", doc_type=DocumentType.CONTRACT,
         content="SERIES B PREFERRED STOCK PURCHASE AGREEMENT\n\nThis Series B Preferred Stock Purchase Agreement ('Agreement') is entered into as of [DATE] by and among TechCorp Inc., a Delaware corporation ('Company'), and the investors listed on Exhibit A ('Investors')...",
         ai_summary="SPA for $25M Series B round. Key terms: $8.50/share, 1x non-participating liquidation preference, broad-based weighted average anti-dilution, standard protective provisions."),
    dict(case=5, title="Investor Rights Agreement", doc_type=DocumentType.AGREEMENT,
         content="INVESTOR RIGHTS AGREEMENT\n\nThis Investor Rights Agreement ('Agreement') is made as of [DATE] among TechCorp Inc. and the holders of the Company's Preferred Stock...",
         ai_summary="IRA granting demand and piggyback registration rights, information rights, and right of first offer. Board composition: 2 common, 2 preferred, 1 independent."),
    dict(case=6, title="SaaS Master Subscription Agreement – Review", doc_type=DocumentType.CONTRACT,
         content="MASTER SUBSCRIPTION AGREEMENT\n\nThis Master Subscription Agreement ('MSA') governs the use of Nimbus Software Solutions' cloud-based platform by Enterprise Client...",
         ai_summary="Enterprise SaaS MSA review. Flagged issues: unlimited liability for IP infringement, overly broad indemnification, 99.9% SLA with weak remedies. Recommended 6 key revisions.",
         ai_risk_flags='["Unlimited liability clause in Section 8.2", "Broad indemnification scope in Section 9.1", "Weak SLA remedies – only service credits, no termination right", "Auto-renewal with 90-day notice period", "Governing law: Delaware (client prefers California)", "Data processing addendum references outdated CCPA version"]'),
]

for dd in docs_data:
    ci = dd.pop("case")
    doc = Document(id=uid(), user_id=USER, case_id=case_objs[ci].id, **dd)
    db.add(doc)
db.flush()

# ──────────── 5. document templates ────────────
templates = [
    dict(name="Non-Disclosure Agreement (NDA)", doc_type=DocumentType.CONTRACT,
         content="NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement ('Agreement') is entered into as of {{date}} by and between {{party_a}} ('Disclosing Party') and {{party_b}} ('Receiving Party')...\n\n1. Definition of Confidential Information...\n2. Obligations of Receiving Party...\n3. Term: {{term_years}} years...",
         variables='["date", "party_a", "party_b", "term_years"]',
         description="Standard mutual NDA template for business relationships.", is_system=True),
    dict(name="Engagement Letter", doc_type=DocumentType.LETTER,
         content="Dear {{client_name}},\n\nThank you for selecting {{firm_name}} to represent you in connection with {{matter_description}}.\n\nScope of Representation...\nFee Arrangement: {{fee_type}} at {{rate}}...",
         variables='["client_name", "firm_name", "matter_description", "fee_type", "rate"]',
         description="Attorney-client engagement letter template.", is_system=True),
    dict(name="Demand Letter", doc_type=DocumentType.LETTER,
         content="{{date}}\n\nVIA CERTIFIED MAIL\n\n{{recipient_name}}\n{{recipient_address}}\n\nRe: {{subject}}\n\nDear {{recipient_name}},\n\nThis firm represents {{client_name}} regarding {{matter}}...",
         variables='["date", "recipient_name", "recipient_address", "subject", "client_name", "matter"]',
         description="General demand letter template.", is_system=True),
    dict(name="Motion to Dismiss", doc_type=DocumentType.MOTION,
         content="IN THE {{court}}\n\n{{plaintiff}}, Plaintiff,\nv.\n{{defendant}}, Defendant.\n\nCase No. {{case_number}}\n\nDEFENDANT'S MOTION TO DISMISS\n\nDefendant {{defendant}} hereby moves this Court to dismiss Plaintiff's Complaint...",
         variables='["court", "plaintiff", "defendant", "case_number"]',
         description="Template for filing a motion to dismiss.", is_system=True),
]

for td in templates:
    tmpl = DocumentTemplate(id=uid(), **td)
    db.add(tmpl)
db.flush()

# ──────────── 6. invoices & items ────────────
inv_data = [
    dict(client=0, inv_num="INV-2024-001", status=InvoiceStatus.PAID,
         subtotal=12500, tax_rate=0, tax_amount=0, total=12500,
         due_date=d(-30), paid_at=d(-25), notes="TechCorp v. DataSync – initial retainer and case evaluation."),
    dict(client=0, inv_num="INV-2024-002", status=InvoiceStatus.SENT,
         subtotal=28750, tax_rate=0, tax_amount=0, total=28750,
         due_date=d(15), paid_at=None, notes="TechCorp v. DataSync – discovery phase & motion drafting (Oct 2024)."),
    dict(client=1, inv_num="INV-2024-003", status=InvoiceStatus.SENT,
         subtotal=4200, tax_rate=0, tax_amount=0, total=4200,
         due_date=d(10), paid_at=None, notes="Whitfield easement dispute – demand letter & case research."),
    dict(client=2, inv_num="INV-2024-004", status=InvoiceStatus.DRAFT,
         subtotal=18000, tax_rate=0, tax_amount=0, total=18000,
         due_date=d(30), paid_at=None, notes="Greenleaf lease negotiations – drafting & review (Nov 2024)."),
    dict(client=3, inv_num="INV-2024-005", status=InvoiceStatus.PAID,
         subtotal=5000, tax_rate=0, tax_amount=0, total=5000,
         due_date=d(-15), paid_at=d(-12), notes="Santos immigration – I-140 petition preparation."),
    dict(client=4, inv_num="INV-2024-006", status=InvoiceStatus.OVERDUE,
         subtotal=15800, tax_rate=0, tax_amount=0, total=15800,
         due_date=d(-10), paid_at=None, notes="BARG DOL audit – response preparation & compliance review."),
    dict(client=7, inv_num="INV-2024-007", status=InvoiceStatus.DRAFT,
         subtotal=3500, tax_rate=0, tax_amount=0, total=3500,
         due_date=d(25), paid_at=None, notes="Nimbus SaaS agreement review & redline."),
]

inv_objs = []
for ivd in inv_data:
    ci = ivd.pop("client")
    inv = Invoice(id=uid(), user_id=USER, client_id=client_objs[ci].id,
                  invoice_number=ivd.pop("inv_num"), **ivd)
    db.add(inv)
    inv_objs.append(inv)
db.flush()

# Invoice line items
items_data = [
    # INV-001
    (0, "Initial case evaluation & strategy meeting (5 hrs)", 5, 450, 2250),
    (0, "Complaint drafting and filing", 1, 5000, 5000),
    (0, "Trade secret audit & evidence review (10 hrs)", 10, 450, 4500),
    (0, "Court filing fees & service of process", 1, 750, 750),
    # INV-002
    (1, "Discovery – document review (25 hrs)", 25, 450, 11250),
    (1, "Deposition preparation (8 hrs)", 8, 450, 3600),
    (1, "Motion for preliminary injunction drafting (15 hrs)", 15, 450, 6750),
    (1, "Expert witness consultation", 1, 5000, 5000),
    (1, "Research & analysis (5 hrs)", 5, 430, 2150),
    # INV-003
    (2, "Legal research – easement law (4 hrs)", 4, 400, 1600),
    (2, "Demand letter drafting & revision", 1, 1500, 1500),
    (2, "Client meeting & strategy session (2 hrs)", 2, 400, 800),
    (2, "Title search review", 1, 300, 300),
    # INV-004
    (3, "Lease agreement drafting – v1-v3 (20 hrs)", 20, 450, 9000),
    (3, "Tenant negotiation support (10 hrs)", 10, 450, 4500),
    (3, "Environmental compliance review (5 hrs)", 5, 400, 2000),
    (3, "Title & zoning analysis", 1, 2500, 2500),
    # INV-005
    (4, "I-140 petition preparation (8 hrs)", 8, 375, 3000),
    (4, "Supporting documentation review", 1, 1000, 1000),
    (4, "Government filing fees", 1, 1000, 1000),
    # INV-006
    (5, "DOL investigation response (20 hrs)", 20, 450, 9000),
    (5, "Payroll records audit (8 hrs)", 8, 400, 3200),
    (5, "Compliance training materials preparation", 1, 2500, 2500),
    (5, "Management consultation calls (3 hrs)", 3, 350, 1050),
    # INV-007
    (6, "MSA review & redline (5 hrs)", 5, 400, 2000),
    (6, "DPA review & compliance check (3 hrs)", 3, 400, 1200),
    (6, "Client advisory memo", 1, 300, 300),
]

for inv_idx, desc, qty, rate, amount in items_data:
    item = InvoiceItem(id=uid(), invoice_id=inv_objs[inv_idx].id,
                       description=desc, quantity=qty, rate=rate, amount=amount)
    db.add(item)
db.flush()

# ──────────── 7. time entries ────────────
time_data = [
    dict(case=0, desc="Review trade secret evidence files & classify documents", hours=4.5, rate=450, date=d(-3)),
    dict(case=0, desc="Draft supplemental declaration for PI motion", hours=3.0, rate=450, date=d(-2)),
    dict(case=0, desc="Conference call with opposing counsel re: discovery schedule", hours=1.0, rate=450, date=d(-1)),
    dict(case=1, desc="Research California easement law – Civil Code §§ 801-813", hours=2.5, rate=400, date=d(-4)),
    dict(case=1, desc="Draft demand letter to Lakewood HOA", hours=2.0, rate=400, date=d(-3)),
    dict(case=2, desc="Review tenant's counter-proposal on lease terms", hours=3.0, rate=450, date=d(-2)),
    dict(case=2, desc="Redline lease agreement v3 – incorporate negotiated changes", hours=4.0, rate=450, date=d(-1)),
    dict(case=3, desc="Prepare I-140 supporting documents checklist", hours=1.5, rate=375, date=d(-5)),
    dict(case=4, desc="Review DOL investigator's supplemental information request", hours=2.0, rate=450, date=d(-2)),
    dict(case=4, desc="Analyze tip pooling records for 3 locations", hours=3.5, rate=400, date=d(-1)),
    dict(case=5, desc="Review Series B term sheet & prepare negotiation memo", hours=3.0, rate=450, date=d(-4)),
    dict(case=5, desc="Draft SPA provisions – anti-dilution & protective provisions", hours=5.0, rate=450, date=d(-3)),
    dict(case=6, desc="Initial review of Nimbus MSA & identify risk areas", hours=2.5, rate=400, date=d(-2)),
    dict(case=6, desc="Draft redline & advisory memo for client", hours=3.0, rate=400, date=d(-1)),
]

for td in time_data:
    ci = td.pop("case")
    te = TimeEntry(id=uid(), user_id=USER, case_id=case_objs[ci].id,
                   description=td["desc"], hours=td["hours"], rate=td["rate"],
                   date=td["date"], is_billable=True, is_billed=False)
    db.add(te)
db.flush()

# ──────────── 8. calendar events ────────────
events_data = [
    dict(title="TechCorp v. DataSync – Case Management Conference",
         event_type=EventType.HEARING, location="Federal Courthouse, Courtroom 4B",
         start_time=d(3) .replace(hour=10, minute=0),
         end_time=d(3).replace(hour=11, minute=0),
         description="Initial case management conference before Judge Chen."),
    dict(title="Whitfield – Client Strategy Meeting",
         event_type=EventType.MEETING, location="Office – Conference Room A",
         start_time=d(2).replace(hour=14, minute=0),
         end_time=d(2).replace(hour=15, minute=30),
         description="Review demand letter response and discuss litigation options."),
    dict(title="Greenleaf – Tenant Negotiation Call",
         event_type=EventType.MEETING, location="Zoom",
         start_time=d(5).replace(hour=11, minute=0),
         end_time=d(5).replace(hour=12, minute=0),
         description="Negotiate remaining lease terms with tenant's counsel."),
    dict(title="Santos – USCIS Biometrics Appointment",
         event_type=EventType.OTHER, location="USCIS Application Support Center, San Jose",
         start_time=d(14).replace(hour=9, minute=30),
         end_time=d(14).replace(hour=10, minute=30),
         description="Client's biometrics appointment for I-485 adjustment of status."),
    dict(title="BARG – DOL Investigator Meeting",
         event_type=EventType.MEETING, location="Office – Conference Room B",
         start_time=d(7).replace(hour=10, minute=0),
         end_time=d(7).replace(hour=12, minute=0),
         description="Meeting with DOL investigator to present compliance documentation."),
    dict(title="TechCorp – Expert Witness Deposition",
         event_type=EventType.DEPOSITION, location="Kline & Meyers LLP Office",
         start_time=d(10).replace(hour=9, minute=0),
         end_time=d(10).replace(hour=17, minute=0),
         description="Deposition of plaintiff's expert witness on trade secret valuation."),
    dict(title="Monthly Firm Review",
         event_type=EventType.MEETING, location="Office – Main Conference Room",
         start_time=d(12).replace(hour=16, minute=0),
         end_time=d(12).replace(hour=17, minute=30),
         description="Monthly review of active cases, billing, and upcoming deadlines."),
]

for ed in events_data:
    ev = CalendarEvent(id=uid(), user_id=USER, **ed)
    db.add(ev)
db.flush()

# ──────────── 9. deadlines ────────────
deadlines_data = [
    dict(case=0, title="File Opposition to Motion to Dismiss",
         due_date=d(5), priority=DeadlinePriority.CRITICAL,
         description="Deadline to file opposition brief to defendant's MTD. Court-imposed deadline, no extensions."),
    dict(case=0, title="Produce Initial Disclosures",
         due_date=d(12), priority=DeadlinePriority.HIGH,
         description="FRCP Rule 26(a)(1) initial disclosures due."),
    dict(case=1, title="Serve Discovery Requests on HOA",
         due_date=d(8), priority=DeadlinePriority.MEDIUM,
         description="Serve interrogatories and requests for production on Lakewood HOA."),
    dict(case=2, title="Finalize Lease Agreement",
         due_date=d(15), priority=DeadlinePriority.HIGH,
         description="Target date to execute final lease agreement with anchor tenant."),
    dict(case=3, title="RFE Response Deadline",
         due_date=d(20), priority=DeadlinePriority.CRITICAL,
         description="USCIS Request for Evidence response due for I-140 petition. Statutory 87-day deadline."),
    dict(case=4, title="Submit DOL Compliance Documentation",
         due_date=d(6), priority=DeadlinePriority.HIGH,
         description="Submit additional payroll records and compliance documentation to DOL investigator."),
    dict(case=5, title="Series B Closing Target",
         due_date=d(18), priority=DeadlinePriority.MEDIUM,
         description="Target closing date for Series B financing round."),
    dict(case=6, title="Return Redlined MSA to Client",
         due_date=d(4), priority=DeadlinePriority.LOW,
         description="Deliver redlined MSA and advisory memo to Nimbus legal team."),
]

for dd in deadlines_data:
    ci = dd.pop("case")
    dl = Deadline(id=uid(), user_id=USER, case_id=case_objs[ci].id, **dd)
    db.add(dl)

# ──────────── 10. appointments ────────────
appointments_data = [
     dict(
          case=0,
          client=0,
          title="TechCorp PI Hearing Prep Call",
          start_time=d(1).replace(hour=9, minute=30),
          end_time=d(1).replace(hour=10, minute=0),
          status=AppointmentStatus.CONFIRMED,
          location="Zoom",
          notes="Finalize hearing outline and witness sequence.",
          reminder_minutes=30,
          auto_follow_up=True,
     ),
     dict(
          case=1,
          client=1,
          title="Whitfield Property Site Walkthrough",
          start_time=d(2).replace(hour=13, minute=0),
          end_time=d(2).replace(hour=14, minute=0),
          status=AppointmentStatus.SCHEDULED,
          location="42 Lakeshore Ave, Oakland",
          notes="Take photos and verify easement obstruction points.",
          reminder_minutes=45,
          auto_follow_up=True,
     ),
     dict(
          case=3,
          client=3,
          title="Santos Immigration Check-in",
          start_time=d(4).replace(hour=11, minute=0),
          end_time=d(4).replace(hour=11, minute=30),
          status=AppointmentStatus.SCHEDULED,
          location="Phone",
          notes="Review USCIS biometrics prep checklist.",
          reminder_minutes=60,
          auto_follow_up=True,
     ),
     dict(
          case=4,
          client=4,
          title="BARG Compliance Debrief",
          start_time=d(6).replace(hour=15, minute=0),
          end_time=d(6).replace(hour=16, minute=0),
          status=AppointmentStatus.CONFIRMED,
          location="Office – Conference Room B",
          notes="Discuss investigator questions and payroll gap remediation.",
          reminder_minutes=30,
          auto_follow_up=True,
     ),
     dict(
          case=6,
          client=7,
          title="Nimbus Contract Redline Review",
          start_time=d(8).replace(hour=10, minute=0),
          end_time=d(8).replace(hour=11, minute=0),
          status=AppointmentStatus.SCHEDULED,
          location="Zoom",
          notes="Walk through indemnity and liability cap revisions.",
          reminder_minutes=30,
          auto_follow_up=True,
     ),
]

for ad in appointments_data:
     case_idx = ad.pop("case")
     client_idx = ad.pop("client")
     appt = Appointment(
          id=uid(),
          user_id=USER,
          case_id=case_objs[case_idx].id,
          client_id=client_objs[client_idx].id,
          **ad,
     )
     db.add(appt)

# ──────────── commit ────────────
db.commit()
db.close()

print("✅  Demo data seeded successfully!")
print(f"   User:  demo@lawfirm.com / demo1234")
print(f"   {len(clients_data)} clients, {len(cases_data)} cases, {len(docs_data)} documents")
print(f"   {len(templates)} templates, {len(inv_data)} invoices, {len(time_data)} time entries")
print(f"   {len(events_data)} events, {len(deadlines_data)} deadlines, {len(appointments_data)} appointments")
