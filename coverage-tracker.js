(function () {
  const DATA_URL = "coverage-data.json";
  const GOOGLE_MAPS_API_KEY = "PASTE_YOUR_RESTRICTED_GOOGLE_MAPS_KEY_HERE";

  const addressInput = document.getElementById("address");
  const checkBtn = document.getElementById("checkBtn");
  const coverageStatus = document.getElementById("coverageStatus");
  const waTop = document.getElementById("waTop");
  const waHero = document.getElementById("waHero");

  let coverageData = null;
  let selectedPlace = null;
  let autocomplete = null;

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getWhatsappUrl(message) {
    const number = window.WHATSAPP_NUMBER || "27824166284";
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function updateWaLinks(message) {
    if (waTop) waTop.href = getWhatsappUrl(message);
    if (waHero) waHero.href = getWhatsappUrl(message);
  }

  async function loadCoverageData() {
    if (coverageData) return coverageData;
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load coverage data.");
    coverageData = await response.json();
    return coverageData;
  }

  function getComponent(components, type) {
    const match = (components || []).find((component) => (component.types || []).includes(type));
    return match ? match.long_name : "";
  }

  function extractLocationData(place) {
    const components = (place && place.address_components) || [];
    const streetNumber = getComponent(components, "street_number");
    const route = getComponent(components, "route");
    const neighborhood = getComponent(components, "neighborhood");
    const sublocality = getComponent(components, "sublocality_level_1") || getComponent(components, "sublocality");
    const locality = getComponent(components, "locality");
    const postalCode = getComponent(components, "postal_code");
    const adminArea2 = getComponent(components, "administrative_area_level_2");

    const suburb = sublocality || neighborhood || locality || adminArea2 || "";
    const street = [streetNumber, route].filter(Boolean).join(" ");
    return {
      formattedAddress: (place && place.formatted_address) || addressInput?.value || "",
      suburb,
      postalCode,
      street,
      components
    };
  }

  function findCoverageMatch(data, suburb, postalCode) {
    const suburbNorm = normalize(suburb);
    const postcodeNorm = normalize(postalCode);

    const areas = Array.isArray(data.areas) ? data.areas : [];

    const exactBoth = areas.find((area) =>
      normalize(area.postcode) === postcodeNorm &&
      normalize(area.suburb) === suburbNorm
    );
    if (exactBoth) return { match: exactBoth, reason: "postcode+suburb" };

    const exactPostcode = areas.find((area) => normalize(area.postcode) === postcodeNorm);
    if (exactPostcode) return { match: exactPostcode, reason: "postcode" };

    const exactSuburb = areas.find((area) => normalize(area.suburb) === suburbNorm);
    if (exactSuburb) return { match: exactSuburb, reason: "suburb" };

    return { match: null, reason: "none" };
  }

  function openProviderCard(providerName) {
    if (!providerName) return;
    const slug = normalize(providerName).replace(/\s+/g, "");
    const providerCard = document.querySelector(`details.provider[data-provider="${slug}"]`);
    if (providerCard) {
      providerCard.setAttribute("open", "open");
      providerCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderPackages(providerName, data) {
    const provider = data.providers ? data.providers[providerName] : null;
    if (!provider || !Array.isArray(provider.packages) || !provider.packages.length) return "";

    const items = provider.packages
      .map((pkg) => `<li>${escapeHtml(pkg.speedMbps)} Mbps — <strong>R${escapeHtml(pkg.price)}</strong>/pm</li>`)
      .join("");

    return `
      <div style="margin-top:12px">
        <strong>Available ${escapeHtml(providerName)} packages:</strong>
        <ul style="margin:8px 0 0 18px; padding:0;">
          ${items}
        </ul>
      </div>
    `;
  }

  function renderMessage(result, data, lookup) {
    const disclaimer = data?.meta?.disclaimer ||
      "Coverage checker is a guide only and may not be 100% accurate. Final fibre availability will always be confirmed during sign-up.";

    if (!result) {
      coverageStatus.innerHTML = `
        ⚠️ <strong>We could not match that address yet.</strong>
        Please check the suburb/postal code or send the full address on WhatsApp.
        <div style="margin-top:10px;"><em>${escapeHtml(disclaimer)}</em></div>
      `;
      return;
    }

    const { suburb, postcode, fno, fibreAvailable } = result;

    if (!fibreAvailable || !fno) {
      coverageStatus.innerHTML = `
        ⚠️ <strong>No listed fibre coverage found for ${escapeHtml(suburb || lookup.suburb || "this area")}${postcode ? " (" + escapeHtml(postcode) + ")" : ""}.</strong>
        Please contact us to double-check your exact address.
        <div style="margin-top:10px;"><em>${escapeHtml(disclaimer)}</em></div>
      `;
      return;
    }

    coverageStatus.innerHTML = `
      ✅ <strong>Coverage found:</strong> ${escapeHtml(suburb)}${postcode ? " (" + escapeHtml(postcode) + ")" : ""}
      <br><strong>Provider:</strong> ${escapeHtml(fno)}
      ${renderPackages(fno, data)}
      <div style="margin-top:10px;"><em>${escapeHtml(disclaimer)}</em></div>
    `;

    openProviderCard(fno);
  }

  function initAutocomplete() {
    if (!window.google || !window.google.maps || !window.google.maps.places || !addressInput) return;

    autocomplete = new google.maps.places.Autocomplete(addressInput, {
      componentRestrictions: { country: "za" },
      fields: ["address_components", "formatted_address", "geometry", "name"],
      types: ["address"]
    });

    autocomplete.addListener("place_changed", () => {
      selectedPlace = autocomplete.getPlace();
    });
  }

  function loadGoogleMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve();
        return;
      }

      const existing = document.getElementById("baywave-google-maps-script");
      if (existing) {
        existing.addEventListener("load", resolve);
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.id = "baywave-google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function runCoverageCheck() {
    try {
      const data = await loadCoverageData();
      let lookup = selectedPlace ? extractLocationData(selectedPlace) : null;

      if (!lookup || (!lookup.suburb && !lookup.postalCode)) {
        lookup = {
          formattedAddress: addressInput?.value || "",
          suburb: addressInput?.value || "",
          postalCode: ""
        };
      }

      const result = findCoverageMatch(data, lookup.suburb, lookup.postalCode);
      renderMessage(result.match, data, lookup);

      const msg = `Hi BayWave Internet 👋 I would like to confirm fibre coverage for: ${lookup.formattedAddress || addressInput?.value || ""}`;
      updateWaLinks(msg);
    } catch (error) {
      if (coverageStatus) {
        coverageStatus.innerHTML = `⚠️ <strong>Coverage checker is temporarily unavailable.</strong> Please try again or contact us on WhatsApp.`;
      }
      console.error(error);
    }
  }

  async function initCoverageTracker() {
    try {
      await loadCoverageData();
      await loadGoogleMapsScript();
      initAutocomplete();

      if (coverageStatus) {
        coverageStatus.innerHTML = `
          <em>Coverage checker is a guide only and may not be 100% accurate. Final coverage will be confirmed during sign-up.</em>
        `;
      }
    } catch (error) {
      console.error("Coverage tracker init failed:", error);
    }
  }

  checkBtn?.addEventListener("click", runCoverageCheck);

  addressInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCoverageCheck();
    }
  });

  window.BayWaveCoverageTracker = {
    init: initCoverageTracker,
    check: runCoverageCheck
  };

  document.addEventListener("DOMContentLoaded", initCoverageTracker);
})();