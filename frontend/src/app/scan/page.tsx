"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ScanType = "normal" | "retinal" | null;

type Patient = {
  name: string;
  phone: string;
};

export default function ScanPage() {
  const router = useRouter();

  const [scanType, setScanType] = useState<ScanType>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);

  // =========================================================
  // LOAD LOGGED-IN PATIENT
  // =========================================================

  useEffect(() => {
    try {
      const savedPatient = localStorage.getItem("ocusphere_patient");

      if (!savedPatient) {
        setPatient(null);
        return;
      }

      const parsedPatient = JSON.parse(savedPatient);

      if (
        parsedPatient &&
        typeof parsedPatient.name === "string" &&
        typeof parsedPatient.phone === "string"
      ) {
        setPatient({
          name: parsedPatient.name,
          phone: parsedPatient.phone,
        });
      }
    } catch (err) {
      console.error("Unable to load patient information:", err);
      setPatient(null);
    }
  }, []);

  // =========================================================
  // CREATE IMAGE PREVIEW
  // =========================================================

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // =========================================================
  // IMAGE SELECTION
  // =========================================================

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError(null);

    // Backend currently accepts JPG/JPEG and PNG.
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a JPG, JPEG or PNG image.");
      event.target.value = "";
      return;
    }

    // Maximum file size = 10 MB
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  // =========================================================
  // CHOOSE SCAN
  // =========================================================

  function chooseScan(type: ScanType) {
    setScanType(type);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  function removeImage() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  // =========================================================
  // FORMAT FILE SIZE
  // =========================================================

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // =========================================================
  // SEND IMAGE TO FASTAPI BACKEND
  // =========================================================

  async function handleAnalyse() {
    if (!selectedFile || !scanType) {
      return;
    }

    try {
      setIsAnalysing(true);
      setError(null);

      // -----------------------------------------------------
      // GET CURRENT PATIENT
      // -----------------------------------------------------

      let currentPatient = patient;

      // Read localStorage again just before the request
      // so the newest patient information is always used.
      try {
        const savedPatient = localStorage.getItem("ocusphere_patient");

        if (savedPatient) {
          const parsedPatient = JSON.parse(savedPatient);

          if (
            parsedPatient &&
            typeof parsedPatient.name === "string" &&
            typeof parsedPatient.phone === "string"
          ) {
            currentPatient = {
              name: parsedPatient.name.trim(),
              phone: parsedPatient.phone.trim(),
            };

            setPatient(currentPatient);
          }
        }
      } catch (patientError) {
        console.error(
          "Unable to read patient information:",
          patientError
        );
      }

      // -----------------------------------------------------
      // CREATE FORM DATA
      // -----------------------------------------------------

      const formData = new FormData();

      // FastAPI expects:
      // file: UploadFile
      formData.append("file", selectedFile);

      console.log("Sending image to backend...");
      console.log("Scan type:", scanType);
      console.log("Image:", selectedFile.name);

      if (currentPatient) {
        console.log("Patient:", currentPatient.name);
        console.log("Phone:", currentPatient.phone);
      } else {
        console.log("No logged-in patient found.");
      }

      // -----------------------------------------------------
      // CREATE HEADERS
      // -----------------------------------------------------

      const headers: HeadersInit = {};

      if (currentPatient?.name) {
        headers["X-Patient-Name"] = currentPatient.name;
      }

      if (currentPatient?.phone) {
        headers["X-Patient-Phone"] = currentPatient.phone;
      }

      // -----------------------------------------------------
      // SEND IMAGE
      // -----------------------------------------------------

      const response = await fetch(
        "http://127.0.0.1:8000/analyse",
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      // -----------------------------------------------------
      // HANDLE BACKEND ERROR
      // -----------------------------------------------------

      if (!response.ok) {
        let backendMessage = "";

        try {
          const errorData = await response.json();
          backendMessage =
            errorData?.detail || "AI analysis failed.";
        } catch {
          backendMessage =
            `Backend returned error ${response.status}.`;
        }

        console.error("Backend error:", backendMessage);

        throw new Error(backendMessage);
      }

      // -----------------------------------------------------
      // READ RESULT
      // -----------------------------------------------------

      const data = await response.json();

      console.log("Backend response:");
      console.log(data);

      // =====================================================
      // SAVE RESULT FOR RESULT PAGE
      // =====================================================

      sessionStorage.setItem(
        "ocusphereResult",
        JSON.stringify(data)
      );

      sessionStorage.setItem(
        "scanType",
        scanType
      );

      sessionStorage.setItem(
        "imageName",
        selectedFile.name
      );

      sessionStorage.setItem(
        "imageSize",
        selectedFile.size.toString()
      );

      // Save latest scan ID separately
      if (data.scan_id) {
        sessionStorage.setItem(
          "ocusphereLatestScanId",
          data.scan_id
        );
      }

      // =====================================================
      // OPEN RESULT PAGE
      // =====================================================

      router.push("/scan/result");

    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to connect to the OcuSphere backend. Make sure the Python backend is running on port 8000."
        );
      }
    } finally {
      setIsAnalysing(false);
    }
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#030817] text-white">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-blue-500 to-cyan-400 shadow-lg shadow-cyan-500/20">

              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>

            </div>

            <div>
              <h1 className="text-xl font-bold">
                OcuSphere
              </h1>

              <p className="text-xs text-slate-400">
                AI Eye Healthcare
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-8 text-sm">

            <Link
              href="/"
              className="text-slate-400 transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/scan"
              className="font-medium text-cyan-400"
            >
              Eye Scan
            </Link>

            {patient && (
              <Link
                href="/patient-dashboard"
                className="text-slate-400 transition hover:text-white"
              >
                Patient Dashboard
              </Link>
            )}

          </div>
        </div>
      </nav>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <section className="mx-auto max-w-5xl px-6 py-16">

        {/* ===================================================
            PATIENT STATUS
        ==================================================== */}

        {patient && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-cyan-300">
                PATIENT SESSION
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Screening for{" "}
                <span className="font-semibold text-white">
                  {patient.name}
                </span>
              </p>
            </div>

            <Link
              href="/patient-dashboard"
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              View Dashboard →
            </Link>

          </div>
        )}

        {/* ===================================================
            STEP 1 - SELECT SCAN TYPE
        ==================================================== */}

        {!scanType && (
          <>
            <div className="text-center">

              <div className="mb-6 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs text-violet-300">
                ✦ AI-POWERED EYE SCREENING
              </div>

              <h2 className="text-4xl font-bold md:text-5xl">
                Choose your{" "}
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  eye screening
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-slate-400">
                Select the type of eye image you want to analyse.
                OcuSphere will guide the image through the
                appropriate AI-assisted screening process.
              </p>

            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2">

              {/* NORMAL EYE */}

              <button
                onClick={() => chooseScan("normal")}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl text-cyan-300">
                  ◉
                </div>

                <h3 className="mt-7 text-2xl font-bold">
                  Normal Eye Scan
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  Upload a clear normal photograph of the eye
                  taken using a smartphone or camera.
                </p>

                <div className="my-7 h-px bg-white/10" />

                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                  IMAGE SOURCE
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Smartphone",
                    "Camera",
                    "External Eye",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-10 font-semibold text-cyan-400">
                  Start Normal Eye Scan →
                </div>
              </button>

              {/* RETINAL */}

              <button
                onClick={() => chooseScan("retinal")}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left transition hover:-translate-y-1 hover:border-violet-400/40 hover:bg-violet-400/[0.04]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-2xl text-violet-300">
                  ◎
                </div>

                <h3 className="mt-7 text-2xl font-bold">
                  Retinal Scan
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  Upload a retinal or fundus photograph captured
                  using compatible retinal imaging equipment.
                </p>

                <div className="my-7 h-px bg-white/10" />

                <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                  IMAGE SOURCE
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Fundus Camera",
                    "Retinal Image",
                    "Clinical Imaging",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-10 font-semibold text-violet-400">
                  Start Retinal Scan →
                </div>
              </button>

            </div>
          </>
        )}

        {/* ===================================================
            STEP 2 - UPLOAD IMAGE
        ==================================================== */}

        {scanType && (
          <>
            <button
              onClick={() => chooseScan(null)}
              className="mb-12 text-sm text-slate-400 transition hover:text-white"
            >
              ← Change screening type
            </button>

            <div className="text-center">

              <div
                className={`inline-flex rounded-full border px-4 py-2 text-xs font-medium ${
                  scanType === "normal"
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                    : "border-violet-400/30 bg-violet-400/10 text-violet-300"
                }`}
              >
                ✦{" "}
                {scanType === "normal"
                  ? "NORMAL EYE SCREENING"
                  : "RETINAL SCREENING"}
              </div>

              <h2 className="mt-6 text-4xl font-bold">
                Upload your eye image
              </h2>

              <p className="mt-5 text-slate-400">
                {scanType === "normal"
                  ? "Upload a clear, well-lit photograph where the eye is clearly visible."
                  : "Upload a clear retinal or fundus image for AI-assisted retinal screening."}
              </p>

            </div>

            {/* NO IMAGE SELECTED */}

            {!selectedFile && (
              <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-4">

                <label className="flex min-h-[390px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/40 bg-[#0b1025] p-8 text-center transition hover:border-cyan-300">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-4xl">
                    ↑
                  </div>

                  <h3 className="mt-7 text-xl font-bold">
                    Choose an eye image
                  </h3>

                  <p className="mt-3 text-sm text-slate-400">
                    Click here to select an image from your computer.
                  </p>

                  <span className="mt-8 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3 font-semibold">
                    Choose Image
                  </span>

                  <p className="mt-5 text-xs text-slate-500">
                    JPG, JPEG or PNG • Maximum 10 MB
                  </p>

                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                </label>

              </div>
            )}

            {/* IMAGE SELECTED */}

            {selectedFile && previewUrl && (
              <div className="mx-auto mt-12 max-w-4xl">

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">

                  <div className="flex justify-center bg-black/20 p-6">
                    <img
                      src={previewUrl}
                      alt="Selected eye preview"
                      className="max-h-[480px] w-full rounded-2xl object-contain"
                    />
                  </div>

                  <div className="flex flex-col justify-between gap-6 border-t border-white/10 p-6 md:flex-row md:items-center">

                    <div>
                      <p className="font-semibold text-emerald-400">
                        ● Image ready
                      </p>

                      <p className="mt-2 font-medium text-white">
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>

                    <div className="flex gap-3">

                      <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm transition hover:bg-white/10">
                        Replace Image

                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={removeImage}
                        className="rounded-xl border border-red-400/20 bg-red-500/5 px-5 py-3 text-sm text-red-300 transition hover:bg-red-500/10"
                      >
                        Remove
                      </button>

                    </div>
                  </div>
                </div>

                {/* IMAGE CHECKS */}

                <div className="mt-6 grid gap-3 md:grid-cols-3">

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
                    <p className="font-medium">
                      ✓ Clear Image
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Avoid blur
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
                    <p className="font-medium">
                      ✓ Good Lighting
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Avoid reflections
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
                    <p className="font-medium">
                      ✓ Eye Visible
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Keep eye centred
                    </p>
                  </div>

                </div>

                {/* ERROR */}

                {error && (
                  <div className="mt-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
                    ⚠ {error}
                  </div>
                )}

                {/* ANALYSE BUTTON */}

                <button
                  onClick={handleAnalyse}
                  disabled={isAnalysing}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-500 px-6 py-4 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalysing
                    ? "Analysing Eye Image..."
                    : "Analyse Eye Image →"}
                </button>

                <p className="mt-4 text-center text-xs text-slate-500">
                  Your image will be securely sent to the OcuSphere backend for processing.
                </p>

              </div>
            )}

            {/* DISCLAIMER */}

            <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-amber-400/10 bg-amber-400/[0.03] p-5 text-sm leading-6 text-slate-400">
              OcuSphere provides AI-assisted screening support and
              does not replace examination, diagnosis, or medical
              advice from a qualified eye-care professional.
            </div>

          </>
        )}

      </section>

    </main>
  );
}