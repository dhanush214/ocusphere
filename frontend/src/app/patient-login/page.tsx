"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PatientLoginPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone) {
      setError("Please enter your name and phone number.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    localStorage.setItem(
      "ocusphere_patient",
      JSON.stringify({
        name: cleanName,
        phone: cleanPhone,
      })
    );

    router.push("/patient-dashboard");
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Back to Sign In
        </button>

        <section className="mx-auto mt-16 max-w-xl">

          {/* Header */}
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.35em] text-cyan-300">
              OCUSPHERE PATIENT ACCESS
            </p>

            <h1 className="mt-5 text-4xl font-bold md:text-5xl">
              Patient Sign In
            </h1>

            <p className="mt-5 text-slate-400">
              Enter your details to access your OcuSphere patient dashboard.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-12 rounded-3xl border border-white/10 bg-[#081120] p-8"
          >

            {/* Name */}
            <div>
              <label
                htmlFor="patient-name"
                className="text-sm font-medium text-slate-200"
              >
                Patient Name
              </label>

              <input
                id="patient-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Enter your name"
                autoComplete="name"
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Phone */}
            <div className="mt-6">
              <label
                htmlFor="patient-phone"
                className="text-sm font-medium text-slate-200"
              >
                Phone Number
              </label>

              <input
                id="patient-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => {
                  const numbersOnly = e.target.value.replace(/\D/g, "");
                  setPhone(numbersOnly);
                  setError("");
                }}
                placeholder="Enter your 10-digit phone number"
                autoComplete="tel"
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* ONLY LOGIN BUTTON */}
            <button
              type="submit"
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-4 font-bold text-white transition hover:opacity-90"
            >
              Continue to Patient Dashboard →
            </button>

            {/* Appointment */}
            <div className="mt-6 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an appointment request?
              </p>

              <button
                type="button"
                onClick={() => router.push("/track-appointment")}
                className="mt-3 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                Track Appointment →
              </button>
            </div>
          </form>

          {/* Medical notice */}
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <p className="text-sm font-semibold text-yellow-300">
              Medical Notice
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              OcuSphere provides AI-assisted screening and care-navigation
              support. Screening results should not replace diagnosis,
              examination or medical advice from a qualified healthcare
              professional.
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}