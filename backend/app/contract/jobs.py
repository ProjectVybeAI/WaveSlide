from typing import Literal

from pydantic import BaseModel, Field


class Job(BaseModel):
    """A background job (train or evaluate). One runs at a time."""

    id: str
    kind: Literal["train", "evaluate"]
    status: Literal["queued", "running", "done", "failed"]
    progress: float = Field(ge=0, le=1)
    message: str = ""
    result_id: str | None = None
    error: str | None = None
