"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

type BackendAppointment = {
  request_id: string;
  patient_name: string;
  phone: string;
  email?: string;
  provider: string;
  preferred_date: string;
  preferred_time: string;
  reason?: string;
  notes?: string;
  status: string;
  created_at: string;
};

type ClinicalReview = {
  review_id: string;
  request_id: string;
  scan_id?: string;
  clinical_assessment: string;
  recommendation: string;
  additional_notes?: string;
  provider_name?: string;
  created_at?: string;
  updated_at?: string;
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function TrackAppointmentPage() {
  const router = useRouter();

  const [requestId, setRequestId] = useState("");

  const [appointment, setAppointment] =
    useState<BackendAppointment | null>(null);

  const [clinicalReview, setClinicalReview] =
    useState<ClinicalReview | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     TRACK APPOINTMENT
  ======================================================= */

  async function handleTrack(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setAppointment(null);
    setClinicalReview(null);

    const cleanedId = requestId.trim();

    if (!cleanedId) {
      setError(
        "Please enter your OcuSphere Request ID."
      );
      return;
    }

    setLoading(true);

    try {
      /* ---------------------------------------------------
         GET APPOINTMENT
      --------------------------------------------------- */

      const response = await fetch(
        `${API_URL}/appointments/${encodeURIComponent(
          cleanedId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "No appointment was found with this Request ID."
          );
        }

        throw new Error(
          data?.detail ||
            "Unable to retrieve the appointment."
        );
      }

      const result =
        data?.appointment || data;

      setAppointment(result);

      /* ---------------------------------------------------
         GET PROVIDER CLINICAL REVIEW
      --------------------------------------------------- */

      try {
        const reviewResponse = await fetch(
          `${API_URL}/appointments/${encodeURIComponent(
            result.request_id
          )}/clinical-review`,
          {
            cache: "no-store",
          }
        );

        if (reviewResponse.ok) {
          const reviewData =
            await reviewResponse.json();

          setClinicalReview(
            reviewData?.clinical_review || null
          );
        } else {
          // No review yet is perfectly valid.
          setClinicalReview(null);
        }
      } catch (reviewError) {
        console.error(
          "Clinical review lookup failed:",
          reviewError
        );

        setClinicalReview(null);
      }
    } catch (err) {
      console.error(
        "Appointment tracking failed:",
        err
      );

      if (err instanceof TypeError) {
        setError(
          "Could not connect to the OcuSphere backend. Make sure the backend server is running."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to retrieve the appointment."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     CLEAR SEARCH
  ======================================================= */

  function clearSearch() {
    setRequestId("");
    setAppointment(null);
    setClinicalReview(null);
    setError("");
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-5xl px-6 py-14">

        {/* BACK */}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Return to Home
        </button>

        {/* HEADER */}

        <section className="mt-12 text-center">

          <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">
            OCUSPHERE CARE NETWORK
          </p>

          <h1 className="mt-4 text-4xl font-bold md:text-5xl">
            Track Your Appointment
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            Enter your OcuSphere Request ID to view
            your appointment status and professional
            clinical review.
          </p>

        </section>

        {/* SEARCH */}

        <section className="mx-auto mt-12 max-w-2xl rounded-3xl border border-white/10 bg-white/[0.025] p-7 md:p-9">

          <form onSubmit={handleTrack}>

            <label className="block">

              <span className="text-sm font-semibold text-slate-300">
                OcuSphere Request ID
              </span>

              <input
                type="text"
                value={requestId}
                onChange={(event) =>
                  setRequestId(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Example: OCU-123456-7890"
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1529] px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />

            </label>

            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* TRACK BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Searching..."
                : "Track Appointment →"}
            </button>

          </form>

        </section>

        {/* =================================================
            APPOINTMENT RESULT
        ================================================= */}

        {appointment && (
          <div className="mt-10">

            {/* APPOINTMENT FOUND */}

            <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.025] p-7 md:p-8">

              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                <div>

                  <p className="text-xs font-bold tracking-[0.25em] text-emerald-400">
                    APPOINTMENT FOUND
                  </p>

                  <h2 className="mt-3 text-2xl font-bold">
                    Appointment Request
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Request ID
                  </p>

                  <p className="mt-1 font-semibold text-cyan-300">
                    {appointment.request_id}
                  </p>

                </div>

                <StatusBadge
                  status={appointment.status}
                />

              </div>

            </section>

            {/* =================================================
                APPOINTMENT DETAILS
            ================================================= */}

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-7 md:p-8">

              <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
                APPOINTMENT DETAILS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Request Information
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-2">

                <DetailCard
                  title="Patient"
                  value={
                    appointment.patient_name ||
                    "Not provided"
                  }
                />

                <DetailCard
                  title="Eye-Care Provider"
                  value={
                    appointment.provider ||
                    "Not provided"
                  }
                />

                <DetailCard
                  title="Preferred Date"
                  value={formatDate(
                    appointment.preferred_date
                  )}
                />

                <DetailCard
                  title="Preferred Time"
                  value={formatTime(
                    appointment.preferred_time
                  )}
                />

                <DetailCard
                  title="Phone"
                  value={
                    appointment.phone ||
                    "Not provided"
                  }
                />

                <DetailCard
                  title="Email"
                  value={
                    appointment.email ||
                    "Not provided"
                  }
                />

                <div className="md:col-span-2">

                  <DetailCard
                    title="Reason for Visit"
                    value={
                      appointment.reason ||
                      "Not provided"
                    }
                  />

                </div>

                {appointment.notes && (
                  <div className="md:col-span-2">

                    <DetailCard
                      title="Additional Notes"
                      value={
                        appointment.notes
                      }
                    />

                  </div>
                )}

              </div>

            </section>

            {/* =================================================
                PROFESSIONAL CLINICAL REVIEW
            ================================================= */}

            {clinicalReview && (
              <section className="mt-6 rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.035] p-7 md:p-8">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <p className="text-xs font-bold tracking-[0.25em] text-emerald-300">
                      PROFESSIONAL CLINICAL REVIEW
                    </p>

                    <h2 className="mt-3 text-2xl font-bold">
                      Provider Review Available ✓
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Your AI-assisted retinal
                      screening has been reviewed by
                      your eye-care provider.
                    </p>

                  </div>

                  <div className="w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                    ✓ Reviewed
                  </div>

                </div>

                {/* REVIEW DETAILS */}

                <div className="mt-7 grid gap-4 md:grid-cols-2">

                  <DetailCard
                    title="Reviewed By"
                    value={
                      clinicalReview.provider_name ||
                      appointment.provider ||
                      "Eye-Care Provider"
                    }
                  />

                  <DetailCard
                    title="Recommendation"
                    value={formatRecommendation(
                      clinicalReview.recommendation
                    )}
                  />

                  <div className="md:col-span-2">

                    <DetailCard
                      title="Clinical Assessment"
                      value={
                        clinicalReview.clinical_assessment ||
                        "Not provided"
                      }
                    />

                  </div>

                  {clinicalReview.additional_notes && (
                    <div className="md:col-span-2">

                      <DetailCard
                        title="Provider Notes"
                        value={
                          clinicalReview.additional_notes
                        }
                      />

                    </div>
                  )}

                  {clinicalReview.scan_id && (
                    <div className="md:col-span-2">

                      <DetailCard
                        title="Reviewed Screening ID"
                        value={
                          clinicalReview.scan_id
                        }
                      />

                    </div>
                  )}

                </div>

                {/* NOTICE */}

                <div className="mt-6 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.025] p-5">

                  <p className="text-sm leading-6 text-slate-400">
                    Follow the advice provided by
                    your healthcare professional.
                    AI-assisted screening is
                    decision-support information and
                    does not replace professional
                    medical evaluation.
                  </p>

                </div>

              </section>
            )}

            {/* =================================================
                NO REVIEW YET
            ================================================= */}

            {!clinicalReview &&
              normalizeStatus(
                appointment.status
              ) === "confirmed" && (
                <section className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-6">

                  <p className="font-semibold text-yellow-300">
                    Clinical Review Pending
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Your appointment is confirmed,
                    but a professional clinical review
                    has not yet been made available.
                  </p>

                </section>
              )}

            {/* =================================================
                STATUS JOURNEY
            ================================================= */}

            <AppointmentJourney
              status={appointment.status}
            />

            {/* =================================================
                STATUS NOTICE
            ================================================= */}

            <StatusNotice
              status={appointment.status}
              provider={appointment.provider}
              date={appointment.preferred_date}
              time={appointment.preferred_time}
            />

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">

              <button
                type="button"
                onClick={clearSearch}
                className="rounded-xl border border-purple-400/30 px-6 py-4 font-semibold text-purple-300 transition hover:bg-purple-400/10"
              >
                Track Another
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/doctors")
                }
                className="rounded-xl border border-cyan-400/30 px-6 py-4 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Find Eye Care
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold transition hover:opacity-90"
              >
                Return Home →
              </button>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}

/* =========================================================
   APPOINTMENT JOURNEY
========================================================= */

function AppointmentJourney({
  status,
}: {
  status: string;
}) {
  const normalized =
    normalizeStatus(status);

  const isPending =
    normalized === "requested" ||
    normalized === "pending" ||
    normalized ===
      "pending confirmation";

  const isConfirmed =
    normalized === "confirmed";

  const isCompleted =
    normalized === "completed";

  const isRejected =
    normalized === "rejected" ||
    normalized === "cancelled";

  return (
    <section className="mt-6 rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.025] p-7 md:p-8">

      <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
        REQUEST STATUS
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        Your Appointment Journey
      </h2>

      <div className="mt-7 grid gap-4 md:grid-cols-3">

        <JourneyCard
          number="1"
          title="Request Submitted"
          description="OcuSphere has received and stored your appointment request."
          active
          completed={
            isConfirmed ||
            isCompleted ||
            isRejected
          }
        />

        <JourneyCard
          number="2"
          title={
            isRejected
              ? "Request Declined"
              : "Provider Confirmation"
          }
          description={
            isRejected
              ? "The healthcare provider was unable to accept this appointment request."
              : isPending
              ? "Your request is waiting for the healthcare provider to review the requested date and time."
              : "The healthcare provider has reviewed your appointment request."
          }
          active={!isPending}
          completed={
            isConfirmed ||
            isCompleted
          }
          rejected={isRejected}
        />

        <JourneyCard
          number="3"
          title={
            isCompleted
              ? "Consultation Completed"
              : "Appointment"
          }
          description={
            isCompleted
              ? "The consultation has been completed and the appointment journey is finished."
              : isRejected
              ? "This stage was not reached because the appointment request was declined."
              : isConfirmed
              ? "Your appointment has been confirmed. Attend the consultation at the scheduled date and time."
              : "This stage becomes active after the healthcare provider confirms your request."
          }
          active={
            isConfirmed ||
            isCompleted
          }
          completed={isCompleted}
        />

      </div>

    </section>
  );
}

/* =========================================================
   STATUS NOTICE
========================================================= */

function StatusNotice({
  status,
  provider,
  date,
  time,
}: {
  status: string;
  provider: string;
  date: string;
  time: string;
}) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "confirmed") {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-6">

        <p className="font-semibold text-emerald-300">
          ✓ Appointment Confirmed
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Your appointment request has been
          confirmed by{" "}
          <span className="font-semibold text-white">
            {provider ||
              "the healthcare provider"}
          </span>
          . Your scheduled appointment is{" "}
          <span className="font-semibold text-white">
            {formatDate(date)}
          </span>{" "}
          at{" "}
          <span className="font-semibold text-white">
            {formatTime(time)}
          </span>
          .
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Please follow any instructions
          provided by the healthcare provider
          and arrive on time for your
          consultation.
        </p>

      </section>
    );
  }

  if (normalized === "completed") {
    return (
      <section className="mt-6 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.04] p-6">

        <p className="font-semibold text-cyan-300">
          ✓ Consultation Completed
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          This appointment has been marked as
          completed. Your appointment journey
          for this request is now complete.
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Keep your professional clinical review
          for reference and follow the
          recommendation provided by your
          eye-care provider.
        </p>

      </section>
    );
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled"
  ) {
    return (
      <section className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/[0.04] p-6">

        <p className="font-semibold text-red-300">
          × Appointment Request Declined
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          The selected healthcare provider was
          unable to accept this appointment
          request.
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          You can use Find Eye Care to select
          another provider or submit a new
          appointment request.
        </p>

      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-6">

      <p className="font-semibold text-yellow-300">
        ● Awaiting Provider Confirmation
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Your appointment request has been
        successfully submitted and is currently
        waiting for the selected healthcare
        provider to review it.
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        The requested date and time are not
        considered confirmed until the
        healthcare provider accepts the request.
        You can return later and use your
        OcuSphere Request ID to check for
        updates.
      </p>

    </section>
  );
}

/* =========================================================
   DETAIL CARD
========================================================= */

function DetailCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#081225] p-5">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    normalizeStatus(status);

  let classes =
    "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-300";

  let label =
    status || "Pending Confirmation";

  if (normalized === "confirmed") {
    classes =
      "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300";

    label = "Confirmed";
  }

  if (normalized === "completed") {
    classes =
      "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300";

    label = "Completed";
  }

  if (
    normalized === "cancelled" ||
    normalized === "rejected"
  ) {
    classes =
      "border-red-400/20 bg-red-400/[0.06] text-red-300";

    label = "Rejected";
  }

  if (
    normalized === "requested" ||
    normalized === "pending" ||
    normalized ===
      "pending confirmation"
  ) {
    label = "Pending Confirmation";
  }

  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${classes}`}
    >

      <p className="text-xs opacity-70">
        Current Status
      </p>

      <p className="mt-1 font-semibold">
        ● {label}
      </p>

    </div>
  );
}

/* =========================================================
   JOURNEY CARD
========================================================= */

function JourneyCard({
  number,
  title,
  description,
  active,
  completed = false,
  rejected = false,
}: {
  number: string;
  title: string;
  description: string;
  active: boolean;
  completed?: boolean;
  rejected?: boolean;
}) {
  let cardClasses =
    "border-white/10 bg-white/[0.02]";

  let numberClasses =
    "border-white/10 text-slate-500";

  let titleClasses =
    "text-slate-500";

  if (active) {
    cardClasses =
      "border-cyan-400/25 bg-cyan-400/[0.04]";

    numberClasses =
      "border-cyan-400/40 bg-cyan-400/10 text-cyan-300";

    titleClasses = "text-white";
  }

  if (completed) {
    cardClasses =
      "border-emerald-400/25 bg-emerald-400/[0.04]";

    numberClasses =
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";

    titleClasses =
      "text-emerald-100";
  }

  if (rejected) {
    cardClasses =
      "border-red-400/25 bg-red-400/[0.04]";

    numberClasses =
      "border-red-400/40 bg-red-400/10 text-red-300";

    titleClasses =
      "text-red-200";
  }

  return (
    <div
      className={`rounded-2xl border p-6 ${cardClasses}`}
    >

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border font-semibold ${numberClasses}`}
      >
        {completed
          ? "✓"
          : rejected
          ? "×"
          : number}
      </div>

      <h3
        className={`mt-5 font-semibold ${titleClasses}`}
      >
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(
  status: string
) {
  return (status || "")
    .trim()
    .toLowerCase();
}

function formatDate(date: string) {
  if (!date) {
    return "Not specified";
  }

  const parsedDate =
    new Date(`${date}T00:00:00`);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(time: string) {
  if (!time) {
    return "Not specified";
  }

  const [hourString, minute] =
    time.split(":");

  let hour =
    Number(hourString);

  if (
    Number.isNaN(hour) ||
    minute === undefined
  ) {
    return time;
  }

  const period =
    hour >= 12 ? "PM" : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

function formatRecommendation(
  recommendation: string
) {
  const value =
    (recommendation || "").trim();

  switch (value.toLowerCase()) {
    case "routine":
      return "Routine follow-up";

    case "examination":
      return "Further retinal examination";

    case "consultation":
      return "Schedule consultation";

    case "urgent":
      return "Urgent ophthalmology review";

    default:
      return value || "Not provided";
  }
}