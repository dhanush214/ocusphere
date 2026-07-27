# ============================================================
# OCUSPHERE - AI DIABETIC RETINOPATHY BACKEND
# + APPOINTMENT MANAGEMENT SYSTEM
# + PROVIDER AUTHENTICATION
# + PROVIDER-SPECIFIC APPOINTMENT MANAGEMENT
# ============================================================

import io
import os
import json
import sqlite3
import uuid
import hashlib
import hmac
import secrets

from datetime import datetime, timedelta
from typing import Optional

import torch
import torch.nn as nn
import uvicorn

from PIL import Image, UnidentifiedImageError

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Header,
)

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from torchvision import models, transforms


# ============================================================
# 1. PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "model"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "diabetic_retinopathy_resnet50.pth"
)

CLASS_PATH = os.path.join(
    MODEL_DIR,
    "class_names.json"
)

CONFIG_PATH = os.path.join(
    MODEL_DIR,
    "model_config.json"
)

DATABASE_PATH = os.path.join(
    BASE_DIR,
    "appointments.db"
)


# ============================================================
# 2. CHECK MODEL FILES
# ============================================================

print("\n" + "=" * 60)
print("OCUSPHERE AI BACKEND")
print("=" * 60)

for path in [
    MODEL_PATH,
    CLASS_PATH,
    CONFIG_PATH,
]:

    if not os.path.exists(path):

        raise FileNotFoundError(
            f"Required file not found: {path}"
        )

print("✓ Model files found")


# ============================================================
# 3. DEVICE
# ============================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print("Device:", device)


# ============================================================
# 4. LOAD CLASS NAMES
# ============================================================

with open(
    CLASS_PATH,
    "r",
    encoding="utf-8",
) as f:

    class_names = json.load(f)

print("✓ Class names loaded")


# ============================================================
# 5. LOAD MODEL CONFIGURATION
# ============================================================

with open(
    CONFIG_PATH,
    "r",
    encoding="utf-8",
) as f:

    model_config = json.load(f)

print("✓ Model configuration loaded")


# ============================================================
# 6. BUILD RESNET50
# ============================================================

model = models.resnet50(
    weights=None
)

number_of_features = (
    model.fc.in_features
)

model.fc = nn.Linear(
    number_of_features,
    5,
)

print(
    "✓ ResNet50 architecture created"
)


# ============================================================
# 7. LOAD TRAINED MODEL
# ============================================================

print("Loading trained model...")

checkpoint = torch.load(
    MODEL_PATH,
    map_location=device,
    weights_only=False,
)

if (
    isinstance(checkpoint, dict)
    and "model_state_dict" in checkpoint
):

    model.load_state_dict(
        checkpoint["model_state_dict"]
    )

else:

    model.load_state_dict(
        checkpoint
    )

model = model.to(device)

model.eval()

print(
    "✓ Trained model loaded successfully"
)


# ============================================================
# 8. IMAGE PREPROCESSING
# ============================================================

image_transform = transforms.Compose(
    [
        transforms.Resize(
            (224, 224)
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406,
            ],

            std=[
                0.229,
                0.224,
                0.225,
            ],
        ),
    ]
)

print(
    "✓ Image preprocessing ready"
)


# ============================================================
# 9. CLASS INFORMATION
# ============================================================

CLASS_INFO = {

    0: {
        "name":
            "No Diabetic Retinopathy",

        "short_name":
            "No DR",

        "severity":
            "None",

        "recommendation":
            "Continue routine diabetic eye screening as advised "
            "by a healthcare professional.",
    },

    1: {
        "name":
            "Mild Diabetic Retinopathy",

        "short_name":
            "Mild",

        "severity":
            "Mild",

        "recommendation":
            "Possible mild diabetic retinopathy. "
            "Professional ophthalmic follow-up should be considered.",
    },

    2: {
        "name":
            "Moderate Diabetic Retinopathy",

        "short_name":
            "Moderate",

        "severity":
            "Moderate",

        "recommendation":
            "Possible moderate diabetic retinopathy. "
            "Professional ophthalmic assessment is recommended.",
    },

    3: {
        "name":
            "Severe Diabetic Retinopathy",

        "short_name":
            "Severe",

        "severity":
            "Severe",

        "recommendation":
            "Possible severe diabetic retinopathy. "
            "Prompt professional ophthalmic assessment is recommended.",
    },

    4: {
        "name":
            "Proliferative Diabetic Retinopathy",

        "short_name":
            "Proliferative DR",

        "severity":
            "Proliferative",

        "recommendation":
            "Possible proliferative diabetic retinopathy. "
            "Prompt specialist ophthalmic assessment is recommended.",
    },
}


