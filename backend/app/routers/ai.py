from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.ai import ResearchRequest, ResearchResponse
from app.services.auth import get_current_user
from app.services.ai_service import legal_research, summarize_text

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
