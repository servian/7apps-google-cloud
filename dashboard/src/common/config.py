from pathlib import Path
from typing import Optional

import google.auth
from google.cloud import error_reporting, secretmanager, storage, tasks_v2
from pydantic import BaseSettings, Field, HttpUrl, validator

ROOT_DIR = root_dir = Path(__file__).parent.parent

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "icon": {
            "class": "common.logging.ColourFormatter",
            "format": "%(icon)-2s %(message)s",
        },
        "icon-verbose": {
            "class": "common.logging.ColourFormatter",
            "format": "%(asctime)-10s%(icon)-2s %(message)s [%(name)s]",
            "datefmt": "%H:%M:%S",
        },
    },
    "filters": {"icon": {"()": "common.logging.IconFilter"}},
    "handlers": {
        "default": {
            "level": "DEBUG",
            "formatter": "icon-verbose",
            "filters": ["icon"],
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        }
    },
    "loggers": {
        "dashboard": {"handlers": ["default"], "level": "DEBUG", "propagate": False}
    },
}


class GoogleClientManager:
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    def __init__(self):
        self.credentials, self.project = google.auth.default(scopes=self.scopes)

    @property
    def error(self):
        if not hasattr(self, "_error"):
            self._error = error_reporting.Client()
        return self._error

    @property
    def secrets(self):
        if not hasattr(self, "_secrets"):
            self._secrets = secretmanager.SecretManagerServiceClient()
        return self._secrets

    @property
    def storage(self):
        if not hasattr(self, "_storage"):
            self._storage = storage.Client()
        return self._storage

    @property
    def tasks(self):
        if not hasattr(self, "_tasks"):
            self._tasks = tasks_v2.CloudTasksClient()
        return self._tasks

    def get_secret(self, secret, version="latest"):
        path = self.secrets.secret_path(self.project, secret)
        secret_name = f"{path}/versions/{version}"
        response = self.secrets.access_secret_version(secret_name)
        return response.payload.data


class Settings(BaseSettings):
    debug: bool = False
    root_dir = ROOT_DIR
    static_dir = ROOT_DIR.joinpath("static")
    templates_dir = ROOT_DIR.joinpath("templates")
    github_repo: str = "7apps-google-cloud"
    github_branch: str = "demo"
    gcp: GoogleClientManager = Field(default_factory=GoogleClientManager)
    google_fonts_api_key: Optional[str]
    cloud_build_trigger_id: Optional[str]
    cloud_tasks_queue_name: Optional[str]
    enable_stackdriver_logging: bool = False

    class Config:
        case_sensitive = False

    @validator("google_fonts_api_key", pre=True, always=True)
    def default_google_fonts_api_key(cls, v, values):
        gcp = values.get("gcp")
        return v or gcp.get_secret("GOOGLE_FONTS_API_KEY")

    @validator("cloud_build_trigger_id", pre=True, always=True)
    def default_cloud_build_trigger_id(cls, v, values):
        gcp = values.get("gcp")
        return v or gcp.get_secret("CLOUD_BUILD_TRIGGER_ID")

    @validator("cloud_tasks_queue_name", pre=True, always=True)
    def default_cloud_tasks_queue_name(cls, v, values):
        gcp = values.get("gcp")
        return v or gcp.get_secret("CLOUD_TASKS_QUEUE_NAME")


settings = Settings()

__ALL__ = [settings, LOGGING_CONFIG]