# ============================================================
# 10. FASTAPI APPLICATION
# ============================================================

app = FastAPI(

    title=
        "OcuSphere AI API",

    description=(
        "AI-assisted diabetic retinopathy screening, "
        "eye-care appointment management and "
        "provider authentication backend"
    ),

    version=
        "4.0.0",
)


# ============================================================
# 11. CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# 12. DATABASE CONNECTION
# ============================================================

def get_database_connection():

    connection = sqlite3.connect(
        DATABASE_PATH
    )

    connection.row_factory = (
        sqlite3.Row
    )

    return connection


# ============================================================
# 13. PASSWORD SECURITY
# ============================================================

def hash_password(
    password: str,
    salt: Optional[str] = None,
):

    if salt is None:

        salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(

        "sha256",

        password.encode("utf-8"),

        salt.encode("utf-8"),

        200000,
    )

    return (
        salt,
        password_hash.hex(),
    )


def verify_password(
    password: str,
    salt: str,
    stored_hash: str,
):

    _, calculated_hash = hash_password(
        password,
        salt,
    )

    return hmac.compare_digest(
        calculated_hash,
        stored_hash,
    )


# ============================================================
# 14. CREATE / MIGRATE DATABASE
# ============================================================

def create_database():

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        # ----------------------------------------------------
        # APPOINTMENTS
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS appointments (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                request_id TEXT UNIQUE NOT NULL,

                patient_name TEXT NOT NULL,

                phone TEXT NOT NULL,

                email TEXT,

                provider TEXT NOT NULL,

                provider_id TEXT,

                preferred_date TEXT NOT NULL,

                preferred_time TEXT NOT NULL,

                reason TEXT,

                notes TEXT,

                status TEXT NOT NULL
                    DEFAULT 'Pending Confirmation',

                created_at TEXT NOT NULL
            )
            """
        )

        # ----------------------------------------------------
        # MIGRATE OLD APPOINTMENTS TABLE
        # ----------------------------------------------------

        cursor.execute(
            """
            PRAGMA table_info(appointments)
            """
        )

        appointment_columns = [
            row["name"]
            for row in cursor.fetchall()
        ]

        if (
            "provider_id"
            not in appointment_columns
        ):

            cursor.execute(
                """
                ALTER TABLE appointments
                ADD COLUMN provider_id TEXT
                """
            )

            print(
                "✓ Added provider_id to existing appointments"
            )

        # ----------------------------------------------------
        # PROVIDERS
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS providers (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                provider_id TEXT UNIQUE NOT NULL,

                provider_name TEXT NOT NULL,

                email TEXT,

                password_hash TEXT NOT NULL,

                password_salt TEXT NOT NULL,

                active INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL
            )
            """
        )

        # ----------------------------------------------------
        # PROVIDER SESSIONS
        # ----------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_sessions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                token TEXT UNIQUE NOT NULL,

                provider_id TEXT NOT NULL,

                created_at TEXT NOT NULL,

                expires_at TEXT NOT NULL
            )
            """
        )

        connection.commit()

        print(
            "✓ Appointment database ready"
        )

        print(
            "✓ Provider authentication database ready"
        )

    finally:

        connection.close()


create_database()


# ============================================================
# 15. CREATE DEFAULT DEVELOPMENT PROVIDER
# ============================================================

def create_default_provider():

    provider_id = "provider1"

    provider_name = (
        "OcuSphere Eye Care Provider"
    )

    provider_email = (
        "provider@ocusphere.local"
    )

    default_password = (
        "OcuSphere123!"
    )

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                provider_id

            FROM providers

            WHERE provider_id = ? COLLATE NOCASE

            LIMIT 1
            """,

            (
                provider_id,
            ),
        )

        existing_provider = (
            cursor.fetchone()
        )

        if existing_provider is not None:

            print(
                "✓ Default provider account already exists"
            )

            return

        salt, password_hash = (
            hash_password(
                default_password
            )
        )

        try:

            cursor.execute(
                """
                INSERT INTO providers (

                    provider_id,
                    provider_name,
                    email,
                    password_hash,
                    password_salt,
                    active,
                    created_at

                )

                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,

                (
                    provider_id,
                    provider_name,
                    provider_email,
                    password_hash,
                    salt,
                    1,
                    datetime.now().isoformat(),
                ),
            )

            connection.commit()

            print(
                "✓ Default provider account created"
            )

        except sqlite3.IntegrityError:

            connection.rollback()

            print(
                "✓ Default provider account already exists"
            )

    finally:

        connection.close()


create_default_provider()


# ============================================================
# 16. MIGRATE EXISTING APPOINTMENTS TO PROVIDER1
# ============================================================

def migrate_existing_appointments():

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE appointments

            SET provider_id = 'provider1'

            WHERE provider_id IS NULL
               OR TRIM(provider_id) = ''
            """
        )

        migrated_count = (
            cursor.rowcount
        )

        connection.commit()

        if migrated_count > 0:

            print(
                f"✓ Migrated {migrated_count} existing "
                "appointment(s) to provider1"
            )

        else:

            print(
                "✓ Existing appointment provider assignments ready"
            )

    finally:

        connection.close()


