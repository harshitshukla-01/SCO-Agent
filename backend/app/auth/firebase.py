import os
import firebase_admin
from firebase_admin import auth, credentials, firestore
from app.config import get_settings

settings = get_settings()

# Emulator mode must take precedence over any production service-account credentials.
# Local development should never accidentally authenticate against the cloud project.
emulator_mode = bool(settings.FIREBASE_AUTH_EMULATOR_HOST or settings.FIRESTORE_EMULATOR_HOST)

if settings.FIREBASE_AUTH_EMULATOR_HOST:
    os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.FIREBASE_AUTH_EMULATOR_HOST

if settings.FIRESTORE_EMULATOR_HOST:
    os.environ["FIRESTORE_EMULATOR_HOST"] = settings.FIRESTORE_EMULATOR_HOST

if emulator_mode:
    os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
elif settings.GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS

_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        if not firebase_admin._apps:
            if emulator_mode:
                options = {"projectId": settings.PROJECT_ID}
                _firebase_app = firebase_admin.initialize_app(options=options)
            elif settings.GOOGLE_APPLICATION_CREDENTIALS:
                cred = credentials.Certificate(settings.GOOGLE_APPLICATION_CREDENTIALS)
                _firebase_app = firebase_admin.initialize_app(cred, {"projectId": settings.PROJECT_ID})
            else:
                options = {"projectId": settings.PROJECT_ID}
                _firebase_app = firebase_admin.initialize_app(options=options)
        else:
            _firebase_app = firebase_admin.get_app()
    return _firebase_app


def get_firestore_client():
    get_firebase_app()
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        from google.cloud import firestore as gcloud_firestore
        return gcloud_firestore.Client(project=settings.PROJECT_ID)
    return firestore.client()


def get_auth():
    get_firebase_app()
    return auth
