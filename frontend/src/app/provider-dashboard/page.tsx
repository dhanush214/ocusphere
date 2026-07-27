"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "ocusphere_provider_token";
const PROVIDER_KEY = "ocusphere_provider";
const EXPIRES_KEY = "ocusphere_provider_expires_at";

type Appointment = {
  id: number;
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
  scan_id?: string | null;
};

type Provider = {
  provider_id: string;
  provider_name: string;
  email?: string | null;
};

type AppointmentsResponse = {
  success: boolean;
  count: number;
  appointments: Appointment[];
  provider?: Provider;
  detail?: string;
};

type StatusUpdateResponse = {
  success?: boolean;
  message?: string;
  appointment?: Appointment;
  status?: string;
  detail?: string;
};

export default function ProviderDashboardPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  function clearProviderSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROVIDER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  }

  function redirectToLogin() {
    clearProviderSession();
    router.replace("/provider-login");
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  const loadAppointments = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      localStorage.removeItem(PROVIDER_KEY);
      localStorage.removeItem(EXPIRES_KEY);
      router.replace("/provider-login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      let data: AppointmentsResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The OcuSphere backend returned an invalid response."
        );
      }

      if (response.status === 401 || response.status === 403) {
        clearProviderSession();
        router.replace("/provider-login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load appointment requests."
        );
      }

      setAppointments(data.appointments || []);

      if (data.provider) {
        setProvider(data.provider);

        localStorage.setItem(
          PROVIDER_KEY,
          JSON.stringify(data.provider)
        );
      }
    } catch (err) {
      console.error("Dashboard error:", err);

      if (err instanceof TypeError) {
        setError(
          "Could not connect to the OcuSphere backend. Make sure FastAPI is running on port 8000."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load appointments.");
      }
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    async function initialiseDashboard() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        clearProviderSession();
        router.replace("/provider-login");
        return;
      }

      const expiresAt = localStorage.getItem(EXPIRES_KEY);

      if (expiresAt) {
        const expiryTime = new Date(expiresAt).getTime();

        if (
          !Number.isNaN(expiryTime) &&
          expiryTime <= Date.now()
        ) {
          clearProviderSession();
          router.replace("/provider-login");
          return;
        }
      }

      const storedProvider = localStorage.getItem(PROVIDER_KEY);

      if (storedProvider) {
        try {
          const parsedProvider = JSON.parse(storedProvider);

          if (
            parsedProvider &&
            typeof parsedProvider === "object"
          ) {
            setProvider(parsedProvider);
          }
        } catch {
          localStorage.removeItem(PROVIDER_KEY);
        }
      }

      try {
        const response = await fetch(`${API_URL}/provider/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        let data: {
          success?: boolean;
          provider?: Provider;
          detail?: string;
        } = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.status === 401 || response.status === 403) {
          clearProviderSession();
          router.replace("/provider-login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to verify provider session."
          );
        }

        if (data.provider) {
          setProvider(data.provider);

          localStorage.setItem(
            PROVIDER_KEY,
            JSON.stringify(data.provider)
          );
        }

        await loadAppointments();
      } catch (err) {
        console.error("Authentication check error:", err);

        if (err instanceof TypeError) {
          setError(
            "Could not connect to the OcuSphere backend. Make sure FastAPI is running on port 8000."
          );

          setCheckingAuth(false);
          setLoading(false);
        } else {
          clearProviderSession();
          router.replace("/provider-login");
        }
      }
    }

    initialiseDashboard();
  }, [loadAppointments, router]);

  async function updateAppointmentStatus(
    appointment: Appointment,
    newStatus: string
  ) {
    const token = getToken();

    if (!token) {
      redirectToLogin();
      return;
    }

    setUpdatingStatus(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `${API_URL}/appointments/${encodeURIComponent(
          appointment.request_id
        )}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      let data: StatusUpdateResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        let message = "Unable to update appointment status.";

        if (typeof data.detail === "string") {
          message = data.detail;
        } else if (typeof data.message === "string") {
          message = data.message;
        }

        throw new Error(message);
      }

      const updatedAppointment: Appointment = {
        ...appointment,
        ...(data.appointment || {}),
        status:
          data.appointment?.status ||
          data.status ||
          newStatus,
      };

      setAppointments((previousAppointments) =>
        previousAppointments.map((item) =>
          item.request_id === appointment.request_id
            ? updatedAppointment
            : item
        )
      );

      setSelectedAppointment(updatedAppointment);

      if (normalizeStatus(newStatus) === "confirmed") {
        setStatusMessage(
          "Appointment request confirmed successfully."
        );
      } else if (normalizeStatus(newStatus) === "rejected") {
        setStatusMessage(
          "Appointment request rejected successfully."
        );
      } else if (normalizeStatus(newStatus) === "completed") {
        setStatusMessage(
          "Appointment marked as completed successfully."
        );
      } else {
        setStatusMessage(
          `Appointment status changed to ${newStatus}.`
        );
      }

      await loadAppointments();

      setSelectedAppointment((current) => {
        if (!current) {
          return null;
        }

        return {
          ...current,
          status: newStatus,
        };
      });
    } catch (err) {
      console.error("Status update error:", err);

      if (err instanceof TypeError) {
        setStatusError(
          "Could not connect to the OcuSphere backend."
        );
      } else if (err instanceof Error) {
        setStatusError(err.message);
      } else {
        setStatusError(
          "Unable to update the appointment status."
        );
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleLogout() {
    const token = getToken();

    setLoggingOut(true);

    try {
      if (token) {
        await fetch(`${API_URL}/provider/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      clearProviderSession();
      setAppointments([]);
      setProvider(null);
      setSelectedAppointment(null);
      setLoggingOut(false);

      router.replace("/provider-login");
    }
  }

  function openAppointment(appointment: Appointment) {
    setStatusError("");
    setStatusMessage("");
    setSelectedAppointment(appointment);
  }

  function closeAppointment() {
    if (updatingStatus) {
      return;
    }

    setSelectedAppointment(null);
    setStatusError("");
    setStatusMessage("");
  }

  function openClinicalReview(appointment: Appointment) {
    router.push(
      `/provider-review?request_id=${encodeURIComponent(
        appointment.request_id
      )}`
    );
  }

  const pendingCount = appointments.filter(
    (appointment) =>
      normalizeStatus(appointment.status) ===
        "pending confirmation" ||
      normalizeStatus(appointment.status) === "pending"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) =>
      normalizeStatus(appointment.status) === "confirmed"
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      normalizeStatus(appointment.status) === "completed"
  ).length;

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />

          <p className="mt-5 text-sm text-slate-400">
            Verifying provider session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* HEADER */}

        <section className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              OcuSphere Care Network
            </p>

            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
              Provider Dashboard
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-400">
              Review incoming eye-care appointment requests,
              manage provider decisions and monitor their
              current status.
            </p>

            {provider && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2">
                  <p className="text-xs text-slate-500">
                    Signed in as
                  </p>

                  <p className="mt-1 text-sm font-semibold text-emerald-300">
                    {provider.provider_name}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2">
                  <p className="text-xs text-slate-500">
                    Provider ID
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {provider.provider_id}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={loadAppointments}
              disabled={loading}
              className="rounded-xl border border-cyan-400/30 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Home
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-red-400/20 bg-red-400/[0.04] px-5 py-3 font-semibold text-red-300 transition hover:bg-red-400/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Signing Out..." : "Logout"}
            </button>

          </div>
        </section>

        {/* STATISTICS */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Total Requests"
            value={appointments.length}
            description="All appointment requests"
          />

          <StatCard
            title="Pending"
            value={pendingCount}
            description="Waiting for review"
          />

          <StatCard
            title="Confirmed"
            value={confirmedCount}
            description="Provider confirmed"
          />

          <StatCard
            title="Completed"
            value={completedCount}
            description="Consultation completed"
          />

        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5">

            <p className="font-semibold text-red-300">
              Unable to load appointments
            </p>

            <p className="mt-2 text-sm text-red-200">
              {error}
            </p>

            <button
              onClick={loadAppointments}
              className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
            >
              Try Again
            </button>

          </div>
        )}

        {/* APPOINTMENTS */}

        <section className="mt-10">

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Incoming Requests
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Appointment Requests
          </h2>

          {loading && appointments.length === 0 && (
            <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-10 text-center">

              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />

              <p className="mt-4 text-slate-400">
                Loading appointment requests...
              </p>

            </div>
          )}

          {!loading &&
            !error &&
            appointments.length === 0 && (
              <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-10 text-center">

                <p className="text-lg font-semibold text-slate-300">
                  No appointment requests
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  New patient appointment requests will appear here.
                </p>

              </div>
            )}

          {appointments.length > 0 && (
            <div className="mt-7 space-y-4">

              {appointments.map((appointment) => (
                <article
                  key={appointment.request_id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-400/20"
                >

                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-3">

                        <p className="font-bold text-cyan-300">
                          {appointment.request_id}
                        </p>

                        <StatusBadge status={appointment.status} />

                      </div>

                      <h3 className="mt-4 text-xl font-bold">
                        {appointment.patient_name}
                      </h3>

                      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">

                        <SmallDetail
                          label="Provider"
                          value={appointment.provider}
                        />

                        <SmallDetail
                          label="Preferred Date"
                          value={formatDate(
                            appointment.preferred_date
                          )}
                        />

                        <SmallDetail
                          label="Preferred Time"
                          value={formatTime(
                            appointment.preferred_time
                          )}
                        />

                        <SmallDetail
                          label="Reason"
                          value={
                            appointment.reason ||
                            "Not provided"
                          }
                        />

                      </div>

                    </div>

                    <button
                      onClick={() => openAppointment(appointment)}
                      className="shrink-0 rounded-xl border border-cyan-400/30 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
                    >
                      View Request →
                    </button>

                  </div>

                </article>
              ))}

            </div>
          )}

        </section>

        {/* INFORMATION */}

        <section className="mt-10 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.025] p-5">

          <p className="font-semibold text-yellow-300">
            Provider Dashboard
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Appointment requests are stored in the OcuSphere
            database. Provider decisions made from this
            authenticated dashboard update the appointment
            status used by the patient tracking system.
          </p>

        </section>

      </div>

      {/* APPOINTMENT MODAL */}

      {selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !updatingStatus
            ) {
              closeAppointment();
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#071225] p-6 shadow-2xl md:p-8">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Appointment Request
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Patient Request Details
                </h2>

                <p className="mt-2 font-semibold text-cyan-300">
                  {selectedAppointment.request_id}
                </p>

              </div>

              <button
                onClick={closeAppointment}
                disabled={updatingStatus}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                ×
              </button>

            </div>

            <div className="mt-6">
              <StatusBadge status={selectedAppointment.status} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <DetailCard
                title="Patient"
                value={selectedAppointment.patient_name}
              />

              <DetailCard
                title="Phone"
                value={
                  selectedAppointment.phone ||
                  "Not provided"
                }
              />

              <DetailCard
                title="Email"
                value={
                  selectedAppointment.email ||
                  "Not provided"
                }
              />

              <DetailCard
                title="Provider"
                value={selectedAppointment.provider}
              />

              <DetailCard
                title="Preferred Date"
                value={formatDate(
                  selectedAppointment.preferred_date
                )}
              />

              <DetailCard
                title="Preferred Time"
                value={formatTime(
                  selectedAppointment.preferred_time
                )}
              />

              <div className="sm:col-span-2">
                <DetailCard
                  title="Reason for Visit"
                  value={
                    selectedAppointment.reason ||
                    "Not provided"
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <DetailCard
                  title="Additional Notes"
                  value={
                    selectedAppointment.notes ||
                    "No additional notes"
                  }
                />
              </div>

            </div>

            {statusMessage && (
              <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">

                <p className="font-semibold text-emerald-300">
                  Status Updated
                </p>

                <p className="mt-2 text-sm text-emerald-100">
                  {statusMessage}
                </p>

              </div>
            )}

            {statusError && (
              <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5">

                <p className="font-semibold text-red-300">
                  Unable to Update Status
                </p>

                <p className="mt-2 text-sm text-red-200">
                  {statusError}
                </p>

              </div>
            )}

            <ProviderStatusControls
              appointment={selectedAppointment}
              updating={updatingStatus}
              onUpdate={updateAppointmentStatus}
              onReview={openClinicalReview}
            />

            <button
              onClick={closeAppointment}
              disabled={updatingStatus}
              className="mt-7 w-full rounded-xl border border-white/10 px-5 py-3.5 font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Close
            </button>

          </div>

        </div>
      )}

    </main>
  );
}

function ProviderStatusControls({
  appointment,
  updating,
  onUpdate,
  onReview,
}: {
  appointment: Appointment;
  updating: boolean;

  onUpdate: (
    appointment: Appointment,
    status: string
  ) => Promise<void>;

  onReview: (
    appointment: Appointment
  ) => void;
}) {
  const status = normalizeStatus(appointment.status);

  if (
    status === "pending confirmation" ||
    status === "pending"
  ) {
    return (
      <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.025] p-5">

        <p className="font-semibold text-cyan-300">
          Provider Decision
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Review the patient&apos;s requested date and time
          before accepting or rejecting this appointment
          request.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <button
            onClick={() =>
              onUpdate(appointment, "Confirmed")
            }
            disabled={updating}
            className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] px-5 py-3.5 font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating
              ? "Updating..."
              : "✓ Confirm Request"}
          </button>

          <button
            onClick={() =>
              onUpdate(appointment, "Rejected")
            }
            disabled={updating}
            className="rounded-xl border border-red-400/30 bg-red-400/[0.06] px-5 py-3.5 font-semibold text-red-300 transition hover:bg-red-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating
              ? "Updating..."
              : "× Reject Request"}
          </button>

        </div>

      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="mt-7 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.025] p-5">

        <p className="font-semibold text-emerald-300">
          Appointment Confirmed
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          The provider has confirmed this appointment.
          Review the patient&apos;s AI retinal screening result
          and record the clinical assessment before completing
          the consultation.
        </p>

        <div className="mt-5 grid gap-3">

          <button
            onClick={() => onReview(appointment)}
            disabled={updating}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review AI Screening →
          </button>

          <button
            onClick={() =>
              onUpdate(appointment, "Completed")
            }
            disabled={updating}
            className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] px-5 py-3.5 font-semibold text-cyan-300 transition hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating
              ? "Updating..."
              : "✓ Mark Appointment Completed"}
          </button>

        </div>

      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.025] p-5">

        <p className="font-semibold text-cyan-300">
          Appointment Completed
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          This appointment has been marked as completed.
        </p>

        <button
          onClick={() => onReview(appointment)}
          disabled={updating}
          className="mt-5 w-full rounded-xl border border-purple-400/30 bg-purple-400/[0.06] px-5 py-3.5 font-semibold text-purple-300 transition hover:bg-purple-400/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
        >
          View Clinical Review →
        </button>

      </div>
    );
  }

  if (
    status === "rejected" ||
    status === "cancelled"
  ) {
    return (
      <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/[0.025] p-5">

        <p className="font-semibold text-red-300">
          Appointment Request Rejected
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          This request was not accepted by the provider.
          The patient can submit another appointment request
          if required.
        </p>

      </div>
    );
  }

  return (
    <div className="mt-7 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.025] p-5">

      <p className="font-semibold text-yellow-300">
        Current Appointment Status
      </p>

      <p className="mt-2 text-sm text-slate-400">
        {appointment.status || "Unknown"}
      </p>

    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

function SmallDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-xs text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-slate-300">
        {value}
      </p>

    </div>
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
    <div className="rounded-2xl border border-white/10 bg-[#0b1529] p-5">

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = normalizeStatus(status);

  let classes =
    "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-300";

  if (normalized === "confirmed") {
    classes =
      "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300";
  }

  if (normalized === "completed") {
    classes =
      "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300";
  }

  if (
    normalized === "cancelled" ||
    normalized === "rejected"
  ) {
    classes =
      "border-red-400/20 bg-red-400/[0.06] text-red-300";
  }

  return (
    <div
      className={`inline-flex rounded-xl border px-3 py-2 ${classes}`}
    >
      <p className="text-xs font-semibold">
        ● {status || "Pending Confirmation"}
      </p>
    </div>
  );
}

function normalizeStatus(status: string) {
  return (status || "").trim().toLowerCase();
}

function formatDate(date: string) {
  if (!date) {
    return "Not specified";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string) {
  if (!time) {
    return "Not specified";
  }

  const [hourString, minuteString] = time.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString || "0");

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return time;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${period}`;
}