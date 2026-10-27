from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://vcf:vcf@localhost:5432/vcf_lic_mgmt"
    api_v1_prefix: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
