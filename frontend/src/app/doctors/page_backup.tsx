"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// TYPES
// ============================================================

type EyeCareFacility = {
  id: number;
  name: string;
  type: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
};

type SearchType =
  | "ophthalmologist"
  | "retina specialist"
  | "eye hospital";

// ============================================================
// MAIN PAGE
// ============================================================

export default function DoctorsPage() {
  const router = useRouter();

  const [location, setLocation] = useState("Mysuru, Karnataka");
  const [facilities, setFacilities] = useState<EyeCareFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // GOOGLE MAPS SEARCH
  // ==========================================================

  const openGoogleMaps = (
    type: SearchType = "ophthalmologist",
    customLocation?: string
  ) => {
    const searchLocation = customLocation || location || "Mysuru, Karnataka";

    const query = encodeURIComponent(`${type} near ${searchLocation}`);

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ==========================================================
  // SEARCH USING OPENSTREETMAP
  // ==========================================================

  const searchEyeCare = async (
    e?: FormEvent<HTMLFormElement>,
    customLocation?: string
  ) => {
    e?.preventDefault();

    const searchLocation = customLocation || location;

    if (!searchLocation.trim()) {
      setError("Please enter a city or location.");
      return;
    }

    setLoading(true);
    setError("");
    setFacilities([]);
    setSearched(false);

    try {
      // ------------------------------------------------------
      // STEP 1: Convert location name to coordinates
      // ------------------------------------------------------

      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          searchLocation
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!geoResponse.ok) {
        throw new Error("Unable to locate the entered city.");
      }

      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        throw new Error(
          "Location could not be found. Try entering a city and state."
        );
      }

      const latitude = Number(geoData[0].lat);
      const longitude = Number(geoData[0].lon);

      // ------------------------------------------------------
      // STEP 2: Search nearby healthcare facilities
      // ------------------------------------------------------

      const radius = 12000;

      const query = `
        [out:json][timeout:25];
        (
          node["healthcare"="ophthalmologist"](around:${radius},${latitude},${longitude});
          way["healthcare"="ophthalmologist"](around:${radius},${latitude},${longitude});
          relation["healthcare"="ophthalmologist"](around:${radius},${latitude},${longitude});

          node["healthcare:speciality"~"ophthalmology",i](around:${radius},${latitude},${longitude});
          way["healthcare:speciality"~"ophthalmology",i](around:${radius},${latitude},${longitude});
          relation["healthcare:speciality"~"ophthalmology",i](around:${radius},${latitude},${longitude});

          node["name"~"eye",i]["amenity"~"hospital|clinic"](around:${radius},${latitude},${longitude});
          way["name"~"eye",i]["amenity"~"hospital|clinic"](around:${radius},${latitude},${longitude});
          relation["name"~"eye",i]["amenity"~"hospital|clinic"](around:${radius},${latitude},${longitude});
        );
        out center tags;
      `;

      const osmResponse = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
          query
        )}`
      );

      if (!osmResponse.ok) {
        throw new Error("OpenStreetMap provider search is currently unavailable.");
      }

      const osmData = await osmResponse.json();

      // ------------------------------------------------------
      // STEP 3: Format results
      // ------------------------------------------------------

      const results: EyeCareFacility[] = (osmData.elements || [])
        .map((item: any) => {
          const tags = item.tags || {};

          const lat = item.lat ?? item.center?.lat;
          const lon = item.lon ?? item.center?.lon;

          if (!lat || !lon) {
            return null;
          }

          const name =
            tags.name ||
            tags["name:en"] ||
            "Eye-Care Provider";

          let type = "Eye-Care Facility";

          if (tags.healthcare === "ophthalmologist") {
            type = "Ophthalmologist";
          } else if (tags.amenity === "hospital") {
            type = "Eye Hospital";
          } else if (tags.amenity === "clinic") {
            type = "Eye Clinic";
          }

          const addressParts = [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:suburb"],
            tags["addr:city"],
            tags["addr:state"],
          ].filter(Boolean);

          return {
            id: item.id,
            name,
            type,
            address:
              addressParts.length > 0
                ? addressParts.join(", ")
                : searchLocation,
            lat,
            lon,
            phone:
              tags.phone ||
              tags["contact:phone"] ||
              undefined,
            website:
              tags.website ||
              tags["contact:website"] ||
              undefined,
          };
        })
        .filter(Boolean);

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(
          results.map((facility: EyeCareFacility) => [
            `${facility.name}-${facility.lat}-${facility.lon}`,
            facility,
          ])
        ).values()
      );

      setFacilities(uniqueResults.slice(0, 20));
      setSearched(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to search eye-care providers."
      );

      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location services are not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          const data = await response.json();

          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Current Location";

          const state = data.address?.state || "";

          const detectedLocation = state
            ? `${city}, ${state}`
            : city;

          setLocation(detectedLocation);

          await searchEyeCare(undefined, detectedLocation);
        } catch (err) {
          console.error(err);

          setError(
            "Your location was detected, but the place name could not be retrieved."
          );
        } finally {
          setLocationLoading(false);
        }
      },

      (geoError) => {
        console.error(geoError);

        setLocationLoading(false);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "Location permission was denied. Enter your city manually instead."
          );
        } else {
          setError(
            "Unable to detect your location. Enter your city manually."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // ==========================================================
  // APPOINTMENT
  // ==========================================================

  const bookAppointment = (facility?: EyeCareFacility) => {
    if (facility) {
      const params = new URLSearchParams({
        provider: facility.name,
        location: facility.address,
      });

      router.push(`/appointments?${params.toString()}`);
      return;
    }

    router.push("/appointments");
  };

  // ==========================================================
  // DIRECTIONS
  // ==========================================================

  const openDirections = (facility: EyeCareFacility) => {
    const destination = encodeURIComponent(
      `${facility.lat},${facility.lon}`
    );

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">

        {/* ====================================================
            BACK BUTTON
        ==================================================== */}

        <button
          onClick={() => router.push("/scan/result")}
          className="mb-10 text-sm text-slate-400 transition hover:text-cyan-300"
        >
          ← Back to Screening Result
        </button>

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section>
          <p className="text-sm font-bold tracking-[0.25em] text-cyan-400">
            OCUSPHERE CARE NETWORK
          </p>

          <h1 className="mt-4 text-4xl font-bold md:text-5xl">
            Find Eye Care
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-400">
            Find ophthalmologists, retina specialists and eye-care
            facilities based on your location. OcuSphere uses open
            location data and direct provider searches without requiring
            a paid Google Maps API.
          </p>
        </section>

        {/* ====================================================
            QUICK SEARCH CARDS
        ==================================================== */}

        <section className="mt-10 grid gap-5 md:grid-cols-3">

          <SearchCard
            icon="◉"
            title="Ophthalmologists"
            description="Search for medical eye specialists near your selected location."
            button="Find Ophthalmologists ↗"
            onClick={() => openGoogleMaps("ophthalmologist")}
          />

          <SearchCard
            icon="◎"
            title="Retina Specialists"
            description="Find specialists focused on retinal diseases and diabetic eye conditions."
            button="Find Retina Specialists ↗"
            onClick={() => openGoogleMaps("retina specialist")}
          />

          <SearchCard
            icon="+"
            title="Eye Hospitals"
            description="Search for nearby hospitals and clinics providing eye-care services."
            button="Find Eye Hospitals ↗"
            onClick={() => openGoogleMaps("eye hospital")}
          />

        </section>

        {/* ====================================================
            LOCATION SEARCH
        ==================================================== */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

          <h2 className="text-2xl font-semibold">
            Search Eye Care
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Search free OpenStreetMap community data for nearby providers.
          </p>

          <form
            onSubmit={(e) => searchEyeCare(e)}
            className="mt-6"
          >
            <label className="text-sm text-slate-300">
              Location
            </label>

            <div className="mt-2 flex flex-col gap-4 md:flex-row">

              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Example: Mysuru, Karnataka"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 outline-none transition focus:border-cyan-400"
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-8 py-4 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Searching..."
                  : "Search Eye Specialists"}
              </button>

            </div>
          </form>

          {/* CURRENT LOCATION */}

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locationLoading}
            className="mt-4 rounded-xl border border-cyan-400/40 px-5 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-50"
          >
            {locationLoading
              ? "◉ Detecting Location..."
              : "◎ Use My Current Location"}
          </button>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Facility information is retrieved from OpenStreetMap
            community data and may not include every healthcare provider.
          </p>

        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <section className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5">
            <p className="font-medium text-red-300">
              {error}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              You can still search current provider listings using the
              Google Maps options below.
            </p>
          </section>
        )}

        {/* ====================================================
            OPEN DATA LIMITED MESSAGE
        ==================================================== */}

        {searched && facilities.length === 0 && !loading && (
          <section className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
            <p className="font-semibold text-yellow-300">
              Open-data listings are limited in this area
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              No matching eye-care facilities were available from
              OpenStreetMap for this search. This does not mean that
              eye-care providers are unavailable in the area. Use the
              provider search options below to view broader listings.
            </p>
          </section>
        )}

        {/* ====================================================
            RESULTS HEADER
        ==================================================== */}

        <section className="mt-12">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>
              <h2 className="text-3xl font-bold">
                Nearby Eye Care
              </h2>

              <p className="mt-2 text-slate-400">
                Results near {location}
              </p>
            </div>

            <button
              onClick={() => openGoogleMaps("ophthalmologist")}
              className="rounded-xl border border-cyan-400/30 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              View More on Google Maps ↗
            </button>

          </div>

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
                ◉
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Searching nearby eye care...
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Checking OpenStreetMap community healthcare data.
              </p>

            </div>
          )}

          {/* ==================================================
              FACILITY RESULTS
          ================================================== */}

          {!loading && facilities.length > 0 && (
            <div className="mt-8 space-y-5">

              {facilities.map((facility) => (
                <FacilityCard
                  key={`${facility.id}-${facility.lat}`}
                  facility={facility}
                  onBook={() => bookAppointment(facility)}
                  onDirections={() => openDirections(facility)}
                />
              ))}

            </div>
          )}

          {/* ==================================================
              GOOGLE MAPS FALLBACK
          ================================================== */}

          {!loading && facilities.length === 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-8 text-center md:p-10">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
                ⌕
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Explore current eye-care providers
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">
                OpenStreetMap may not contain every eye-care provider in
                this location. Continue your search using Google Maps
                without connecting a paid Google Maps API to OcuSphere.
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">

                <button
                  onClick={() => openGoogleMaps("ophthalmologist")}
                  className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-7 py-3.5 font-semibold"
                >
                  Search Google Maps ↗
                </button>

                <button
                  onClick={() => bookAppointment()}
                  className="rounded-xl border border-cyan-400/30 px-7 py-3.5 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  Request Appointment →
                </button>

              </div>

            </div>
          )}

        </section>

        {/* ====================================================
            APPOINTMENT CTA
        ==================================================== */}

        <section className="mt-10 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.035] p-7 md:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-cyan-300">
                OCUSPHERE CARE JOURNEY
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Ready to request an appointment?
              </h2>

              <p className="mt-2 max-w-2xl leading-6 text-slate-400">
                Enter your preferred eye-care provider, consultation date
                and time. The provider must confirm the actual appointment.
              </p>
            </div>

            <button
              onClick={() => bookAppointment()}
              className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-7 py-4 font-semibold"
            >
              Request Appointment →
            </button>

          </div>

        </section>

        {/* ====================================================
            HOW IT WORKS
        ==================================================== */}

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-7 md:p-8">

          <h2 className="text-xl font-semibold text-cyan-300">
            How OcuSphere finds eye care
          </h2>

          <p className="mt-4 leading-7 text-slate-400">
            OcuSphere first checks free OpenStreetMap community data for
            nearby eye-care facilities. Because open-data coverage varies
            by location, broader searches can be opened directly in Google
            Maps. This approach does not require OcuSphere to connect to a
            paid Google Maps API.
          </p>

        </section>

        {/* ====================================================
            MEDICAL / PROVIDER DISCLAIMER
        ==================================================== */}

        <section className="mt-8 rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.025] p-7">

          <p className="text-sm font-semibold text-yellow-300">
            Healthcare Provider Information
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            OcuSphere provides provider information for convenience only.
            Availability, contact details, services and appointment times
            should be confirmed directly with the healthcare provider.
            AI screening results are intended to support screening and
            should not replace diagnosis or medical advice from a
            qualified healthcare professional.
          </p>

        </section>

      </div>
    </main>
  );
}

// ============================================================
// SEARCH CARD
// ============================================================

function SearchCard({
  icon,
  title,
  description,
  button,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">
        {icon}
      </div>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-400">
        {description}
      </p>

      <button
        onClick={onClick}
        className="mt-6 w-full rounded-xl border border-cyan-400/30 px-4 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
      >
        {button}
      </button>

    </div>
  );
}

// ============================================================
// FACILITY CARD
// ============================================================

function FacilityCard({
  facility,
  onBook,
  onDirections,
}: {
  facility: EyeCareFacility;
  onBook: () => void;
  onDirections: () => void;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-7">

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

        {/* PROVIDER INFORMATION */}

        <div>

          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            {facility.type}
          </span>

          <h3 className="mt-4 text-2xl font-semibold">
            {facility.name}
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            {facility.address}
          </p>

          {facility.phone && (
            <p className="mt-3 text-sm text-slate-300">
              ☎ {facility.phone}
            </p>
          )}

        </div>

        {/* BUTTONS */}

        <div className="flex flex-wrap gap-3">

          <button
            onClick={onDirections}
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            Directions ↗
          </button>

          {facility.website && (
            <button
              onClick={() =>
                window.open(
                  facility.website,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:border-cyan-400/40 hover:text-cyan-300"
            >
              Website ↗
            </button>
          )}

          <button
            onClick={onBook}
            className="rounded-xl bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 px-6 py-3 font-semibold"
          >
            Request Appointment →
          </button>

        </div>

      </div>

    </article>
  );
}