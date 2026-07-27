"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Probability = {
  grade: number;
  name: string;
  probability: number;
};

type ScanResult = {
  success: boolean;
  grade: number;
  prediction: string;
  severity: string;
  confidence: number;
  probabilities?: Probability[];
  recommendation?: string;
  model?: string;
  disclaimer?: string;
};

export default function ResultPage() {
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const [scanType, setScanType] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState("");

  useEffect(() => {
    // Read the real AI result saved by the scan page
    const storedResult = sessionStorage.getItem("ocusphereResult");
    const storedScanType = sessionStorage.getItem("scanType");
    const storedImageName = sessionStorage.getItem("imageName");
    const storedImageSize = sessionStorage.getItem("imageSize");

    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult));
      } catch (error) {
        console.error("Could not read AI result:", error);
      }
    }

    if (storedScanType) {
      setScanType(storedScanType);
    }

    if (storedImageName) {
      setImageName(storedImageName);
    }

    if (storedImageSize) {
      setImageSize(storedImageSize);
    }

    // Small result-page loading animation
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setFinished(true);
          return 100;
        }

        return old + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // ANALYSING SCREEN
  // ============================================================

  if (!finished) {
    return (
      <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center">

          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5">
            <div className="h-12 w-12 animate-pulse rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
          </div>

          <p className="mb-3 text-sm font-semibold tracking-widest text-cyan-400">
            OCUSPHERE AI
          </p>

          <h1 className="text-4xl font-bold">
            Analysing your eye image
          </h1>

          <p className="mt-4 text-slate-400">
            Processing the retinal image through the AI screening model...
          </p>

          <div className="mt-10 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {progress}% Complete
          </p>

        </div>
      </main>
    );
  }

  // ============================================================
  // NO RESULT FOUND
  // ============================================================

  if (!result) {
    return (
      <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">

        <div className="max-w-lg text-center">

          <h1 className="text-3xl font-bold">
            No screening result found
          </h1>

          <p className="mt-4 text-slate-400">
            Please upload a retinal image and run the AI screening first.
          </p>

          <Link
            href="/scan"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-4 font-semibold"
          >
            Start Eye Scan
          </Link>

        </div>

      </main>
    );
  }

  // ============================================================
  // REAL AI RESULT
  // ============================================================

  const confidence = Number(result.confidence ?? 0);

  const statusColour =
    result.grade === 0
      ? "text-emerald-400"
      : result.grade <= 2
      ? "text-amber-400"
      : "text-red-400";

  const statusBackground =
    result.grade === 0
      ? "border-emerald-400/20 bg-emerald-400/5"
      : result.grade <= 2
      ? "border-amber-400/20 bg-amber-400/5"
      : "border-red-400/20 bg-red-400/5";

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-12">

      <div className="mx-auto max-w-5xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="text-center">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5 text-xl">
            ✓
          </div>

          <p className="text-sm font-semibold tracking-widest text-cyan-400">
            SCREENING COMPLETE
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            AI Screening Result
          </h1>

          <p className="mt-3 text-slate-400">
            Your retinal image has been processed by the OcuSphere AI model.
          </p>

        </div>

        {/* =====================================================
            MAIN AI RESULT
        ===================================================== */}

        <div
          className={`mt-12 rounded-3xl border p-8 ${statusBackground}`}
        >

          <p className="text-sm text-slate-400">
            AI Prediction
          </p>

          <h2 className={`mt-2 text-3xl font-bold ${statusColour}`}>
            {result.prediction}
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <ResultCard
              title="DR Grade"
              value={`Grade ${result.grade}`}
            />

            <ResultCard
              title="Severity"
              value={result.severity || "Not available"}
            />

            <ResultCard
              title="AI Confidence"
              value={`${confidence.toFixed(2)}%`}
            />

          </div>

          {/* CONFIDENCE BAR */}

          <div className="mt-8">

            <div className="mb-2 flex justify-between text-sm">

              <span className="text-slate-400">
                Prediction confidence
              </span>

              <span className="font-semibold">
                {confidence.toFixed(2)}%
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
                style={{
                  width: `${Math.min(confidence, 100)}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* =====================================================
            CLASS PROBABILITIES
        ===================================================== */}

        {result.probabilities && result.probabilities.length > 0 && (

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

            <h2 className="text-xl font-semibold">
              AI Probability Analysis
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Model probability across diabetic retinopathy grades.
            </p>

            <div className="mt-6 space-y-5">

              {result.probabilities.map((item) => (

                <div key={item.grade}>

                  <div className="mb-2 flex justify-between gap-4 text-sm">

                    <span className="text-slate-300">
                      Grade {item.grade} — {item.name}
                    </span>

                    <span className="font-semibold">
                      {Number(item.probability).toFixed(2)}%
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.min(
                          Number(item.probability),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* =====================================================
            RECOMMENDED NEXT STEP
        ===================================================== */}

        {result.recommendation && (

          <div className="mt-8 rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.04] p-8">

            <p className="text-sm font-semibold tracking-wide text-cyan-300">
              RECOMMENDED NEXT STEP
            </p>

            <p className="mt-3 leading-7 text-slate-300">
              {result.recommendation}
            </p>

            {/* FIND EYE SPECIALIST */}

            <Link
              href="/doctors"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Find Eye Specialist →
            </Link>

          </div>

        )}

        {/* =====================================================
            CARE PATHWAY
        ===================================================== */}

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-8">

          <h2 className="text-xl font-semibold">
            OcuSphere Care Pathway
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Continue from AI-assisted screening to professional eye care when needed.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <CareStep
              number="1"
              title="AI Screening"
              description="Your retinal image has been analysed by the OcuSphere AI model."
            />

            <CareStep
              number="2"
              title="Find Eye Care"
              description="Locate ophthalmologists, retina specialists and eye-care services."
            />

            <CareStep
              number="3"
              title="Professional Review"
              description="Discuss screening findings with a qualified eye-care professional."
            />

          </div>

        </div>

        {/* =====================================================
            SCAN INFORMATION
        ===================================================== */}

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-8">

          <h2 className="text-xl font-semibold">
            Scan Information
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <ResultCard
              title="Scan Type"
              value={scanType || "Retinal Screening"}
            />

            <ResultCard
              title="Image"
              value={imageName || "Uploaded image"}
            />

            <ResultCard
              title="Image Size"
              value={
                imageSize
                  ? formatBytes(Number(imageSize))
                  : "Not available"
              }
            />

          </div>

          {result.model && (

            <div className="mt-4">

              <ResultCard
                title="AI Model"
                value={result.model}
              />

            </div>

          )}

        </div>

        {/* =====================================================
            MEDICAL DISCLAIMER
        ===================================================== */}

        <div className="mt-8 rounded-2xl border border-amber-400/10 bg-amber-400/[0.03] p-6">

          <p className="text-sm font-semibold text-amber-300">
            Important Medical Disclaimer
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-400">

            {result.disclaimer ||
              "This AI screening result is intended for screening and research support only. It should not be treated as a definitive medical diagnosis. Consult a qualified eye-care professional for clinical evaluation."}

          </p>

        </div>

        {/* =====================================================
            ACTION BUTTONS
        ===================================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">

          <Link
            href="/scan"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-4 text-center font-semibold transition hover:opacity-90"
          >
            Scan Another Image
          </Link>

          <Link
            href="/doctors"
            className="rounded-xl border border-cyan-400/30 px-6 py-4 text-center font-semibold text-cyan-300 transition hover:bg-cyan-400/5"
          >
            Find Eye Specialist
          </Link>

          <Link
            href="/patient-dashboard"
            className="rounded-xl border border-white/10 px-6 py-4 text-center font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Return Home
          </Link>

        </div>

      </div>

    </main>
  );
}


// ============================================================
// RESULT CARD
// ============================================================

function ResultCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}


// ============================================================
// CARE PATHWAY CARD
// ============================================================

function CareStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
        {number}
      </div>

      <h3 className="mt-4 font-semibold text-slate-200">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>

    </div>
  );
}


// ============================================================
// IMAGE SIZE FORMATTER
// ============================================================

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 Bytes";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}