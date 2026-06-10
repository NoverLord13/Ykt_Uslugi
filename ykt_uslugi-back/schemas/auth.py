from pydantic import BaseModel, Field


class PhoneRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class RegisterCompleteRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=4, max_length=4)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
