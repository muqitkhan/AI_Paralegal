import json
from openai import OpenAI
from app.config import get_settings

settings = get_settings()


def get_openai_client() -> OpenAI:
    """Returns an OpenAI-compatible client pointing to Groq."""
    return OpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )


async def analyze_document(content: str) -> dict:
    """Analyze a legal document for key clauses, risks, and summary."""
    client = get_openai_client()

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are an expert legal document analyst. Analyze the provided legal document and return a JSON response with:
1. "summary": A concise summary of the document
2. "key_clauses": A list of important clauses identified
3. "risk_flags": A list of objects with "clause", "risk_level" (low/medium/high), and "explanation"
4. "recommendations": A list of actionable recommendations

Return ONLY valid JSON.""",
            },
            {"role": "user", "content": f"Analyze this legal document:\n\n{content[:6000]}"},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)


async def draft_document(doc_type: str, context: str, template: str | None = None) -> str:
    """Draft a legal document using AI. Produces polished, human-written output."""
    client = get_openai_client()

    today = __import__("datetime").date.today().strftime("%B %d, %Y")

    system_prompt = f"""You are a senior attorney at a prestigious law firm drafting a {doc_type} document.

CRITICAL RULES:
- Write the COMPLETE, FINAL document — NOT an outline, NOT bullet points.
- Use real, professional legal language exactly as it would appear in a filed document.
- Use today's date ({today}) where dates are needed.
- Use realistic sample party names (e.g., "Meridian Holdings, LLC", "Sarah J. Mitchell") — NEVER use "[PLACEHOLDER]", "[Party A]", "[INSERT]", or any bracketed placeholders.
- Include all standard sections, clauses, recitals, and signature blocks appropriate for this {doc_type}.
- Format with proper headings, numbered sections, and paragraphs.
- The document should be ready to print and sign — a lawyer should only need minor edits for their specific situation.
{"- Use this template as a structural guide: " + template if template else ""}

Write it as if you are billing $800/hour and this will be reviewed by a partner."""

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
        temperature=0.5,
        max_tokens=4000,
    )

    return response.choices[0].message.content


async def legal_research(
    query: str,
    jurisdiction: str | None = None,
    area_of_law: str | None = None,
    include_case_law: bool = True,
    include_statutes: bool = True,
) -> dict:
    """Perform AI-powered legal research."""
    client = get_openai_client()

    context_parts = [f"Research query: {query}"]
    if jurisdiction:
        context_parts.append(f"Jurisdiction: {jurisdiction}")
    if area_of_law:
        context_parts.append(f"Area of law: {area_of_law}")

    sections = []
    if include_case_law:
        sections.append('"relevant_cases": list of objects with "case_name", "citation", "relevance", and "key_holding"')
    if include_statutes:
        sections.append('"relevant_statutes": list of objects with "statute", "section", and "relevance"')

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert legal researcher. Provide comprehensive legal research based on the query.
Return a JSON response with:
1. "summary": A comprehensive summary of the legal issue
2. "key_points": A list of key legal points
3. {', '.join(sections) if sections else '"relevant_cases": [], "relevant_statutes": []'}
4. "recommendations": A list of practical recommendations

IMPORTANT: Always include a note that this is AI-generated research and should be verified.
Return ONLY valid JSON.""",
            },
            {"role": "user", "content": "\n".join(context_parts)},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    result["disclaimer"] = "This is AI-generated research and should be verified by a licensed attorney. It does not constitute legal advice."
    return result


async def summarize_text(text: str) -> str:
    """Summarize any legal text."""
    client = get_openai_client()

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an expert legal analyst. Provide a clear, concise summary of the following legal text. Highlight key points, obligations, and any notable provisions.",
            },
            {"role": "user", "content": text[:6000]},
        ],
        temperature=0.3,
    )

    return response.choices[0].message.content


