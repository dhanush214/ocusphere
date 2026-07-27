"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

type StoredAppointment = {
  id: string;
  patientName: string;
  phone: string;
  email: string;
  provider: string;
  appointmentDate: string;
  appointmentTime: string;
  visitReason: string;
  notes: string;
  status?: string;
  createdAt?: string;
  screeningResult?: string | null;
  screeningGrade?: string | null;
  screeningConfidence?: number | string | null;
};

type BackendAppointment = {
  request_id: string;
  patient_name: string;
  phone: string;
  email?: string;
  provider: string;
  provider_id?: string;
  preferred_date: string;
  preferred_time: string;
  reason?: string;
  notes?: string;
  status: string;
  created_at?: string;
};

type AppointmentResponse = {
  success: boolean;
  appointment?: BackendAppointment;
  detail?: string;
};

export default function AppointmentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointment, setAppointment] =
    useState<StoredAppointment | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusError, setStatusError] = useState("");

  /*
   * Fetch the latest appointment directly from FastAPI.
   */
  const fetchLatestAppointment = useCallback(
    async (
      requestId: string,
      currentAppointment?: StoredAppointment | null
    ) => {
      try {
        setRefreshing(true);

        const response = await fetch(
          `${API_URL}/appointments/${encodeURIComponent(
            requestId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        let data: AppointmentResponse;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            "The OcuSphere backend returned an invalid response."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "This appointment request could not be found."
          );
        }

        if (!response.ok || !data.appointment) {
          throw new Error(
            data.detail ||
              "Unable to retrieve the latest appointment status."
          );
        }

        const backendAppointment = data.appointment;

        /*
         * Convert backend field names to the field names
         * already used by this page.
         *
         * We preserve screening information from sessionStorage
         * because the appointment API does not contain those
         * screening fields.
         */
        const updatedAppointment: StoredAppointment = {
          id: backendAppointment.request_id,

          patientName:
            backendAppointment.patient_name || "",

          phone:
            backendAppointment.phone || "",

          email:
            backendAppointment.email || "",

          provider:
            backendAppointment.provider || "",

          appointmentDate:
            backendAppointment.preferred_date || "",

          appointmentTime:
            backendAppointment.preferred_time || "",

          visitReason:
            backendAppointment.reason ||
            "General Eye Consultation",

          notes:
            backendAppointment.notes || "",

          status:
            backendAppointment.status ||
            "Pending Confirmation",

          createdAt:
            backendAppointment.created_at,

          screeningResult:
            currentAppointment?.screeningResult ?? null,

          screeningGrade:
            currentAppointment?.screeningGrade ?? null,

          screeningConfidence:
            currentAppointment?.screeningConfidence ?? null,
        };

        setAppointment(updatedAppointment);
        setStatusError("");

        /*
         * Keep the browser copy updated as well.
         */
        sessionStorage.setItem(
          "ocusphereAppointment",
          JSON.stringify(updatedAppointment)
        );

        return updatedAppointment;
      } catch (error) {
        console.error(
          "Unable to refresh appointment:",
          error
        );

        if (error instanceof TypeError) {
          setStatusError(
            "Unable to connect to the OcuSphere backend."
          );
        } else if (error instanceof Error) {
          setStatusError(error.message);
        } else {
          setStatusError(
            "Unable to refresh appointment status."
          );
        }

        return null;
      } finally {
        setRefreshing(false);
      }
    },
    []
  );

  /*
   * Initial page load.
   */
  useEffect(() => {
    async function loadAppointment() {
      try {
        const appointmentIdFromUrl =
          searchParams.get("id");

        const stored =
          sessionStorage.getItem(
            "ocusphereAppointment"
          );

        let parsed: StoredAppointment | null = null;

        if (stored) {
          try {
            parsed = JSON.parse(stored);
          } catch {
            parsed = null;
          }
        }

        /*
         * Prefer the Request ID in the URL.
         * If it is missing, fall back to sessionStorage.
         */
        const requestId =
          appointmentIdFromUrl ||
          parsed?.id ||
          "";

        if (!requestId) {
          setNotFound(true);
          return;
        }

        /*
         * Show stored data immediately while the backend
         * request is being made.
         */
        if (parsed && parsed.id === requestId) {
          setAppointment(parsed);
        }

        const latest =
          await fetchLatestAppointment(
            requestId,
            parsed
          );

        /*
         * Only show "not found" if neither the backend
         * nor sessionStorage provided usable data.
         */
        if (!latest && !parsed) {
          setNotFound(true);
        }
      } catch (error) {
        console.error(
          "Unable to load appointment:",
          error
        );

        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [searchParams, fetchLatestAppointment]);

  /*
   * Automatically check the backend every 5 seconds.
   *
   * This means the patient page can update from:
   * Pending -> Confirmed
   * without manually refreshing the browser.
   */
  useEffect(() => {
    if (!appointment?.id) {
      return;
    }

    const requestId = appointment.id;

    const interval = window.setInterval(() => {
      fetchLatestAppointment(
        requestId,
        appointment
      );
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    appointment?.id,
    fetchLatestAppointment,
  ]);

  /*
   * Also refresh when the patient returns to this tab.
   */
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        appointment?.id
      ) {
        fetchLatestAppointment(
          appointment.id,
          appointment
        );
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [appointment, fetchLatestAppointment]);

  if (loading && !appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />

          <p className="mt-4 text-slate-400">
            Loading appointment request...
          </p>
        </div>
      </main>
    );
  }

  if (notFound || !appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.025] p-8 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-xl text-yellow-300">
            !
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            Appointment Request Not Found
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            We could not find the appointment
            request associated with this page.
          </p>

          <button
            onClick={() =>
              router.push("/appointments")
            }
            className="mt-7 rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-3.5 font-semibold transition hover:opacity-90"
          >
            Create Appointment Request →
          </button>

        </section>
      </main>
    );
  }

  const statusInfo =
    getStatusInformation(appointment.status);

  return (
    <main className="min-h-screen bg-[#020817] text-white">

      <div className="mx-auto max-w-5xl px-6 py-16">

        <button
          onClick={() =>
            router.push("/patient-dashboard")
          }
          className="mb-12 text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Return to Patient Dashboard
        </button>

        {/* HEADER */}

        <section className="text-center">

          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${statusInfo.iconBox}`}
          >
            <span
              className={`text-4xl ${statusInfo.iconText}`}
            >
              {statusInfo.icon}
            </span>
          </div>

          <p
            className={`mt-6 text-sm font-semibold tracking-[0.25em] ${statusInfo.labelColour}`}
          >
            {statusInfo.label}
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            {statusInfo.pageTitle}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-400">
            {statusInfo.pageDescription}
          </p>

        </section>

        {/* STATUS */}

        <section
          className={`mt-12 rounded-3xl border p-8 ${statusInfo.statusBox}`}
        >

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
                APPOINTMENT STATUS
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                {statusInfo.title}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                {statusInfo.description}
              </p>

              <div className="mt-4 flex items-center gap-3">

                {refreshing && (
                  <p className="text-xs text-slate-500">
                    Checking latest status...
                  </p>
                )}

                {!refreshing && (
                  <p className="text-xs text-slate-600">
                    Status automatically updates
                  </p>
                )}

              </div>

            </div>

            <div
              className={`rounded-2xl border px-5 py-4 ${statusInfo.badgeBox}`}
            >

              <p className="text-xs text-slate-400">
                Current Status
              </p>

              <p
                className={`mt-1 font-semibold ${statusInfo.badgeText}`}
              >
                ● {appointment.status ||
                  "Pending Confirmation"}
              </p>

            </div>

          </div>

        </section>

        {/* STATUS ERROR */}

        {statusError && (
          <section className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.035] p-4">

            <p className="text-sm text-yellow-300">
              ⚠ {statusError}
            </p>

            <button
              onClick={() =>
                fetchLatestAppointment(
                  appointment.id,
                  appointment
                )
              }
              className="mt-3 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Try Again →
            </button>

          </section>
        )}

        {/* REQUEST ID */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm text-slate-400">
                OcuSphere Request ID
              </p>

              <p className="mt-1 text-xl font-semibold text-cyan-300">
                {appointment.id}
              </p>

            </div>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Keep this reference number for your
              records and appointment tracking.
            </p>

          </div>

        </section>

        {/* APPOINTMENT DETAILS */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-8">

          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
            REQUEST DETAILS
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Appointment Information
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">

            <DetailCard
              title="Patient"
              value={
                appointment.patientName ||
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
                appointment.appointmentDate
              )}
            />

            <DetailCard
              title="Preferred Time"
              value={formatTime(
                appointment.appointmentTime
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
                  appointment.visitReason ||
                  "Not provided"
                }
              />
            </div>

            {appointment.notes && (
              <div className="md:col-span-2">
                <DetailCard
                  title="Additional Notes"
                  value={appointment.notes}
                />
              </div>
            )}

          </div>

        </section>

        {/* SCREENING */}

        {(appointment.screeningResult ||
          appointment.screeningGrade ||
          appointment.screeningConfidence != null) && (

          <section className="mt-8 rounded-3xl border border-purple-400/20 bg-purple-400/[0.035] p-8">

            <p className="text-xs font-semibold tracking-[0.2em] text-purple-300">
              OCUSPHERE SCREENING
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Screening Information
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">

              <DetailCard
                title="AI Result"
                value={
                  appointment.screeningResult ||
                  "Not provided"
                }
              />

              <DetailCard
                title="DR Grade"
                value={
                  appointment.screeningGrade ||
                  "Not provided"
                }
              />

              <DetailCard
                title="AI Confidence"
                value={formatConfidence(
                  appointment.screeningConfidence
                )}
              />

            </div>

          </section>
        )}

        {/* NEXT STEPS */}

        <section className="mt-10">

          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300">
            NEXT STEPS
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            What happens next?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <StepCard
              number="1"
              title="Request Recorded"
              description="Your appointment request has been securely recorded in OcuSphere."
            />

            <StepCard
              number="2"
              title={
                normalizeStatus(appointment.status) ===
                "confirmed"
                  ? "Provider Confirmed"
                  : "Provider Review"
              }
              description={
                normalizeStatus(appointment.status) ===
                "confirmed"
                  ? "Your selected eye-care provider has confirmed the appointment request."
                  : "Your selected eye-care provider reviews the requested date and time."
              }
            />

            <StepCard
              number="3"
              title={
                normalizeStatus(appointment.status) ===
                "completed"
                  ? "Consultation Completed"
                  : "Eye-Care Consultation"
              }
              description={
                normalizeStatus(appointment.status) ===
                "completed"
                  ? "The provider has marked this consultation as completed."
                  : "Attend the consultation according to the confirmed appointment details."
              }
            />

          </div>

        </section>

        {/* MEDICAL NOTICE */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">

          <p className="font-semibold text-slate-300">
            Medical Notice
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            OcuSphere is intended to support
            AI-assisted eye screening and care
            navigation. AI screening results
            should not replace diagnosis,
            treatment decisions or medical advice
            from a qualified healthcare
            professional.
          </p>

        </section>

        {/* BUTTONS */}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">

          <button
            onClick={() =>
              router.push("/doctors")
            }
            className="rounded-xl border border-cyan-400/30 px-6 py-4 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            Find Eye Care
          </button>

          <button
            onClick={() =>
              router.push("/track-appointment")
            }
            className="rounded-xl border border-purple-400/30 px-6 py-4 font-semibold text-purple-300 transition hover:bg-purple-400/10"
          >
            Track Appointment
          </button>

          <button
            onClick={() =>
              router.push("/patient-dashboard")
            }
            className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold text-white transition hover:opacity-90"
          >
            Patient Dashboard →
          </button>

        </div>

      </div>

    </main>
  );
}

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

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 font-semibold text-cyan-300">
        {number}
      </div>

      <h3 className="mt-5 font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>

    </div>
  );
}

function getStatusInformation(
  status?: string
) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "confirmed") {
    return {
      icon: "✓",
      iconBox:
        "border-emerald-400/30 bg-emerald-400/10",
      iconText: "text-emerald-400",
      labelColour: "text-emerald-400",
      label: "APPOINTMENT CONFIRMED",
      pageTitle: "Your Appointment Is Confirmed",
      pageDescription:
        "Your selected eye-care provider has confirmed your appointment request.",
      title: "Appointment Confirmed",
      description:
        "Your healthcare provider has accepted this appointment request. Please attend according to the confirmed appointment details.",
      statusBox:
        "border-emerald-400/20 bg-emerald-400/[0.04]",
      badgeBox:
        "border-emerald-400/20 bg-emerald-400/[0.06]",
      badgeText: "text-emerald-300",
    };
  }

  if (normalized === "completed") {
    return {
      icon: "✓",
      iconBox:
        "border-cyan-400/30 bg-cyan-400/10",
      iconText: "text-cyan-300",
      labelColour: "text-cyan-300",
      label: "APPOINTMENT COMPLETED",
      pageTitle: "Consultation Completed",
      pageDescription:
        "Your eye-care provider has marked this appointment as completed.",
      title: "Appointment Completed",
      description:
        "The consultation associated with this appointment request has been completed.",
      statusBox:
        "border-cyan-400/20 bg-cyan-400/[0.04]",
      badgeBox:
        "border-cyan-400/20 bg-cyan-400/[0.06]",
      badgeText: "text-cyan-300",
    };
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled"
  ) {
    const cancelled =
      normalized === "cancelled";

    return {
      icon: "×",
      iconBox:
        "border-red-400/30 bg-red-400/10",
      iconText: "text-red-300",
      labelColour: "text-red-300",
      label: cancelled
        ? "APPOINTMENT CANCELLED"
        : "REQUEST NOT ACCEPTED",
      pageTitle: cancelled
        ? "Appointment Cancelled"
        : "Appointment Request Not Accepted",
      pageDescription: cancelled
        ? "This appointment request has been cancelled."
        : "The selected eye-care provider was unable to accept this appointment request.",
      title: cancelled
        ? "Appointment Cancelled"
        : "Provider Did Not Accept Request",
      description: cancelled
        ? "This appointment is no longer active. You can submit another request if eye-care assistance is still required."
        : "You can choose another healthcare provider or submit a new appointment request.",
      statusBox:
        "border-red-400/20 bg-red-400/[0.04]",
      badgeBox:
        "border-red-400/20 bg-red-400/[0.06]",
      badgeText: "text-red-300",
    };
  }

  return {
    icon: "✓",
    iconBox:
      "border-emerald-400/30 bg-emerald-400/10",
    iconText: "text-emerald-400",
    labelColour: "text-emerald-400",
    label: "REQUEST SUBMITTED",
    pageTitle: "Appointment Request Received",
    pageDescription:
      "Your eye-care appointment request has been recorded by OcuSphere. The healthcare provider must confirm the final appointment date and time.",
    title: "Awaiting Provider Confirmation",
    description:
      "Your request has been created successfully. This does not represent a confirmed medical appointment until the selected healthcare provider accepts the request.",
    statusBox:
      "border-cyan-400/20 bg-cyan-400/[0.04]",
    badgeBox:
      "border-yellow-400/20 bg-yellow-400/[0.06]",
    badgeText: "text-yellow-300",
  };
}

function normalizeStatus(
  status?: string
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

  if (Number.isNaN(parsedDate.getTime())) {
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

  const parts = time.split(":");

  if (parts.length < 2) {
    return time;
  }

  const hourString = parts[0];
  const minute = parts[1];

  let hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return time;
  }

  const period =
    hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

function formatConfidence(
  confidence:
    | number
    | string
    | null
    | undefined
) {
  if (
    confidence === null ||
    confidence === undefined ||
    confidence === ""
  ) {
    return "Not provided";
  }

  const value = String(confidence);

  if (value.includes("%")) {
    return value;
  }

  return `${value}%`;
}