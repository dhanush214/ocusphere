"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AppointmentForm = {
  patientName: string;
  phone: string;
  email: string;
  provider: string;
  appointmentDate: string;
  appointmentTime: string;
  visitReason: string;
  notes: string;
};

type BackendAppointment = {
  request_id?: string;
  patient_name?: string;
  phone?: string;
  email?: string | null;
  provider?: string;
  preferred_date?: string;
  preferred_time?: string;
  reason?: string;
  notes?: string | null;
  status?: string;
  created_at?: string;
};

type BackendResponse = {
  message?: string;
  request_id?: string;
  status?: string;
  appointment?: BackendAppointment;
};

export default function AppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<AppointmentForm>({
    patientName: "",
    phone: "",
    email: "",
    provider: "",
    appointmentDate: "",
    appointmentTime: "",
    visitReason: "General Eye Consultation",
    notes: "",
  });

  const [screeningResult, setScreeningResult] =
    useState<string | null>(null);

  const [screeningGrade, setScreeningGrade] =
    useState<string | null>(null);

  const [screeningConfidence, setScreeningConfidence] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const providerFromUrl = searchParams.get("provider");
    const resultFromUrl = searchParams.get("result");
    const gradeFromUrl = searchParams.get("grade");
    const confidenceFromUrl = searchParams.get("confidence");

    if (providerFromUrl) {
      setForm((previous) => ({
        ...previous,
        provider: providerFromUrl,
      }));
    }

    if (resultFromUrl) {
      setScreeningResult(resultFromUrl);
    }

    if (gradeFromUrl) {
      setScreeningGrade(gradeFromUrl);
    }

    if (confidenceFromUrl) {
      const parsedConfidence = Number(confidenceFromUrl);

      if (!Number.isNaN(parsedConfidence)) {
        setScreeningConfidence(parsedConfidence);
      }
    }
  }, [searchParams]);

  function updateField(
    field: keyof AppointmentForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!form.patientName.trim()) {
      setError("Please enter the patient name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter a contact number.");
      return;
    }

    if (!form.provider.trim()) {
      setError(
        "Please enter the hospital or eye-care provider."
      );
      return;
    }

    if (!form.appointmentDate) {
      setError(
        "Please select a preferred appointment date."
      );
      return;
    }

    if (!form.appointmentTime) {
      setError(
        "Please select a preferred appointment time."
      );
      return;
    }

    setSubmitting(true);

    try {
      /*
        IMPORTANT

        We DO NOT generate the appointment Request ID
        in the frontend anymore.

        FastAPI creates the real request_id and stores
        that same ID inside SQLite.
      */

      const payload = {
        patient_name: form.patientName.trim(),

        phone: form.phone.trim(),

        email: form.email.trim() || null,

        provider: form.provider.trim(),

        preferred_date: form.appointmentDate,

        preferred_time: form.appointmentTime,

        /*
          Backend expects "reason".
          Do NOT change this back to "visit_reason".
        */
        reason: form.visitReason,

        notes: form.notes.trim() || null,

        screening_result: screeningResult,

        screening_grade: screeningGrade,

        screening_confidence: screeningConfidence,
      };

      console.log(
        "Sending appointment to backend:",
        payload
      );

      const response = await fetch(
        "http://127.0.0.1:8000/appointments",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      let backendData: BackendResponse | null = null;

      try {
        backendData = await response.json();
      } catch {
        backendData = null;
      }

      console.log(
        "Appointment backend response:",
        backendData
      );

      if (!response.ok) {
        let message =
          "Unable to submit appointment request.";

        const possibleError = backendData as any;

        if (possibleError?.detail) {
          if (
            typeof possibleError.detail === "string"
          ) {
            message = possibleError.detail;
          } else {
            message = JSON.stringify(
              possibleError.detail
            );
          }
        }

        throw new Error(message);
      }

      /*
        Get the REAL request ID generated by FastAPI.

        We support both possible response structures:

        {
          "request_id": "OCU-..."
        }

        OR

        {
          "appointment": {
            "request_id": "OCU-..."
          }
        }
      */

      const realRequestId =
        backendData?.appointment?.request_id ||
        backendData?.request_id;

      if (!realRequestId) {
        console.error(
          "Backend response did not contain request_id:",
          backendData
        );

        throw new Error(
          "The appointment was submitted, but the backend did not return a Request ID."
        );
      }

      /*
        Use backend values when available.

        This keeps the success page consistent
        with what is actually stored in SQLite.
      */

      const backendAppointment =
        backendData?.appointment;

      const appointmentData = {
        id: realRequestId,

        patientName:
          backendAppointment?.patient_name ||
          form.patientName.trim(),

        phone:
          backendAppointment?.phone ||
          form.phone.trim(),

        email:
          backendAppointment?.email ||
          form.email.trim(),

        provider:
          backendAppointment?.provider ||
          form.provider.trim(),

        appointmentDate:
          backendAppointment?.preferred_date ||
          form.appointmentDate,

        appointmentTime:
          backendAppointment?.preferred_time ||
          form.appointmentTime,

        visitReason:
          backendAppointment?.reason ||
          form.visitReason,

        notes:
          backendAppointment?.notes ||
          form.notes.trim(),

        screeningResult,

        screeningGrade,

        screeningConfidence,

        status:
          backendAppointment?.status ||
          backendData?.status ||
          "Pending Confirmation",

        createdAt:
          backendAppointment?.created_at ||
          new Date().toISOString(),
      };

      /*
        Store the SAME backend appointment ID
        for the success page.
      */

      sessionStorage.setItem(
        "ocusphereAppointment",
        JSON.stringify(appointmentData)
      );

      console.log(
        "Real backend Request ID:",
        realRequestId
      );

      /*
        The URL now also uses the SAME ID
        generated by FastAPI.
      */

      router.push(
        `/appointment-success?id=${encodeURIComponent(
          realRequestId
        )}`
      );
    } catch (err) {
      console.error(
        "Appointment submission failed:",
        err
      );

      if (err instanceof TypeError) {
        setError(
          "Could not connect to the OcuSphere backend. Make sure the FastAPI server is running on port 8000."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to submit appointment request. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">

        {/* BACK */}

        <Link
          href="/doctors"
          className="text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Back to Eye Care
        </Link>

        {/* HEADER */}

        <section className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            OcuSphere Care Network
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Request an Eye-Care Appointment
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Enter your preferred consultation details.
            OcuSphere will create an appointment request
            that can later be connected to participating
            hospitals and ophthalmologists.
          </p>
        </section>

        {/* PAGE GRID */}

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">

          {/* APPOINTMENT FORM */}

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 md:p-9"
          >
            <h2 className="text-2xl font-semibold">
              Appointment Details
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Fields marked with * are required.
            </p>

            {/* ERROR */}

            {error && (
              <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* FORM FIELDS */}

            <div className="mt-8 grid gap-6 md:grid-cols-2">

              {/* PATIENT NAME */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Patient Name *
                </span>

                <input
                  type="text"
                  value={form.patientName}
                  onChange={(event) =>
                    updateField(
                      "patientName",
                      event.target.value
                    )
                  }
                  placeholder="Enter patient name"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                />
              </label>

              {/* PHONE */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Phone Number *
                </span>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value
                    )
                  }
                  placeholder="Enter contact number"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                />
              </label>

              {/* EMAIL */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Email
                </span>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                  placeholder="Enter email address"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                />
              </label>

              {/* PROVIDER */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Hospital / Eye-Care Provider *
                </span>

                <input
                  type="text"
                  value={form.provider}
                  onChange={(event) =>
                    updateField(
                      "provider",
                      event.target.value
                    )
                  }
                  placeholder="Example: Eye Hospital"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                />
              </label>

              {/* DATE */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Preferred Date *
                </span>

                <input
                  type="date"
                  value={form.appointmentDate}
                  onChange={(event) =>
                    updateField(
                      "appointmentDate",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition focus:border-cyan-400/50"
                />
              </label>

              {/* TIME */}

              <label className="block">
                <span className="text-sm text-slate-300">
                  Preferred Time *
                </span>

                <input
                  type="time"
                  value={form.appointmentTime}
                  onChange={(event) =>
                    updateField(
                      "appointmentTime",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition focus:border-cyan-400/50"
                />
              </label>

            </div>

            {/* REASON */}

            <label className="mt-6 block">
              <span className="text-sm text-slate-300">
                Reason for Visit
              </span>

              <select
                value={form.visitReason}
                onChange={(event) =>
                  updateField(
                    "visitReason",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none focus:border-cyan-400/50"
              >
                <option value="General Eye Consultation">
                  General Eye Consultation
                </option>

                <option value="Diabetic Retinopathy Evaluation">
                  Diabetic Retinopathy Evaluation
                </option>

                <option value="Retina Consultation">
                  Retina Consultation
                </option>

                <option value="Follow-up Consultation">
                  Follow-up Consultation
                </option>

                <option value="Vision Problem">
                  Vision Problem
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </label>

            {/* NOTES */}

            <label className="mt-6 block">
              <span className="text-sm text-slate-300">
                Additional Notes
              </span>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value
                  )
                }
                rows={6}
                placeholder="Describe symptoms, concerns or any information you want the eye-care provider to know."
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#0b1529] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              />
            </label>

            {/* SCREENING CONNECTION */}

            {(screeningResult ||
              screeningGrade ||
              screeningConfidence !== null) && (
              <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-5">

                <p className="text-sm font-semibold text-cyan-300">
                  AI Screening Information
                </p>

                {screeningResult && (
                  <p className="mt-3 text-sm text-slate-400">
                    Screening Result:{" "}
                    <span className="text-white">
                      {screeningResult}
                    </span>
                  </p>
                )}

                {screeningGrade && (
                  <p className="mt-2 text-sm text-slate-400">
                    Grade:{" "}
                    <span className="text-white">
                      {screeningGrade}
                    </span>
                  </p>
                )}

                {screeningConfidence !== null && (
                  <p className="mt-2 text-sm text-slate-400">
                    Confidence:{" "}
                    <span className="text-white">
                      {screeningConfidence}%
                    </span>
                  </p>
                )}

              </div>
            )}

            {/* NOTICE */}

            <div className="mt-8 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.025] p-5">

              <p className="text-sm font-semibold text-yellow-300">
                Appointment Request Notice
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Submitting this form creates an OcuSphere
                appointment request. The selected
                healthcare provider must confirm the
                actual appointment date and time.
              </p>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting Appointment Request..."
                : "Submit Appointment Request →"}
            </button>

          </form>

          {/* RIGHT SIDE */}

          <aside className="space-y-6">

            {/* CARE JOURNEY */}

            <section className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.025] p-7">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                ◎
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Your Care Journey
              </h2>

              <div className="mt-7 space-y-7">

                <JourneyStep
                  number="1"
                  title="AI Screening"
                  text="OcuSphere analyses the retinal image for signs associated with diabetic retinopathy."
                />

                <JourneyStep
                  number="2"
                  title="Find Eye Care"
                  text="Search for ophthalmologists, retina specialists and eye hospitals."
                />

                <JourneyStep
                  number="3"
                  title="Request Appointment"
                  text="Choose your preferred provider, date and consultation time."
                />

                <JourneyStep
                  number="4"
                  title="Provider Confirmation"
                  text="Confirm the final appointment directly with the selected healthcare provider."
                />

              </div>

            </section>

            {/* FIND PROVIDER */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">

              <h3 className="text-lg font-semibold">
                Need to find a provider?
              </h3>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Search nearby ophthalmologists, retina
                specialists and eye hospitals before
                submitting your appointment request.
              </p>

              <Link
                href="/doctors"
                className="mt-6 flex w-full items-center justify-center rounded-xl border border-cyan-400/30 px-5 py-4 font-semibold text-cyan-300 transition hover:bg-cyan-400/5"
              >
                Find Eye Care →
              </Link>

            </section>

            {/* MEDICAL NOTICE */}

            <section className="rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.02] p-7">

              <p className="font-semibold text-yellow-300">
                Medical Notice
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                OcuSphere is intended to support screening
                and care navigation. AI screening results
                should not replace diagnosis or medical
                advice from a qualified healthcare
                professional.
              </p>

            </section>

          </aside>

        </div>

      </div>
    </main>
  );
}

function JourneyStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-semibold text-cyan-300">
        {number}
      </div>

      <div>

        <p className="font-semibold text-white">
          {title}
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          {text}
        </p>

      </div>

    </div>
  );
}