async def suggest_keywords(
    partial_text: str,
    field_type: str = "general",
    context: str = "",
) -> list[str]:
    """Return AI-powered keyword/auto-complete suggestions for a form field."""
    client = get_openai_client()

    field_hints = {
        "case_title": "legal case titles (e.g. 'Smith v. Jones', 'In re Estate of...')",
        "case_type": "legal case types (e.g. civil, criminal, corporate, family, real_estate, immigration, intellectual_property, labor, tax)",
        "court": "US court names (e.g. 'U.S. District Court for the Southern District of New York', 'Superior Court of California, County of Los Angeles', 'U.S. Court of Appeals for the Ninth Circuit')",
        "judge": "judge name format (e.g. 'Hon. Jane Smith')",
        "description": "legal descriptions or summaries",
        "document_title": "legal document titles",
        "document_content": "legal document content, clauses, and provisions",
        "research_query": "legal research queries",
        "jurisdiction": "jurisdictions (e.g. 'California', 'Federal', 'New York')",
        "client_name": "client/company names",
        "company_name": "company or organization names",
        "address": "US mailing addresses (street, city, state, ZIP) like USPS format (e.g. '123 Main St, Springfield, IL 62704')",
        "location": "locations, office addresses, courtrooms, conference rooms (e.g. 'Courtroom 4B, Federal Building', '200 Park Ave, New York, NY')",
        "time_entry": "time entry descriptions for legal billing",
        "deadline_title": "legal deadline or filing titles",
        "event_title": "calendar event titles for a law firm",
        "general": "legal terms and suggestions",
    }

    hint = field_hints.get(field_type, field_hints["general"])

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are an auto-complete assistant for a legal practice management system.
Given partial text, suggest 5 completions for the field type: {hint}.
{f"Context: {context}" if context else ""}
Return ONLY a JSON object with a single key "suggestions" containing an array of 5 short suggestion strings.
Each suggestion should complete or extend the partial text naturally.""",
            },
            {"role": "user", "content": f"Partial text: \"{partial_text}\""},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    return result.get("suggestions", [])


async def inline_complete(
    partial_text: str,
    field_type: str = "general",
    context: str = "",
) -> str:
    """Gmail-style inline sentence completion. Returns ONLY the remaining text to append."""
    client = get_openai_client()

    field_hints = {
        "case_title": "legal case titles (e.g. 'Smith v. Jones', 'In re Estate of...')",
        "case_type": "legal case types",
        "court": "US court names (e.g. 'U.S. District Court for the Southern District of New York', 'Superior Court of California, County of Los Angeles')",
        "judge": "judge name (e.g. 'Hon. Jane Smith')",
        "description": "legal descriptions",
        "document_title": "legal document titles",
        "document_content": "legal document content, clauses, provisions",
        "research_query": "legal research queries",
        "jurisdiction": "jurisdictions (e.g. 'California', 'Federal')",
        "client_name": "client or company names",
        "company_name": "company or organization names",
        "address": "US mailing addresses (street, city, state, ZIP) in USPS format",
        "location": "locations, office addresses, courtrooms (e.g. 'Courtroom 4B', '200 Park Ave, New York, NY')",
        "time_entry": "time entry descriptions for legal billing",
        "deadline_title": "legal deadline or filing titles",
        "event_title": "calendar event titles for a law firm",
        "general": "legal terms",
    }

    hint = field_hints.get(field_type, field_hints["general"])

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""You are an inline auto-complete assistant for a legal practice management system.
The user is typing in a field for: {hint}.
{f"Context: {context}" if context else ""}
Given the partial text, return ONLY a JSON object with key "completion" containing the REST of the text that should be appended.
Do NOT repeat the partial text. Only return what comes AFTER it.
Keep it short and natural (1 sentence max, usually just a few words).
If the partial text already looks complete, return an empty string.""",
            },
            {"role": "user", "content": f"{partial_text}"},
        ],
        temperature=0.3,
        max_tokens=80,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    completion = result.get("completion", "")
    # Safety: if the AI repeated the input, strip it
    if completion.lower().startswith(partial_text.lower()):
        completion = completion[len(partial_text):]
    return completion


async def auto_fill_form(form_type: str, fields: list[str], existing: dict | None = None, context: str = "") -> dict:
    """Auto-fill a form with AI-generated realistic data based on form type and context."""
    client = get_openai_client()

    today = __import__("datetime").date.today().strftime("%Y-%m-%d")

    form_prompts = {
        "client": "Generate realistic data for a new law firm client. Use a realistic American name, real-looking email, phone (555-XXX-XXXX), company name, and street address in a US city.",
        "case": "Generate realistic data for a legal case. Create a realistic case title (e.g. 'Martinez v. Pacific Coast Holdings'), case description, select an appropriate court, and suggest a judge name. Use today's date for filing.",
        "document": "Generate realistic data for a legal document. Create a professional title and comprehensive content appropriate to the document type.",
        "time_entry": "Generate a realistic billable time entry description for a law firm. Include the legal work performed (e.g. 'Drafted motion for summary judgment', 'Client consultation re: settlement options'). Suggest realistic hours (0.25 to 4.0) and rate ($200-$500/hr).",
        "deadline": "Generate a realistic legal deadline. Include a descriptive title (e.g. 'Discovery Response Deadline — Martinez v. Pacific Coast'), description of what's due, a due date within the next 30-90 days, and appropriate priority.",
        "event": "Generate a realistic law firm calendar event. Include a professional title, event type (hearing/meeting/deposition/filing/consultation), location, and description.",
        "invoice_item": "Generate a realistic invoice line item description for legal services.",
    }

    prompt = form_prompts.get(form_type, "Generate realistic professional data for the form fields.")

    fields_str = ", ".join(fields)
    existing_str = ""
    if existing:
        non_empty = {k: v for k, v in existing.items() if v}
        if non_empty:
            existing_str = f"\nAlready provided values (keep these, fill the rest): {json.dumps(non_empty)}"

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""{prompt}
{f"Additional context: {context}" if context else ""}
Today's date: {today}
{existing_str}

Return ONLY a JSON object with these exact keys: {fields_str}
Fill every field with realistic, professional content. Never use placeholders like [X] or TBD.
For dates, use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM).
For numbers, return them as numbers not strings.""",
            },
            {"role": "user", "content": f"Auto-fill the {form_type} form"},
        ],
        temperature=0.6,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)
