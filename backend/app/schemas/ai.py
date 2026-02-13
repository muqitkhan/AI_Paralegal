from pydantic import BaseModel


class ResearchRequest(BaseModel):
    query: str
    jurisdiction: str | None = None
    area_of_law: str | None = None
    include_case_law: bool = True
    include_statutes: bool = True


class ResearchResponse(BaseModel):
    summary: str
    key_points: list[str]
    relevant_cases: list[dict]
    relevant_statutes: list[dict]
    recommendations: list[str]
    disclaimer: str = "This is AI-generated research and should be verified by a licensed attorney."
