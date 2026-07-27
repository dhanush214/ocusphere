"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "ocusphere_provider_token";
const PROVIDER_KEY = "ocusphere_provider";
const EXPIRES_KEY = "ocusphere_provider_expires_at";

// ===========================================================
// TYPES
// ===========================================================

type Appointment = {
  request_id: string;
  patient_name?: string;
  phone?: string;
  email?: string | null;
  provider?: string;
  provider_id?: string;
  preferred_date?: string;
  preferred_time?: string;
  reason?: string;
  notes?: string | null;
  status?: string;
  scan_id?: string | null;
};

type ScreeningRecord = {
  scan_id?: string;
  patient_name?: string;
  phone?: string;
  filename?: string;
  grade?: number;
  prediction?: string;
  severity?: string;
  confidence?: number;
  recommendation?: string;
  created_at?: string;
};

type ClinicalReview = {
  review_id?: string;
  request_id?: string;
  scan_id?: string | null;
  provider_id?: string;
  clinical_assessment?: string;
  recommendation?: string;
  additional_notes?: string;
  created_at?: string;
  updated_at?: string;
};

type ReviewResponse = {
  success?: boolean;
  appointment?: Appointment;
  screening?: ScreeningRecord | null;
  clinical_review?: ClinicalReview | null;
  detail?: string;
};

// ===========================================================
// MAIN PAGE
// ===========================================================

