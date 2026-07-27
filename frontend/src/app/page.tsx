"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen bg-[#020817] text-white">

      {/* ================= NAVBAR ================= */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          {/* LOGO */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            <div className="text-left">
              <p className="text-lg font-bold">
                OcuSphere
              </p>
              <p className="text-xs text-slate-400">
                AI Eye Healthcare
              </p>
            </div>
          </button>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-8 md:flex">

            <button
              onClick={() => window.scrollTo({
                top: 0,
                behavior: "smooth",
              })}
              className="text-cyan-300 transition hover:text-cyan-200"
            >
              Home
            </button>

            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-slate-300 transition hover:text-white"
            >
              How It Works
            </button>

            <button
              onClick={() => scrollToSection("features")}
              className="text-slate-300 transition hover:text-white"
            >
              Features
            </button>

            <button
              onClick={() => scrollToSection("about")}
              className="text-slate-300 transition hover:text-white"
            >
              About
            </button>

            {/* IMPORTANT: SIGN IN */}
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl border border-cyan-400/60 px-6 py-3 font-semibold transition hover:bg-cyan-400/10"
            >
              Sign In
            </button>

          </nav>
        </div>
      </header>


      {/* ================= HERO ================= */}
      <section className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2">

        {/* LEFT SIDE */}
        <div>

          <div className="inline-flex rounded-full border border-purple-400/40 bg-purple-500/10 px-5 py-2 text-sm text-purple-200">
            ✦ AI-POWERED EYE HEALTH SCREENING
          </div>

          <h1 className="mt-10 text-6xl font-bold leading-[1.15] lg:text-7xl">
            Smarter Vision.
            <br />

            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Better
              <br />
              Tomorrow.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-400">
            OcuSphere uses artificial intelligence to analyse retinal images
            and screen for signs associated with diabetic retinopathy,
            helping support timely professional eye care.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <button
              onClick={() => router.push("/scan")}
              className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-8 py-4 font-bold transition hover:scale-[1.02]"
            >
              Start Eye Scan →
            </button>

            <button
              onClick={() => scrollToSection("how-it-works")}
              className="rounded-xl border border-slate-600 px-8 py-4 font-bold transition hover:border-cyan-400"
            >
              ▶ How It Works
            </button>

          </div>

          <div className="mt-8 flex flex-wrap gap-8 text-sm text-slate-400">
            <span>♡ Secure & Private</span>
            <span>⚡ Fast Results</span>
            <span>✦ AI-Powered</span>
          </div>

        </div>


        {/* RIGHT SIDE EYE GRAPHIC */}
        <div className="flex justify-center">

          <div className="relative flex h-[430px] w-[430px] items-center justify-center rounded-full border border-purple-500/30">

            <div className="absolute h-[360px] w-[360px] rounded-full border border-blue-500/30" />

            <div className="absolute h-[290px] w-[290px] rounded-full border border-cyan-500/30" />

            <div className="relative flex h-[190px] w-[190px] items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-purple-600">

              <div className="flex h-[115px] w-[115px] items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500">

                <div className="relative h-[72px] w-[72px] rounded-full bg-[#020817]">

                  <div className="absolute left-2 top-2 h-5 w-5 rounded-full bg-white" />

                </div>

              </div>

            </div>

            <div className="absolute bottom-10 right-0 rounded-xl border border-slate-700 bg-[#081426] px-6 py-4 shadow-xl">

              <p className="text-xs text-slate-400">
                AI ANALYSIS
              </p>

              <p className="mt-2 font-bold text-emerald-400">
                ● System Ready
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================= FEATURE STRIP ================= */}
      <section
        id="features"
        className="border-y border-white/10 bg-[#050b19]"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">

          <Feature
            title="AI"
            text="Powered Screening"
          />

          <Feature
            title="24/7"
            text="Platform Access"
          />

          <Feature
            title="Secure"
            text="Health Data"
          />

          <Feature
            title="Fast"
            text="AI Analysis"
            last
          />

        </div>
      </section>


      {/* ================= HOW IT WORKS ================= */}
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-6 py-24"
      >

        <div className="text-center">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
            Simple Screening Process
          </p>

          <h2 className="mt-4 text-4xl font-bold">
            How OcuSphere Works
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Upload a retinal image and allow the AI screening pipeline
            to process it.
          </p>

        </div>


        <div className="mt-14 grid gap-6 md:grid-cols-3">

          <StepCard
            number="01"
            title="Upload Image"
            description="Upload a supported retinal fundus image to the OcuSphere platform."
          />

          <StepCard
            number="02"
            title="AI Analysis"
            description="The trained AI model processes the retinal image and generates screening probabilities."
          />

          <StepCard
            number="03"
            title="View Result"
            description="Review the screening result, confidence score and appropriate next-step guidance."
          />

        </div>


        <div className="mt-12 text-center">

          <button
            onClick={() => router.push("/scan")}
            className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-9 py-4 font-bold transition hover:scale-[1.02]"
          >
            Start Screening →
          </button>

        </div>

      </section>


      {/* ================= CARE NETWORK ================= */}
      <section className="border-y border-white/10 bg-[#050b19]">

        <div className="mx-auto max-w-7xl px-6 py-24">

          <div className="text-center">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
              OcuSphere Care Network
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              From Screening to Eye Care
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-400">
              OcuSphere helps connect AI-assisted screening with
              professional eye care, appointment requests and
              appointment tracking.
            </p>

          </div>


          <div className="mt-12 grid gap-6 md:grid-cols-3">

            {/* FIND DOCTOR */}
            <div className="rounded-2xl border border-cyan-400/20 bg-[#07101f] p-7">

              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                Eye Care
              </p>

              <h3 className="mt-4 text-2xl font-bold">
                Find Eye Care
              </h3>

              <p className="mt-4 leading-7 text-slate-400">
                Search for ophthalmologists, retina specialists
                and eye-care facilities.
              </p>

              <button
                onClick={() => router.push("/doctors")}
                className="mt-7 w-full rounded-xl border border-cyan-400/40 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Find Eye Care →
              </button>

            </div>


            {/* TRACK */}
            <div className="rounded-2xl border border-purple-400/20 bg-[#07101f] p-7">

              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                Patient
              </p>

              <h3 className="mt-4 text-2xl font-bold">
                Track Appointment
              </h3>

              <p className="mt-4 leading-7 text-slate-400">
                Enter your OcuSphere Request ID to view the latest
                appointment status.
              </p>

              <button
                onClick={() => router.push("/track-appointment")}
                className="mt-7 w-full rounded-xl border border-purple-400/40 px-5 py-3 font-semibold text-purple-300 transition hover:bg-purple-400/10"
              >
                Track Appointment →
              </button>

            </div>


            {/* LOGIN */}
            <div className="rounded-2xl border border-emerald-400/20 bg-[#07101f] p-7">

              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Account Access
              </p>

              <h3 className="mt-4 text-2xl font-bold">
                OcuSphere Sign In
              </h3>

              <p className="mt-4 leading-7 text-slate-400">
                Patients and registered healthcare providers can
                access their respective OcuSphere services.
              </p>

              <button
                onClick={() => router.push("/login")}
                className="mt-7 w-full rounded-xl border border-emerald-400/40 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
              >
                Sign In →
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* ================= ABOUT ================= */}
      <section
        id="about"
        className="mx-auto max-w-5xl px-6 py-24 text-center"
      >

        <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
          About OcuSphere
        </p>

        <h2 className="mt-4 text-4xl font-bold">
          AI-Assisted Retinal Screening
        </h2>

        <p className="mx-auto mt-6 max-w-3xl leading-8 text-slate-400">
          OcuSphere is being developed as an AI-assisted eye screening
          and care-navigation platform. It combines a web interface,
          backend processing and a trained deep-learning model to
          analyse retinal images.
        </p>

        <p className="mx-auto mt-5 max-w-3xl text-sm leading-6 text-slate-500">
          Screening results are intended for screening and research
          support and should not replace examination, diagnosis,
          treatment decisions or medical advice from a qualified
          eye-care professional.
        </p>

      </section>


      {/* ================= MEDICAL NOTICE ================= */}
      <section className="mx-auto max-w-5xl px-6 pb-20">

        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.025] p-6">

          <p className="font-semibold text-yellow-300">
            Important Medical Notice
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            OcuSphere provides AI-assisted retinal screening and
            care-navigation support. AI-generated screening results
            should not be treated as a definitive medical diagnosis.
            Patients should consult a qualified healthcare professional
            for medical evaluation and treatment decisions.
          </p>

        </div>

      </section>


      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        OcuSphere • AI Eye Healthcare
      </footer>

    </main>
  );
}


/* =====================================================
   FEATURE COMPONENT
===================================================== */

function Feature({
  title,
  text,
  last = false,
}: {
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-8 text-center ${
        last ? "" : "border-r border-white/10"
      }`}
    >
      <h3 className="text-xl font-bold text-blue-300">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        {text}
      </p>
    </div>
  );
}


/* =====================================================
   STEP COMPONENT
===================================================== */

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
    <article className="rounded-2xl border border-white/10 bg-[#080f1f] p-8">

      <span className="text-sm font-bold text-cyan-300">
        {number}
      </span>

      <h3 className="mt-5 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {description}
      </p>

    </article>
  );
}