"""Migrate and seed a fresh temporary E2E database, then run a local server."""
import os
from pathlib import Path
import sys
import tempfile


def main():
    directory = Path(os.environ['E2E_DATA_DIR']).resolve()
    temp_root = Path(tempfile.gettempdir()).resolve()
    if not directory.is_relative_to(temp_root) or directory == temp_root:
        raise RuntimeError('E2E_DATA_DIR must be a dedicated temporary directory')
    if not (directory / '.smartcourt-e2e').is_file():
        raise RuntimeError('Missing E2E directory marker')
    if (directory / 'database.sqlite3').exists():
        raise RuntimeError('Refusing to reuse an existing E2E database')

    backend = Path(__file__).resolve().parents[1] / 'backend'
    sys.path.insert(0, str(backend))
    os.environ['DJANGO_SETTINGS_MODULE'] = 'smartcourt_config.e2e_settings'
    import django
    django.setup()
    from django.core.management import call_command
    from django.contrib.auth import get_user_model
    from courts.models import Court

    call_command('migrate', verbosity=0, interactive=False)
    for index in (1, 2):
        get_user_model().objects.create_user(
            username=f'e2e_member_{index}', email=f'member{index}@example.test',
            password='E2eTestPassword123!', first_name='ทดสอบ', last_name='ระบบ',
            std_id=f'990000000000{index}',
        )
    Court.objects.create(name='สนามฟุตซอล E2E', floor='3', sport_type='futsal')
    Court.objects.create(name='สนามแบดมินตัน E2E', floor='7', sport_type='badminton')
    call_command('runserver', '127.0.0.1:8099', use_reloader=False)


if __name__ == '__main__':
    main()
