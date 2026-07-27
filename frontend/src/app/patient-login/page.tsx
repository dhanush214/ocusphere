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

    setError("");

    if (!name.trim() || !phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }

    // Save patient locally
    localStorage.setItem(
      "patient",
      JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
      })
    );

    router.push("/patient-dashboard");
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">

        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-slate-400 hover:text-cyan-300 transition"
        >
          ← Back to Home
        </button>

        <section className="mx-auto mt-16 max-w-xl">

          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.35em] text-cyan-300">
              OCUSPHERE PATIENT ACCESS
            </p>

            <h1 className="mt-5 text-4xl font-bold md:text-5xl">
              Patient Login
            </h1>

            <p className="mt-5 text-slate-400">
              Enter your name and phone number to continue.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-12 rounded-3xl border border-white/10 bg-[#081120] p-8"
          >
            {/* Name */}

            <div>
              <label className="text-sm font-medium text-slate-200">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>
                        {/* Phone */}

            <div className="mt-6">
              <label className="text-sm font-medium text-slate-200">
                Phone Number
              </label>

              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError("");
                }}
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0c172b] px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 px-5 py-4 font-bold text-white transition hover:opacity-90"
            >
              Sign In
            </button>

            <div className="mt-6 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-400">
                No account is required.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Your details will be stored locally on this device.
              </p>
            </div>
          </form>
                    <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
            <p className="text-sm font-semibold text-yellow-300">
              Medical Notice
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              OcuSphere provides AI-assisted eye screening and should not
              replace diagnosis or medical advice from a qualified healthcare
              professional.
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}