export default function ProviderReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestId = searchParams.get("request_id");

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // DATA
  // =========================================================

  const [appointment, setAppointment] =
    useState<Appointment | null>(null);

  const [screening, setScreening] =
    useState<ScreeningRecord | null>(null);

  const [clinicalReview, setClinicalReview] =
    useState<ClinicalReview | null>(null);

  // =========================================================
  // PROVIDER REVIEW FORM
  // =========================================================

  const [
    clinicalAssessment,
    setClinicalAssessment,
  ] = useState("");

  const [
    recommendation,
    setRecommendation,
  ] = useState("");

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState("");

  // =========================================================
  // PROVIDER TOKEN
  // =========================================================

  function getProviderToken() {
    if (typeof window === "undefined") {
      return null;
    }

    return localStorage.getItem(TOKEN_KEY);
  }

  // =========================================================
  // CLEAR PROVIDER SESSION
  // =========================================================

  function clearProviderSession() {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROVIDER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  }

  // =========================================================
  // LOAD CLINICAL REVIEW
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadReviewData() {
      setLoading(true);
      setError("");
      setSuccess("");

      // -------------------------------------------------------
      // REQUEST ID
      // -------------------------------------------------------

      if (!requestId) {
        setError(
          "No appointment request ID was provided."
        );

        setLoading(false);

        return;
      }

      // -------------------------------------------------------
      // TOKEN
      // -------------------------------------------------------

      const token = getProviderToken();

      if (!token) {
        setError("LOGIN_REQUIRED");
        setLoading(false);

        return;
      }

      try {
        // -----------------------------------------------------
        // CORRECT BACKEND ENDPOINT
        // -----------------------------------------------------

        const response = await fetch(
          `${API_URL}/provider/clinical-review/${encodeURIComponent(
            requestId
          )}`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
            },

            cache: "no-store",
          }
        );

        // -----------------------------------------------------
        // SESSION EXPIRED
        // -----------------------------------------------------

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          clearProviderSession();

          throw new Error("LOGIN_REQUIRED");
        }

        let data: ReviewResponse = {};

        try {
          data = await response.json();
        } catch {
          throw new Error(
            "The backend returned an invalid response."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Unable to load clinical review."
          );
        }

        if (cancelled) {
          return;
        }

        // -----------------------------------------------------
        // APPOINTMENT
        // -----------------------------------------------------

        setAppointment(
          data.appointment || null
        );

        // -----------------------------------------------------
        // SCREENING
        // -----------------------------------------------------

        setScreening(
          data.screening || null
        );

        // -----------------------------------------------------
        // EXISTING CLINICAL REVIEW
        // -----------------------------------------------------

        const existingReview =
          data.clinical_review || null;

        setClinicalReview(existingReview);

        if (existingReview) {
          setClinicalAssessment(
            existingReview.clinical_assessment || ""
          );

          setRecommendation(
            existingReview.recommendation || ""
          );

          setAdditionalNotes(
            existingReview.additional_notes || ""
          );
        }
      } catch (loadError) {
        console.error(
          "Clinical review loading failed:",
          loadError
        );

        if (cancelled) {
          return;
        }

        if (
          loadError instanceof Error &&
          loadError.message === "LOGIN_REQUIRED"
        ) {
          setError("LOGIN_REQUIRED");

          return;
        }

        if (loadError instanceof TypeError) {
          setError(
            "Could not connect to the OcuSphere backend. Make sure FastAPI is running on port 8000."
          );

          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);

          return;
        }

        setError(
          "Unable to load the clinical review."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReviewData();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  // =========================================================
  // SAVE CLINICAL REVIEW
  // =========================================================

  async function handleSaveReview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!requestId) {
      setError(
        "Appointment request ID is missing."
      );

      return;
    }

    if (!clinicalAssessment.trim()) {
      setError(
        "Please enter your clinical assessment."
      );

      return;
    }

    if (!recommendation.trim()) {
      setError(
        "Please select a recommendation."
      );

      return;
    }

    const token = getProviderToken();

    if (!token) {
      setError("LOGIN_REQUIRED");

      return;
    }

    setSaving(true);

    try {
      // -------------------------------------------------------
      // CORRECT SAVE ENDPOINT
      // -------------------------------------------------------

      const response = await fetch(
        `${API_URL}/provider/clinical-review/${encodeURIComponent(
          requestId
        )}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            clinical_assessment:
              clinicalAssessment.trim(),

            recommendation:
              recommendation.trim(),

            additional_notes:
              additionalNotes.trim(),
          }),
        }
      );

      // -------------------------------------------------------
      // AUTH ERROR
      // -------------------------------------------------------

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        clearProviderSession();

        throw new Error("LOGIN_REQUIRED");
      }

      let data: {
        success?: boolean;
        message?: string;
        clinical_review?: ClinicalReview;
        detail?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to save clinical review."
        );
      }

      if (data.clinical_review) {
        setClinicalReview(
          data.clinical_review
        );
      }

      setSuccess(
        data.message ||
          "Clinical review saved successfully."
      );
    } catch (saveError) {
      console.error(
        "Clinical review save failed:",
        saveError
      );

      if (
        saveError instanceof Error &&
        saveError.message === "LOGIN_REQUIRED"
      ) {
        setError("LOGIN_REQUIRED");

        return;
      }

      if (saveError instanceof TypeError) {
        setError(
          "Could not connect to the OcuSphere backend."
        );

        return;
      }

      if (saveError instanceof Error) {
        setError(saveError.message);

        return;
      }

      setError(
        "Unable to save clinical review."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // FORMAT CONFIDENCE
  // =========================================================

  function formatConfidence(
    value?: number
  ) {
    if (
      value === undefined ||
      value === null ||
      Number.isNaN(Number(value))
    ) {
      return "—";
    }

    const numericValue = Number(value);

    // Backend currently stores confidence as percentage.
    // Also supports decimal confidence if changed later.

    const percentage =
      numericValue <= 1
        ? numericValue * 100
        : numericValue;

    return `${percentage.toFixed(2)}%`;
  }

  // =========================================================
  // FORMAT DR GRADE
  // =========================================================

  function formatGrade(
    grade?: number
  ) {
    if (
      grade === undefined ||
      grade === null
    ) {
      return "—";
    }

    switch (Number(grade)) {
      case 0:
        return "Grade 0 — No DR";

      case 1:
        return "Grade 1 — Mild";

      case 2:
        return "Grade 2 — Moderate";

      case 3:
        return "Grade 3 — Severe";

      case 4:
        return "Grade 4 — Proliferative DR";

      default:
        return `Grade ${grade}`;
    }
  }

  // =========================================================
  // LOADING SCREEN
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

          <h1 className="mt-6 text-xl font-bold">
            Loading Clinical Review
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Retrieving appointment and screening
            information...
          </p>

        </div>

      </main>
    );
  }

  // =========================================================
  // LOGIN REQUIRED
  // =========================================================

  if (error === "LOGIN_REQUIRED") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">

        <div className="w-full max-w-lg rounded-3xl border border-yellow-400/20 bg-[#081120] p-8 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/[0.05] text-2xl text-yellow-300">
            !
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            Provider Sign In Required
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            Your provider session is unavailable or
            has expired. Please sign in again.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/provider-login")
            }
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-4 font-bold text-white"
          >
            Sign In to Provider Portal →
          </button>

        </div>

      </main>
    );
  }

  // =========================================================
  // NORMAL PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#020817] text-white">

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/provider-dashboard"
            )
          }
          className="text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Back to Provider Dashboard
        </button>

        {/* HEADER */}

        <section className="mt-12">

          <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">
            OCUSPHERE CLINICAL REVIEW
          </p>

          <h1 className="mt-4 text-4xl font-bold">
            AI Screening Review
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Review the patient&apos;s AI-assisted
            retinal screening result and record your
            professional clinical assessment.
          </p>

        </section>

        {/* REQUEST ID */}

        <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-[#071426] p-5">

          <p className="text-xs text-slate-500">
            OcuSphere Request ID
          </p>

          <p className="mt-1 font-bold text-cyan-300">
            {requestId ||
              "No request ID provided"}
          </p>

        </div>

        {/* GENERAL ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5">

            <p className="font-semibold text-red-300">
              Unable to load complete review
            </p>

            <p className="mt-2 text-sm text-red-200/70">
              {error}
            </p>

          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">

            <p className="font-semibold text-emerald-300">
              ✓ {success}
            </p>

            {clinicalReview?.review_id && (
              <p className="mt-2 text-xs text-emerald-200/60">
                Review ID:{" "}
                {clinicalReview.review_id}
              </p>
            )}

          </div>
        )}

        {/* PATIENT INFORMATION */}

        {appointment && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#081120] p-7">

            <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
              PATIENT REQUEST
            </p>

            <h2 className="mt-3 text-xl font-bold">
              Appointment Information
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <InfoCard
                label="Patient"
                value={
                  appointment.patient_name ??
                  "—"
                }
              />

              <InfoCard
                label="Preferred Date"
                value={
                  appointment.preferred_date ??
                  "—"
                }
              />

              <InfoCard
                label="Preferred Time"
                value={
                  appointment.preferred_time ??
                  "—"
                }
              />

              <InfoCard
                label="Reason"
                value={
                  appointment.reason ??
                  "—"
                }
              />

            </div>

            {appointment.scan_id && (
              <div className="mt-4 rounded-xl border border-white/10 bg-[#0c172b] p-4">

                <p className="text-xs text-slate-500">
                  Linked Screening ID
                </p>

                <p className="mt-1 font-mono text-sm text-cyan-300">
                  {appointment.scan_id}
                </p>

              </div>
            )}

          </section>
        )}

        {/* MAIN GRID */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* =================================================
              AI SCREENING
          ================================================= */}

          <section className="rounded-3xl border border-white/10 bg-[#081120] p-7">

            <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
              AI SCREENING RESULT
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              Patient AI Analysis
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              AI-assisted diabetic retinopathy
              screening information associated
              with this appointment.
            </p>

            {screening ? (
              <>
                {/* PREDICTION */}

                <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-[#0c172b] p-5">

                  <p className="text-xs text-slate-500">
                    AI Prediction
                  </p>

                  <p className="mt-2 text-lg font-bold text-emerald-300">
                    {screening.prediction ||
                      "Prediction unavailable"}
                  </p>

                </div>

                {/* GRADE + CONFIDENCE */}

                <div className="mt-4 grid grid-cols-2 gap-4">

                  <div className="rounded-2xl border border-white/10 bg-[#0c172b] p-5">

                    <p className="text-xs text-slate-500">
                      DR Grade
                    </p>

                    <p className="mt-2 font-bold">
                      {formatGrade(
                        screening.grade
                      )}
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0c172b] p-5">

                    <p className="text-xs text-slate-500">
                      AI Confidence
                    </p>

                    <p className="mt-2 font-bold">
                      {formatConfidence(
                        screening.confidence
                      )}
                    </p>

                  </div>

                </div>

                {/* SEVERITY */}

                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0c172b] p-5">

                  <p className="text-xs text-slate-500">
                    Severity
                  </p>

                  <p className="mt-2 font-bold text-slate-200">
                    {screening.severity ||
                      "—"}
                  </p>

                </div>

                {/* AI RECOMMENDATION */}

                {screening.recommendation && (
                  <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5">

                    <p className="text-xs font-semibold text-yellow-300">
                      AI Screening Recommendation
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {screening.recommendation}
                    </p>

                  </div>
                )}

                {/* SCREENING ID */}

                {screening.scan_id && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0c172b] p-4">

                    <p className="text-xs text-slate-500">
                      Screening ID
                    </p>

                    <p className="mt-1 font-mono text-sm text-cyan-300">
                      {screening.scan_id}
                    </p>

                  </div>
                )}

              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5">

                <p className="font-semibold text-yellow-300">
                  No Linked Screening Found
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  OcuSphere could not find an AI
                  retinal screening record associated
                  with this appointment.
                </p>

              </div>
            )}

          </section>

          {/* =================================================
              PROVIDER REVIEW
          ================================================= */}

          <form
            onSubmit={handleSaveReview}
            className="rounded-3xl border border-white/10 bg-[#081120] p-7"
          >

            <p className="text-xs font-bold tracking-[0.25em] text-emerald-300">
              PROVIDER REVIEW
            </p>

            <h2 className="mt-4 text-2xl font-bold">
              Clinical Assessment
            </h2>

            {clinicalReview && (
              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">

                <p className="text-sm font-semibold text-emerald-300">
                  Existing clinical review loaded
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  You can update and save this review
                  again if required.
                </p>

              </div>
            )}

            {/* ASSESSMENT */}

            <div className="mt-6">

              <label className="text-sm font-medium text-slate-200">
                Clinical Assessment *
              </label>

              <textarea
                rows={5}
                value={
                  clinicalAssessment
                }
                onChange={(event) =>
                  setClinicalAssessment(
                    event.target.value
                  )
                }
                placeholder="Enter your professional assessment of the screening result..."
                disabled={saving}
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
              />

            </div>

            {/* RECOMMENDATION */}

            <div className="mt-5">

              <label className="text-sm font-medium text-slate-200">
                Recommendation *
              </label>

              <select
                value={recommendation}
                onChange={(event) =>
                  setRecommendation(
                    event.target.value
                  )
                }
                disabled={saving}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none focus:border-cyan-400 disabled:opacity-60"
              >

                <option value="">
                  Select recommendation
                </option>

                <option value="routine">
                  Routine follow-up
                </option>

                <option value="examination">
                  Further retinal examination
                </option>

                <option value="consultation">
                  Schedule consultation
                </option>

                <option value="urgent">
                  Urgent ophthalmology review
                </option>

              </select>

            </div>

            {/* NOTES */}

            <div className="mt-5">

              <label className="text-sm font-medium text-slate-200">
                Additional Notes
              </label>

              <textarea
                rows={3}
                value={
                  additionalNotes
                }
                onChange={(event) =>
                  setAdditionalNotes(
                    event.target.value
                  )
                }
                placeholder="Add optional clinical notes..."
                disabled={saving}
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 disabled:opacity-60"
              />

            </div>

            {/* SAVE */}

            <button
              type="submit"
              disabled={saving}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving Clinical Review..."
                : clinicalReview
                ? "Update Clinical Review →"
                : "Save Clinical Review →"}
            </button>

          </form>

        </div>

        {/* NOTICE */}

        <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">

          <p className="text-sm font-semibold text-yellow-300">
            Clinical Review Notice
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            The AI screening result is
            decision-support information and does
            not replace professional clinical
            judgement. Provider assessments should
            be recorded independently from the AI
            prediction.
          </p>

        </div>

      </div>

    </main>
  );
}

// ===========================================================
// INFO CARD
// ===========================================================

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c172b] p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}