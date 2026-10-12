"""One error shape for every endpoint: {"error": {"code", "message", "details"}}."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.contract.common import ErrorCode


class ErrorBody(BaseModel):
    code: ErrorCode
    message: str
    details: dict = {}


class ErrorResponse(BaseModel):
    error: ErrorBody


class AppError(Exception):
    def __init__(self, code: ErrorCode, message: str, status: int, details: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}


def error_responses(*statuses: int) -> dict[int | str, dict]:
    """OpenAPI `responses=` entry so every documented error has the shared shape."""
    return {status: {"model": ErrorResponse} for status in statuses}


def _body(code: ErrorCode, message: str, details: dict) -> dict:
    return {"error": {"code": code, "message": message, "details": details}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [{"loc": [str(p) for p in err["loc"]], "message": err["msg"]} for err in exc.errors()]
        message = "Some values are not valid."
        return JSONResponse(_body(ErrorCode.VALIDATION_ERROR, message, {"fields": fields}), status_code=422)