migrate_existing_appointments()


# ============================================================
# 17. PYDANTIC DATA MODELS
# ============================================================

class AppointmentRequest(BaseModel):

    patient_name: str

    phone: str

    email: Optional[str] = ""

    provider: str

    provider_id: Optional[str] = None

    preferred_date: str

    preferred_time: str

    reason: Optional[str] = (
        "General Eye Consultation"
    )

    notes: Optional[str] = ""


class AppointmentStatusUpdate(
    BaseModel
):

    status: str


class ProviderLoginRequest(
    BaseModel
):

    provider_id: str

    password: str


# ============================================================
# 18. APPOINTMENT REQUEST ID
# ============================================================

def generate_request_id():

    return (
        "OCU-"
        + uuid.uuid4().hex[:6].upper()
        + "-"
        + uuid.uuid4().hex[:4].upper()
    )


# ============================================================
# 19. PROVIDER LOOKUP
# ============================================================

def resolve_provider(
    requested_provider: str,
    requested_provider_id: Optional[str] = None,
):

    provider_text = (
        requested_provider.strip()
    )

    provider_id_text = (
        requested_provider_id.strip()
        if requested_provider_id
        else ""
    )

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        # ----------------------------------------------------
        # EXACT PROVIDER ID
        # ----------------------------------------------------

        if provider_id_text:

            cursor.execute(
                """
                SELECT
                    provider_id,
                    provider_name,
                    email,
                    active

                FROM providers

                WHERE provider_id = ? COLLATE NOCASE

                LIMIT 1
                """,

                (
                    provider_id_text,
                ),
            )

            row = cursor.fetchone()

            if row is not None:

                if int(row["active"]) != 1:

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "The selected provider "
                            "is currently unavailable."
                        ),
                    )

                return dict(row)

        # ----------------------------------------------------
        # PROVIDER FIELD MAY CONTAIN PROVIDER ID
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                provider_id,
                provider_name,
                email,
                active

            FROM providers

            WHERE provider_id = ? COLLATE NOCASE

            LIMIT 1
            """,

            (
                provider_text,
            ),
        )

        row = cursor.fetchone()

        if row is not None:

            if int(row["active"]) != 1:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "The selected provider "
                        "is currently unavailable."
                    ),
                )

            return dict(row)

        # ----------------------------------------------------
        # PROVIDER FIELD MAY CONTAIN PROVIDER NAME
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                provider_id,
                provider_name,
                email,
                active

            FROM providers

            WHERE provider_name = ? COLLATE NOCASE

            LIMIT 1
            """,

            (
                provider_text,
            ),
        )

        row = cursor.fetchone()

        if row is not None:

            if int(row["active"]) != 1:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        "The selected provider "
                        "is currently unavailable."
                    ),
                )

            return dict(row)

        # ----------------------------------------------------
        # DEVELOPMENT COMPATIBILITY
        #
        # Your current appointment frontend sends hospital
        # names such as "Apollo", while provider1 is currently
        # the only registered provider account.
        #
        # Until multiple provider accounts are added, assign
        # those requests to provider1 while preserving the
        # hospital/provider display name selected by patient.
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                provider_id,
                provider_name,
                email,
                active

            FROM providers

            WHERE provider_id = 'provider1' COLLATE NOCASE

            LIMIT 1
            """
        )

        default_provider = (
            cursor.fetchone()
        )

        if default_provider is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "The selected healthcare provider "
                    "is not registered with OcuSphere."
                ),
            )

        if int(default_provider["active"]) != 1:

            raise HTTPException(
                status_code=400,
                detail=(
                    "The selected healthcare provider "
                    "is currently unavailable."
                ),
            )

        return dict(
            default_provider
        )

    finally:

        connection.close()


# ============================================================
# 20. PROVIDER SESSION HELPERS
# ============================================================

SESSION_HOURS = 12


def create_provider_session(
    provider_id: str,
):

    token = secrets.token_urlsafe(
        48
    )

    created_at = datetime.now()

    expires_at = (
        created_at
        + timedelta(
            hours=SESSION_HOURS
        )
    )

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM provider_sessions

            WHERE expires_at <= ?
            """,

            (
                datetime.now().isoformat(),
            ),
        )

        cursor.execute(
            """
            INSERT INTO provider_sessions (

                token,
                provider_id,
                created_at,
                expires_at

            )

            VALUES (?, ?, ?, ?)
            """,

            (
                token,
                provider_id,
                created_at.isoformat(),
                expires_at.isoformat(),
            ),
        )

        connection.commit()

    finally:

        connection.close()

    return (
        token,
        expires_at.isoformat(),
    )


