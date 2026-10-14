"""Isolated browser-test settings. Never use the development database or SMTP."""
import os
from pathlib import Path

from .settings import *  # noqa: F403

run_directory = Path(os.environ['E2E_DATA_DIR']).resolve()
if not (run_directory / '.smartcourt-e2e').is_file():
    raise RuntimeError('E2E settings require a marked, isolated test directory')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': run_directory / 'database.sqlite3',
        'OPTIONS': {'timeout': 20},
    },
}
EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = run_directory / 'mail'
DEFAULT_FROM_EMAIL = 'smartcourt-e2e@example.test'
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']
CORS_ALLOWED_ORIGINS = ['http://127.0.0.1:5199']
CORS_ALLOW_ALL_ORIGINS = False
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
SECRET_KEY = 'isolated-e2e-only-not-a-deployment-key'
