"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Patient = {
  name: string;
  phone: string;
};

type Screening = {
  id?: number;
  prediction?: string;
  predicted_class?: string;
  confidence?: number;
  severity?: string;
  grade?: number | string;
  created_at?: string;
  timestamp?: string;
};

export default function PatientDashboard() {
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [screeningError, setScreeningError] = useState("");

  useEffect(() => {
    const storedPatient = localStorage.getItem("patient");

    if (!storedPatient) {
      router.push("/patient-login");
      return;
    }

    const patientData: Patient = JSON.parse(storedPatient);

    setPatient(patientData);

    if (patientData.phone) {
      loadScreenings(patientData.phone);
    } else {
      setLoading(false);
    }
  }, [router]);

  async function loadScreenings(phone: string) {
    try {
      setLoading(true);
      setScreeningError("");

      const response = await fetch(
        `http://127.0.0.1:8000/screenings/${encodeURIComponent(phone)}`
      );

      if (!response.ok) {
        throw new Error("Unable to load screening history.");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setScreenings(data);
      } else if (Array.isArray(data.screenings)) {
        setScreenings(data.screenings);
      } else {
        setScreenings([]);
      }
    } catch (error) {
      console.error(error);
      setScreeningError(
        "Screening history could not be loaded from the OcuSphere server."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("patient");
    router.push("/patient-login");
  }

  function getPrediction(screening: Screening) {
    return (
      screening.prediction ||
      screening.predicted_class ||
      screening.severity ||
      "Screening Result"
    );
  }

  function formatConfidence(confidence?: number) {
    if (confidence === undefined || confidence === null) {
      return "Not available";
    }

    if (confidence <= 1) {
      return `${(confidence * 100).toFixed(2)}%`;
    }

    return `${confidence.toFixed(2)}%`;
  }

  function formatDate(value?: string) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#020817] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-400">
            Loading patient dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">

        <header className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.35em] text-cyan-300">
              OCUSPHERE PATIENT PORTAL
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Patient Dashboard
            </h1>

            <p className="mt-3 text-slate-400">
              Manage your retinal screening and eye-care journey.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-white/10 px-5 py-3 font-semibold transition hover:border-cyan-400/40"
            >
              Home
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-red-500/20 px-5 py-3 font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-[#06101f] p-8">
          <p className="text-sm font-semibold text-cyan-300">
            Welcome to OcuSphere
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Hello, {patient.name}
          </h2>

          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Use your dashboard to start an AI-assisted retinal screening,
            find professional eye care, review previous screening results
            or track an appointment request.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-[#0b1629] px-4 py-3">
              <p className="text-xs text-slate-500">
                Patient
              </p>

              <p className="font-semibold">
                {patient.name}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1629] px-4 py-3">
              <p className="text-xs text-slate-500">
                Phone
              </p>

              <p className="font-semibold">
                {patient.phone}
              </p>
            </div>
          </div>
        </section>
                {/* Services */}

        <section className="mt-12">
          <p className="text-xs font-bold tracking-[0.35em] text-cyan-300">
            PATIENT SERVICES
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            What would you like to do?
          </h2>

          <div className="mt-7 grid gap-5 md:grid-cols-3">

            {/* Scan */}

            <div className="rounded-3xl border border-cyan-500/20 bg-[#081426] p-7">
              <div className="text-3xl text-cyan-300">◎</div>

              <p className="mt-6 text-xs font-bold tracking-[0.25em] text-cyan-300">
                AI SCREENING
              </p>

              <h3 className="mt-3 text-xl font-bold">
                Start Eye Scan
              </h3>

              <p className="mt-3 min-h-[72px] leading-6 text-slate-400">
                Upload a retinal fundus image and run the OcuSphere
                AI-assisted diabetic retinopathy screening system.
              </p>

              <button
                onClick={() => router.push("/scan")}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-3 font-bold"
              >
                Start Eye Scan →
              </button>
            </div>

            {/* Doctors */}

            <div className="rounded-3xl border border-emerald-500/20 bg-[#081426] p-7">
              <div className="text-3xl text-emerald-300">+</div>

              <p className="mt-6 text-xs font-bold tracking-[0.25em] text-emerald-300">
                CARE NETWORK
              </p>

              <h3 className="mt-3 text-xl font-bold">
                Find Eye Care
              </h3>

              <p className="mt-3 min-h-[72px] leading-6 text-slate-400">
                Browse OcuSphere eye-care providers and continue
                directly to appointment booking.
              </p>

              <button
                onClick={() => router.push("/doctors")}
                className="mt-6 w-full rounded-xl border border-emerald-400/30 px-5 py-3 font-bold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Find Eye Care →
              </button>
            </div>

            {/* Appointment */}

            <div className="rounded-3xl border border-purple-500/20 bg-[#081426] p-7">
              <div className="text-3xl text-purple-300">✓</div>

              <p className="mt-6 text-xs font-bold tracking-[0.25em] text-purple-300">
                APPOINTMENT
              </p>

              <h3 className="mt-3 text-xl font-bold">
                Track Appointment
              </h3>

              <p className="mt-3 min-h-[72px] leading-6 text-slate-400">
                Enter your OcuSphere Request ID to check the current
                status of an appointment request.
              </p>

              <button
                onClick={() => router.push("/track-appointment")}
                className="mt-6 w-full rounded-xl border border-purple-400/30 px-5 py-3 font-bold text-purple-300 transition hover:bg-purple-400/10"
              >
                Track Appointment →
              </button>
            </div>

          </div>
        </section>

        {/* Screening History */}

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.35em] text-cyan-300">
                AI SCREENING HISTORY
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Previous Screening Results
              </h2>

              <p className="mt-2 text-slate-400">
                Screening records associated with your patient phone number.
              </p>
            </div>

            <button
              onClick={() => loadScreenings(patient.phone)}
              className="rounded-xl border border-cyan-500/30 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/10"
            >
              ↻ Refresh History
            </button>
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#081120] p-7">
              <p className="text-slate-400">
                Loading screening history...
              </p>
            </div>
          )}

          {!loading && screeningError && (
            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
              <p className="font-semibold text-yellow-300">
                Screening history unavailable
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {screeningError}
              </p>
            </div>
          )}

          {!loading &&
            !screeningError &&
            screenings.length === 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#081120] p-8 text-center">
                <div className="text-4xl text-cyan-300">◎</div>

                <h3 className="mt-4 text-lg font-bold">
                  No screening history yet
                </h3>

                <p className="mt-2 text-slate-400">
                  Complete your first retinal AI screening to create a
                  screening record.
                </p>

                <button
                  onClick={() => router.push("/scan")}
                  className="mt-6 rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-6 py-3 font-bold"
                >
                  Start First Screening →
                </button>
              </div>
            )}
                      {!loading && screenings.length > 0 && (
            <div className="mt-6 space-y-4">
              {screenings.map((screening, index) => (
                <article
                  key={screening.id ?? index}
                  className="rounded-2xl border border-cyan-500/20 bg-[#081426] p-6"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

                    <div>
                      <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
                        SCREENING #{screenings.length - index}
                      </p>

                      <h3 className="mt-3 text-xl font-bold text-emerald-300">
                        {getPrediction(screening)}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(
                          screening.created_at || screening.timestamp
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <div className="rounded-xl border border-white/10 bg-[#0c172b] px-5 py-3">
                        <p className="text-xs text-slate-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-bold">
                          {formatConfidence(screening.confidence)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#0c172b] px-5 py-3">
                        <p className="text-xs text-slate-500">
                          DR Grade
                        </p>

                        <p className="mt-1 font-bold">
                          {screening.grade !== undefined
                            ? `Grade ${screening.grade}`
                            : "Available in result"}
                        </p>
                      </div>

                    </div>

                  </div>
                </article>
              ))}
            </div>
          )}

        </section>

        {/* Journey */}

        <section className="mt-12 rounded-3xl border border-white/10 bg-[#081120] p-7">

          <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">
            YOUR OCUSPHERE JOURNEY
          </p>

          <h2 className="mt-3 text-xl font-bold">
            Screening to Professional Care
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-4">

            {[
              ["01", "Upload", "Upload a retinal fundus image."],
              [
                "02",
                "AI Screening",
                "OcuSphere analyses the retinal image.",
              ],
              [
                "03",
                "Eye Care",
                "Find a suitable registered provider.",
              ],
              [
                "04",
                "Appointment",
                "Request and track professional care.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-2xl border border-white/10 bg-[#0b1629] p-5"
              >
                <p className="text-sm font-bold text-cyan-300">
                  {number}
                </p>

                <h3 className="mt-4 font-bold">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {description}
                </p>
              </div>
            ))}

          </div>

        </section>
                {/* Medical Notice */}

        <section className="mt-8 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
          <p className="font-semibold text-yellow-300">
            Important Medical Notice
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            OcuSphere provides AI-assisted retinal screening and
            care-navigation support. AI screening results should not be
            treated as a definitive medical diagnosis and should not replace
            examination or medical advice from a qualified eye-care
            professional.
          </p>
        </section>

      </div>
    </main>
  );
}