def get_authenticated_provider(
    authorization: Optional[str],
):

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail=(
                "Provider authentication is required."
            ),
        )

    parts = authorization.strip().split(
        " ",
        1,
    )

    if (
        len(parts) != 2
        or parts[0].lower() != "bearer"
        or not parts[1].strip()
    ):

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid provider authentication token."
            ),
        )

    token = parts[1].strip()

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT

                s.token,
                s.provider_id,
                s.expires_at,

                p.provider_name,
                p.email,
                p.active

            FROM provider_sessions AS s

            INNER JOIN providers AS p

                ON LOWER(p.provider_id)
                = LOWER(s.provider_id)

            WHERE s.token = ?
            """,

            (
                token,
            ),
        )

        row = cursor.fetchone()

        if row is None:

            raise HTTPException(
                status_code=401,
                detail=(
                    "Provider session is invalid or has expired."
                ),
            )

        try:

            expires_at = datetime.fromisoformat(
                row["expires_at"]
            )

        except ValueError:

            expires_at = datetime.min

        if expires_at <= datetime.now():

            cursor.execute(
                """
                DELETE FROM provider_sessions

                WHERE token = ?
                """,

                (
                    token,
                ),
            )

            connection.commit()

            raise HTTPException(
                status_code=401,
                detail=(
                    "Provider session has expired. "
                    "Please sign in again."
                ),
            )

        if int(row["active"]) != 1:

            raise HTTPException(
                status_code=403,
                detail=(
                    "This provider account is inactive."
                ),
            )

        return {

            "provider_id":
                row["provider_id"],

            "provider_name":
                row["provider_name"],

            "email":
                row["email"],

            "token":
                token,
        }

    finally:

        connection.close()


# ============================================================
# 21. HOME
# ============================================================

@app.get("/")
def home():

    return {

        "application":
            "OcuSphere AI Retinal Screening",

        "status":
            "online",

        "model":
            "ResNet50",

        "classes":
            5,

        "appointment_system":
            "online",

        "provider_management":
            "online",

        "provider_authentication":
            "online",

        "provider_specific_appointments":
            True,
    }


# ============================================================
# 22. HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy",

        "model_loaded":
            True,

        "architecture":
            "ResNet50",

        "device":
            str(device),

        "classes":
            5,

        "appointment_database":
            True,

        "provider_status_management":
            True,

        "provider_authentication":
            True,

        "provider_specific_appointments":
            True,
    }


# ============================================================
# 23. PROVIDER LOGIN
# ============================================================

@app.post("/provider/login")
def provider_login(
    login: ProviderLoginRequest
):

    provider_id = (
        login.provider_id
        .strip()
        .lower()
    )

    password = login.password

    if not provider_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Provider ID is required."
            ),
        )

    if not password:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password is required."
            ),
        )

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT

                provider_id,
                provider_name,
                email,
                password_hash,
                password_salt,
                active

            FROM providers

            WHERE provider_id = ? COLLATE NOCASE

            LIMIT 1
            """,

            (
                provider_id,
            ),
        )

        provider = cursor.fetchone()

    finally:

        connection.close()

    if provider is None:

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid provider ID or password."
            ),
        )

    if int(provider["active"]) != 1:

        raise HTTPException(
            status_code=403,
            detail=(
                "This provider account is inactive."
            ),
        )

    if not verify_password(
        password,
        provider["password_salt"],
        provider["password_hash"],
    ):

        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid provider ID or password."
            ),
        )

    token, expires_at = (
        create_provider_session(
            provider["provider_id"]
        )
    )

    print("\n" + "-" * 60)
    print("PROVIDER LOGIN SUCCESSFUL")
    print("-" * 60)

    print(
        "Provider ID:",
        provider["provider_id"],
    )

    print(
        "Provider:",
        provider["provider_name"],
    )

    print("-" * 60)

    return {

        "success":
            True,

        "message":
            "Provider login successful.",

        "token":
            token,

        "token_type":
            "Bearer",

        "expires_at":
            expires_at,

        "provider": {

            "provider_id":
                provider["provider_id"],

            "provider_name":
                provider["provider_name"],

            "email":
                provider["email"],
        },
    }


