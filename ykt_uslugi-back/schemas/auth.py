from pydantic import BaseModel, Field
from pydantic_extra_types.phone_numbers import PhoneNumber


class PhoneRequest(BaseModel):
    phone: PhoneNumber


class VerifyCodeRequest(BaseModel):
    phone: PhoneNumber
    code: str = Field(..., min_length=4, max_length=4)


class RegisterCompleteRequest(BaseModel):
    verification_token: str
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=128)
    accept_terms: bool


class LoginRequest(BaseModel):
    login: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)
