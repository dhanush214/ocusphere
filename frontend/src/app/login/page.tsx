"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#020817] px-6 py-10 text-white">

      <div className="mx-auto max-w-5xl">

        {/* BACK TO HOME */}

        <button
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Back to Home
        </button>

        {/* HEADER */}

        <section className="mt-16 text-center">

          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            OcuSphere Care Network
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Sign In to OcuSphere
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Choose how you want to access the OcuSphere
            healthcare platform.
          </p>

        </section>

        {/* LOGIN OPTIONS */}

        <section className="mt-14 grid gap-6 md:grid-cols-2">

          {/* PATIENT */}

          <article className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.025] p-8">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl text-cyan-300">
              ◎
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              Patient Access
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Patient
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Access your retinal screening journey,
              appointment requests and appointment
              tracking through OcuSphere.
            </p>

            <button
              onClick={() => router.push("/patient-login")}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold transition hover:opacity-90"
            >
              Patient Sign In →
            </button>

          </article>

          {/* PROVIDER */}

          <article className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.025] p-8">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-2xl text-emerald-300">
              +
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
              Healthcare Network
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Healthcare Provider
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Access patient appointment requests,
              confirm consultations and manage
              appointments securely.
            </p>

            <button
              onClick={() => router.push("/provider-login")}
              className="mt-8 w-full rounded-xl border border-emerald-400/40 px-6 py-4 font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
            >
              Provider Sign In →
            </button>

          </article>

        </section>

        {/* QUICK ACCESS */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

          <p className="text-center text-sm text-slate-400">
            Just want to check an appointment?
          </p>

          <button
            onClick={() => router.push("/track-appointment")}
            className="mx-auto mt-4 block font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            Track Appointment →
          </button>

        </section>

        {/* MEDICAL NOTICE */}

        <section className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.025] p-5">

          <p className="font-semibold text-yellow-300">
            Medical Notice
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            OcuSphere provides AI-assisted retinal
            screening and care-navigation support.
            Screening results should not replace
            professional medical diagnosis or treatment.
          </p>

        </section>

      </div>

    </main>
  );
}