# ============================================================
# 24. VERIFY PROVIDER SESSION
# ============================================================

@app.get("/provider/me")
def provider_me(
    authorization: Optional[str] = Header(
        default=None
    ),
):

    provider = (
        get_authenticated_provider(
            authorization
        )
    )

    return {

        "success":
            True,

        "provider": {

            "provider_id":
                provider["provider_id"],

            "provider_name":
                provider["provider_name"],

            "email":
                provider["email"],
        },
    }


# ============================================================
# 25. PROVIDER LOGOUT
# ============================================================

@app.post("/provider/logout")
def provider_logout(
    authorization: Optional[str] = Header(
        default=None
    ),
):

    provider = (
        get_authenticated_provider(
            authorization
        )
    )

    connection = (
        get_database_connection()
    )

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM provider_sessions

            WHERE token = ?
            """,

            (
                provider["token"],
            ),
        )

        connection.commit()

    finally:

        connection.close()

    return {

        "success":
            True,

        "message":
            "Provider logged out successfully.",
    }


# ============================================================
# 26. CREATE APPOINTMENT
# PUBLIC PATIENT ENDPOINT
# ============================================================

@app.post("/appointments")
def create_appointment(
    appointment: AppointmentRequest
):

    patient_name = (
        appointment.patient_name.strip()
    )

    phone = (
        appointment.phone.strip()
    )

    provider_display_name = (
        appointment.provider.strip()
    )

    preferred_date = (
        appointment.preferred_date.strip()
    )

    preferred_time = (
        appointment.preferred_time.strip()
    )

    if not patient_name:

        raise HTTPException(
            status_code=400,
            detail=(
                "Patient name is required."
            ),
        )

    if not phone:

        raise HTTPException(
            status_code=400,
            detail=(
                "Phone number is required."
            ),
        )

    if not provider_display_name:

        raise HTTPException(
            status_code=400,
            detail=(
                "Healthcare provider is required."
            ),
        )

    if not preferred_date:

        raise HTTPException(
            status_code=400,
            detail=(
                "Preferred appointment date is required."
            ),
        )

    if not preferred_time:

        raise HTTPException(
            status_code=400,
            detail=(
                "Preferred appointment time is required."
            ),
        )

    assigned_provider = resolve_provider(
        provider_display_name,
        appointment.provider_id,
    )

    assigned_provider_id = (
        assigned_provider["provider_id"]
    )

    request_id = (
        generate_request_id()
    )

    created_at = (
        datetime.now().isoformat()
    )

    status = (
        "Pending Confirmation"
    )

    connection = None

    try:

        connection = (
            get_database_connection()
        )

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO appointments (

                request_id,
                patient_name,
                phone,
                email,
                provider,
                provider_id,
                preferred_date,
                preferred_time,
                reason,
                notes,
                status,
                created_at

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,

            (
                request_id,

                patient_name,

                phone,

                appointment.email.strip()
                if appointment.email
                else "",

                provider_display_name,

                assigned_provider_id,

                preferred_date,

                preferred_time,

                appointment.reason.strip()
                if appointment.reason
                else
                "General Eye Consultation",

                appointment.notes.strip()
                if appointment.notes
                else "",

                status,

                created_at,
            ),
        )

        connection.commit()

        print("\n" + "-" * 60)
        print("NEW APPOINTMENT REQUEST")
        print("-" * 60)

        print(
            "Request ID:",
            request_id,
        )

        print(
            "Patient:",
            patient_name,
        )

        print(
            "Selected Provider:",
            provider_display_name,
        )

        print(
            "Assigned Provider ID:",
            assigned_provider_id,
        )

        print(
            "Date:",
            preferred_date,
        )

        print(
            "Time:",
            preferred_time,
        )

        print(
            "Status:",
            status,
        )

        print("-" * 60)

        return {

            "success":
                True,

            "message":
                "Appointment request created successfully.",

            "id":
                request_id,

            "request_id":
                request_id,

            "status":
                status,

            "created_at":
                created_at,

            "appointment": {

                "request_id":
                    request_id,

                "patient_name":
                    patient_name,

                "phone":
                    phone,

                "email":
                    appointment.email or "",

                "provider":
                    provider_display_name,

                "provider_id":
                    assigned_provider_id,

                "preferred_date":
                    preferred_date,

                "preferred_time":
                    preferred_time,

                "reason":
                    appointment.reason
                    or
                    "General Eye Consultation",

                "notes":
                    appointment.notes or "",

                "status":
                    status,

                "created_at":
                    created_at,
            },
        }

    except sqlite3.Error as error:

        print(
            "Appointment database error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save appointment request."
            ),
        )

    finally:

        if connection:

            connection.close()


# ============================================================
# 27. GET PROVIDER'S APPOINTMENTS
# PROTECTED PROVIDER ENDPOINT
# ============================================================

@app.get("/appointments")
def get_all_appointments(
    authorization: Optional[str] = Header(
        default=None
    ),
):

    authenticated_provider = (
        get_authenticated_provider(
            authorization
        )
    )

    authenticated_provider_id = (
        authenticated_provider[
            "provider_id"
        ]
    )

    connection = None

    try:

        connection = (
            get_database_connection()
        )

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT

                id,
                request_id,
                patient_name,
                phone,
                email,
                provider,
                provider_id,
                preferred_date,
                preferred_time,
                reason,
                notes,
                status,
                created_at

            FROM appointments

            WHERE provider_id = ? COLLATE NOCASE

            ORDER BY id DESC
            """,

            (
                authenticated_provider_id,
            ),
        )

        rows = cursor.fetchall()

        appointments = [
            dict(row)
            for row in rows
        ]

        return {

            "success":
                True,

            "provider": {

                "provider_id":
                    authenticated_provider[
                        "provider_id"
                    ],

                "provider_name":
                    authenticated_provider[
                        "provider_name"
                    ],

                "email":
                    authenticated_provider[
                        "email"
                    ],
            },

            "count":
                len(appointments),

            "appointments":
                appointments,
        }

    except sqlite3.Error as error:

        print(
            "Provider dashboard database error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to retrieve appointment requests."
            ),
        )

    finally:

        if connection:

            connection.close()


