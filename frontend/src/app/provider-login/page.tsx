"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

type Provider = {
  provider_id: string;
  provider_name: string;
  email?: string | null;
};

type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  token_type: string;
  expires_at: string;
  provider: Provider;
};

export default function ProviderLoginPage() {
  const router = useRouter();

  const [providerId, setProviderId] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState("");

  // =========================================================
  // CHECK WHETHER PROVIDER IS ALREADY LOGGED IN
  // =========================================================

  useEffect(() => {
    async function checkExistingSession() {
      const token = localStorage.getItem(
        "ocusphere_provider_token"
      );

      if (!token) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/provider/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          localStorage.removeItem(
            "ocusphere_provider_token"
          );

          localStorage.removeItem(
            "ocusphere_provider"
          );

          localStorage.removeItem(
            "ocusphere_provider_expires_at"
          );

          setCheckingSession(false);
          return;
        }

        router.replace("/provider-dashboard");
      } catch (error) {
        console.error(
          "Provider session check failed:",
          error
        );

        setCheckingSession(false);
      }
    }

    checkExistingSession();
  }, [router]);

  // =========================================================
  // PROVIDER LOGIN
  // =========================================================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanedProviderId =
      providerId.trim();

    if (!cleanedProviderId) {
      setError(
        "Please enter your Provider ID."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/provider/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            provider_id:
              cleanedProviderId,

            password:
              password,
          }),
        }
      );

      let data:
        | LoginResponse
        | {
            detail?: string;
          };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The OcuSphere server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          "detail" in data &&
            data.detail
            ? data.detail
            : "Unable to sign in."
        );
      }

      const loginData =
        data as LoginResponse;

      if (!loginData.token) {
        throw new Error(
          "Authentication token was not received."
        );
      }

      // =====================================================
      // STORE PROVIDER SESSION
      // =====================================================

      localStorage.setItem(
        "ocusphere_provider_token",
        loginData.token
      );

      localStorage.setItem(
        "ocusphere_provider",
        JSON.stringify(
          loginData.provider
        )
      );

      localStorage.setItem(
        "ocusphere_provider_expires_at",
        loginData.expires_at
      );

      // =====================================================
      // REDIRECT TO PROVIDER DASHBOARD
      // =====================================================

      router.replace(
        "/provider-dashboard"
      );
    } catch (error) {
      console.error(
        "Provider login failed:",
        error
      );

      if (error instanceof TypeError) {
        setError(
          "Could not connect to the OcuSphere backend. Make sure the backend server is running on port 8000."
        );
      } else if (
        error instanceof Error
      ) {
        setError(error.message);
      } else {
        setError(
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // SESSION CHECK SCREEN
  // =========================================================

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

          <p className="mt-5 text-sm text-slate-400">
            Checking provider session...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // LOGIN PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">

        {/* ===================================================
            TOP NAVIGATION
        =================================================== */}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Return to OcuSphere
          </button>

          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-2 text-xs font-semibold tracking-wider text-cyan-300">
            PROVIDER PORTAL
          </div>
        </div>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/20 lg:grid-cols-2">

            {/* =================================================
                LEFT INFORMATION PANEL
            ================================================= */}

            <section className="relative overflow-hidden border-b border-white/10 p-8 md:p-12 lg:border-b-0 lg:border-r">

              <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

              <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

              <div className="relative">

                <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">
                  OCUSPHERE CARE NETWORK
                </p>

                <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl">
                  Provider
                  <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    Workspace
                  </span>
                </h1>

                <p className="mt-6 max-w-md leading-7 text-slate-400">
                  Securely access patient appointment
                  requests and manage the consultation
                  journey through OcuSphere.
                </p>

                <div className="mt-10 space-y-4">

                  <FeatureCard
                    number="01"
                    title="Review Requests"
                    description="View appointment requests submitted through the OcuSphere care network."
                  />

                  <FeatureCard
                    number="02"
                    title="Manage Status"
                    description="Confirm, reject and complete patient appointment requests."
                  />

                  <FeatureCard
                    number="03"
                    title="Secure Access"
                    description="Provider actions require an authenticated OcuSphere session."
                  />

                </div>

                <div className="mt-10 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.025] p-5">

                  <p className="text-xs font-bold tracking-[0.2em] text-yellow-300">
                    AUTHORISED ACCESS
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    This portal is intended for
                    authorised eye-care providers.
                    Provider activity may be associated
                    with the authenticated account.
                  </p>

                </div>

              </div>

            </section>

            {/* =================================================
                LOGIN PANEL
            ================================================= */}

            <section className="flex items-center p-8 md:p-12">

              <div className="w-full">

                <div className="mb-8">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-400/10 text-2xl">
                    ◉
                  </div>

                  <h2 className="mt-6 text-3xl font-bold">
                    Provider Sign In
                  </h2>

                  <p className="mt-3 leading-6 text-slate-400">
                    Enter your OcuSphere provider
                    credentials to continue to the
                    appointment dashboard.
                  </p>

                </div>

                <form
                  onSubmit={handleLogin}
                  className="space-y-5"
                >

                  {/* PROVIDER ID */}

                  <label className="block">

                    <span className="text-sm font-semibold text-slate-300">
                      Provider ID
                    </span>

                    <input
                      type="text"
                      value={providerId}
                      onChange={(event) => {
                        setProviderId(
                          event.target.value
                        );

                        if (error) {
                          setError("");
                        }
                      }}
                      autoComplete="username"
                      placeholder="Enter your Provider ID"
                      disabled={loading}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-[#081225] px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </label>

                  {/* PASSWORD */}

                  <label className="block">

                    <span className="text-sm font-semibold text-slate-300">
                      Password
                    </span>

                    <div className="relative mt-3">

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(event) => {
                          setPassword(
                            event.target.value
                          );

                          if (error) {
                            setError("");
                          }
                        }}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        disabled={loading}
                        className="w-full rounded-xl border border-white/10 bg-[#081225] px-5 py-4 pr-24 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
                              !current
                          )
                        }
                        disabled={loading}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                      >
                        {showPassword
                          ? "HIDE"
                          : "SHOW"}
                      </button>

                    </div>

                  </label>

                  {/* ERROR */}

                  {error && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] px-5 py-4">

                      <p className="text-sm font-semibold text-red-300">
                        Sign in unsuccessful
                      </p>

                      <p className="mt-1 text-sm leading-6 text-red-200/70">
                        {error}
                      </p>

                    </div>
                  )}

                  {/* LOGIN BUTTON */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Authenticating..."
                      : "Sign In to Provider Portal →"}
                  </button>

                </form>

                {/* SECURITY MESSAGE */}

                <div className="mt-7 border-t border-white/10 pt-6">

                  <div className="flex gap-3">

                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] text-sm text-emerald-300">
                      ✓
                    </div>

                    <div>

                      <p className="text-sm font-semibold text-slate-300">
                        Secure provider session
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Successful authentication
                        creates a temporary provider
                        session used to authorise
                        protected dashboard actions.
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </section>

          </div>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="pb-4 text-center text-xs text-slate-600">
          OcuSphere Provider Portal • AI-assisted
          retinal screening and care coordination
        </div>

      </div>
    </main>
  );
}

// ===========================================================
// FEATURE CARD
// ===========================================================

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-[#081225]/70 p-5">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] text-xs font-bold text-cyan-300">
        {number}
      </div>

      <div>

        <p className="font-semibold text-slate-200">
          {title}
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>

      </div>

    </div>
  );
}