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
    """Draft a legal document using AI."""
    client = get_openai_client()

    system_prompt = f"""You are an expert legal document drafter. Create a professional {doc_type} document based on the user's requirements.
{"Use this template as a base: " + template if template else ""}
Include all necessary legal language, clauses, and formatting.
Use placeholder brackets [PLACEHOLDER] for specific details that need to be filled in."""

    response = client.chat.completions.create(
        model=settings.AI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
        temperature=0.4,
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