# ============================================================
# 28. PUBLIC PATIENT APPOINTMENT TRACKING
# ============================================================

@app.get(
    "/appointments/{request_id}"
)
def get_appointment(
    request_id: str
):

    cleaned_request_id = (
        request_id
        .strip()
        .upper()
    )

    connection = None

    try:

        connection = (
            get_database_connection()
        )

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT

                request_id,
                patient_name,
                phone,
                email,
                provider,
                provider_id,
                preferred_date,
                preferred_time,
                reason,
                notes,
                status,
                created_at

            FROM appointments

            WHERE UPPER(request_id) = ?

            LIMIT 1
            """,

            (
                cleaned_request_id,
            ),
        )

        row = cursor.fetchone()

        if row is None:

            raise HTTPException(
                status_code=404,
                detail=(
                    "No appointment was found "
                    "with this Request ID."
                ),
            )

        return {

            "success":
                True,

            "appointment":
                dict(row),
        }

    except HTTPException:

        raise

    except sqlite3.Error as error:

        print(
            "Appointment lookup database error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to retrieve appointment."
            ),
        )

    finally:

        if connection:

            connection.close()


# ============================================================
# 29. UPDATE APPOINTMENT STATUS
# PROVIDER CAN UPDATE ONLY THEIR OWN APPOINTMENTS
# ============================================================

@app.patch(
    "/appointments/{request_id}/status"
)
def update_appointment_status(
    request_id: str,
    update: AppointmentStatusUpdate,
    authorization: Optional[str] = Header(
        default=None
    ),
):

    authenticated_provider = (
        get_authenticated_provider(
            authorization
        )
    )

    authenticated_provider_id = (
        authenticated_provider[
            "provider_id"
        ]
    )

    cleaned_request_id = (
        request_id
        .strip()
        .upper()
    )

    requested_status = (
        update.status.strip()
    )

    allowed_statuses = {

        "pending confirmation":
            "Pending Confirmation",

        "confirmed":
            "Confirmed",

        "rejected":
            "Rejected",

        "completed":
            "Completed",

        "cancelled":
            "Cancelled",
    }

    normalized_status = (
        requested_status.lower()
    )

    if (
        normalized_status
        not in allowed_statuses
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid appointment status. "
                "Allowed statuses are: "
                "Pending Confirmation, Confirmed, "
                "Rejected, Completed or Cancelled."
            ),
        )

    final_status = (
        allowed_statuses[
            normalized_status
        ]
    )

    connection = None

    try:

        connection = (
            get_database_connection()
        )

        cursor = connection.cursor()

        # ----------------------------------------------------
        # FIND APPOINTMENT
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT

                request_id,
                patient_name,
                provider,
                provider_id,
                status

            FROM appointments

            WHERE UPPER(request_id) = ?

            LIMIT 1
            """,

            (
                cleaned_request_id,
            ),
        )

        existing_appointment = (
            cursor.fetchone()
        )

        if existing_appointment is None:

            raise HTTPException(
                status_code=404,
                detail=(
                    "No appointment was found "
                    "with this Request ID."
                ),
            )

        # ----------------------------------------------------
        # SECURITY CHECK
        # ----------------------------------------------------

        appointment_provider_id = (
            existing_appointment[
                "provider_id"
            ]
            or ""
        )

        if (
            appointment_provider_id.lower()
            !=
            authenticated_provider_id.lower()
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorised to manage "
                    "this appointment request."
                ),
            )

        previous_status = (
            existing_appointment[
                "status"
            ]
        )

        # ----------------------------------------------------
        # UPDATE ONLY IF PROVIDER OWNS APPOINTMENT
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE appointments

            SET status = ?

            WHERE UPPER(request_id) = ?

            AND provider_id = ? COLLATE NOCASE
            """,

            (
                final_status,
                cleaned_request_id,
                authenticated_provider_id,
            ),
        )

        if cursor.rowcount != 1:

            connection.rollback()

            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorised to manage "
                    "this appointment request."
                ),
            )

        connection.commit()

        # ----------------------------------------------------
        # RETURN UPDATED APPOINTMENT
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT

                id,
                request_id,
                patient_name,
                phone,
                email,
                provider,
                provider_id,
                preferred_date,
                preferred_time,
                reason,
                notes,
                status,
                created_at

            FROM appointments

            WHERE UPPER(request_id) = ?

            AND provider_id = ? COLLATE NOCASE

            LIMIT 1
            """,

            (
                cleaned_request_id,
                authenticated_provider_id,
            ),
        )

        updated_row = (
            cursor.fetchone()
        )

        updated_appointment = (
            dict(updated_row)
        )

        print("\n" + "-" * 60)
        print("APPOINTMENT STATUS UPDATED")
        print("-" * 60)

        print(
            "Authenticated Provider:",
            authenticated_provider_id,
        )

        print(
            "Request ID:",
            cleaned_request_id,
        )

        print(
            "Patient:",
            updated_appointment[
                "patient_name"
            ],
        )

        print(
            "Previous Status:",
            previous_status,
        )

        print(
            "New Status:",
            final_status,
        )

        print("-" * 60)

        return {

            "success":
                True,

            "message":
                "Appointment status updated successfully.",

            "previous_status":
                previous_status,

            "status":
                final_status,

            "appointment":
                updated_appointment,
        }

    except HTTPException:

        raise

    except sqlite3.Error as error:

        print(
            "Status update database error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to update appointment status."
            ),
        )

    finally:

        if connection:

            connection.close()


