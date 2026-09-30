import json
import os
from functools import lru_cache
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_ID: str = Field(default="soc-agent-demo", description="GCP / Firebase Project ID")
    FIREBASE_AUTH_EMULATOR_HOST: str | None = Field(default=None, description="Auth emulator host:port")
    FIRESTORE_EMULATOR_HOST: str | None = Field(default=None, description="Firestore emulator host:port")
    GOOGLE_APPLICATION_CREDENTIALS: str | None = Field(default=None, description="Path to a Firebase service-account JSON file for production ADC-based auth")
    
    ENVIRONMENT: str = Field(default="development", description="Runtime environment")
    HOST: str = Field(default="0.0.0.0", description="Backend bind host")
    PORT: int = Field(default=8000, description="Backend bind port")
    
    CORS_ORIGINS: str | List[str] = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        description="Allowed CORS origins"
    )
    
    # Model configuration for later AI phases - must not be hardcoded
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    GEMINI_API_KEY: str | None = Field(default=None, description="Gemini API Key")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str] | None) -> List[str]:
        if v is None:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        if isinstance(v, str):
            candidate = v.strip()
            if not candidate:
                return ["http://localhost:5173", "http://127.0.0.1:5173"]
            if candidate.startswith("[") and candidate.endswith("]"):
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if str(origin).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in candidate.split(",") if origin.strip()]
        if isinstance(v, (list, tuple, set)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
