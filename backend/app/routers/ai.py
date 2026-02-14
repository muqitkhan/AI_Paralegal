from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.ai import ResearchRequest, ResearchResponse
from app.services.auth import get_current_user
from app.services.ai_service import legal_research, summarize_text, suggest_keywords, inline_complete, auto_fill_form

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/research", response_model=ResearchResponse)
async def do_research(
    request: ResearchRequest,
    current_user: User = Depends(get_current_user),
):
    result = await legal_research(
        query=request.query,
        jurisdiction=request.jurisdiction,
        area_of_law=request.area_of_law,
        include_case_law=request.include_case_law,
        include_statutes=request.include_statutes,
    )
    return ResearchResponse(**result)


@router.post("/summarize")
async def do_summarize(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    text = body.get("text", "")
    if not text:
        return {"error": "No text provided"}
    summary = await summarize_text(text)
    return {"summary": summary}


@router.post("/suggest")
async def do_suggest(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    partial_text = body.get("text", "")
    field_type = body.get("field_type", "general")
    context = body.get("context", "")
    if not partial_text or len(partial_text) < 2:
        return {"suggestions": []}
    try:
        suggestions = await suggest_keywords(partial_text, field_type, context)
        return {"suggestions": suggestions}
    except Exception:
        return {"suggestions": []}


@router.post("/complete")
async def do_complete(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Gmail-style inline sentence completion."""
    partial_text = body.get("text", "")
    field_type = body.get("field_type", "general")
    context = body.get("context", "")
    if not partial_text or len(partial_text) < 2:
        return {"completion": ""}
    try:
        completion = await inline_complete(partial_text, field_type, context)
        return {"completion": completion}
    except Exception:
        return {"completion": ""}


@router.post("/autofill")
async def do_autofill(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Auto-fill all form fields with AI-generated realistic content."""
    form_type = body.get("form_type", "")
    fields = body.get("fields", [])
    existing = body.get("existing", {})
    context = body.get("context", "")
    if not form_type or not fields:
        return {"error": "form_type and fields are required"}
    try:
        result = await auto_fill_form(form_type, fields, existing, context)
        return result
    except Exception as e:
        return {"error": str(e)}