# ============================================================
# 30. ANALYSE RETINAL IMAGE
# ============================================================

@app.post("/analyse")
async def analyse(
    file: UploadFile = File(...)
):

    print("\n" + "-" * 60)
    print("NEW OCUSPHERE AI SCAN")
    print("-" * 60)

    print(
        "Filename:",
        file.filename,
    )

    print(
        "Content type:",
        file.content_type,
    )

    allowed_types = [
        "image/jpeg",
        "image/jpg",
        "image/png",
    ]

    if (
        file.content_type
        not in allowed_types
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Please upload JPG, JPEG or PNG."
            ),
        )

    try:

        image_bytes = (
            await file.read()
        )

        print(
            "Image received:",
            len(image_bytes),
            "bytes",
        )

        if len(image_bytes) == 0:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Uploaded image is empty."
                ),
            )

        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        )

        image.verify()

        print(
            "Image verification: SUCCESS"
        )

        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        ).convert("RGB")

        print(
            "Original image size:",
            image.size,
        )

        input_tensor = (
            image_transform(
                image
            )
        )

        input_tensor = (
            input_tensor.unsqueeze(0)
        )

        input_tensor = (
            input_tensor.to(device)
        )

        print(
            "Model input shape:",
            input_tensor.shape,
        )

        with torch.inference_mode():

            logits = model(
                input_tensor
            )

            probabilities = (
                torch.softmax(
                    logits,
                    dim=1,
                )[0]
            )

        predicted_grade = int(
            torch.argmax(
                probabilities
            ).item()
        )

        confidence = float(
            probabilities[
                predicted_grade
            ].item()
        )

        result = (
            CLASS_INFO[
                predicted_grade
            ]
        )

        probability_list = []

        for grade in range(5):

            probability_list.append(
                {
                    "grade":
                        grade,

                    "name":
                        CLASS_INFO[
                            grade
                        ]["name"],

                    "probability":
                        round(
                            float(
                                probabilities[
                                    grade
                                ].item()
                            )
                            * 100,
                            2,
                        ),
                }
            )

        print("\nAI RESULT")
        print("-" * 60)

        print(
            "Grade:",
            predicted_grade,
        )

        print(
            "Prediction:",
            result["name"],
        )

        print(
            "Confidence:",
            f"{confidence * 100:.2f}%",
        )

        print("-" * 60)

        return {

            "success":
                True,

            "grade":
                predicted_grade,

            "prediction":
                result["name"],

            "severity":
                result["severity"],

            "confidence":
                round(
                    confidence * 100,
                    2,
                ),

            "probabilities":
                probability_list,

            "recommendation":
                result[
                    "recommendation"
                ],

            "model":
                "ResNet50",

            "disclaimer":
                (
                    "This AI output is intended for "
                    "screening/research and should not "
                    "be treated as a definitive medical diagnosis."
                ),
        }

    except UnidentifiedImageError:

        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is not "
                "a valid image."
            ),
        )

    except HTTPException:

        raise

    except Exception as error:

        print(
            "Prediction error:",
            str(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "AI analysis failed: "
                + str(error)
            ),
        )


# ============================================================
# 31. START SERVER
# ============================================================

if __name__ == "__main__":

    uvicorn.run(

        "main:app",

        host="127.0.0.1",

        port=8000,

        reload=True,
    )