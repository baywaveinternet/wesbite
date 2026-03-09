
(function () {
  const DATA_URL = "coverage-data.json";

  // PUT YOUR GOOGLE MAPS KEY HERE
  const GOOGLE_MAPS_API_KEY = "AIzaSyDgTEGTV1gIXU9fg_F2FksafaQlWuiwYIs";

  const addressInput = document.getElementById("address");
  const checkBtn = document.getElementById("checkBtn");
  const coverageStatus = document.getElementById("coverageStatus");

  let coverageData = null;
  let autocomplete = null;
  let selectedPlace = null;

  function normalize(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadCoverage() {
    if (coverageData) return coverageData;
    const r = await fetch(DATA_URL);
    coverageData = await r.json();
    return coverageData;
  }

  function getComponent(components, type) {
    const match = (components || []).find(c => (c.types || []).includes(type));
    return match ? match.long_name : "";
  }

  function extractLocation(place) {
    const components = place.address_components || [];

    const suburb =
      getComponent(components, "sublocality_level_1") ||
      getComponent(components, "locality") ||
      getComponent(components, "administrative_area_level_2");

    const postcode = getComponent(components, "postal_code");

    return {
      suburb,
      postcode,
      address: place.formatted_address || ""
    };
  }

  function findMatch(data, suburb, postcode) {
    const s = normalize(suburb);
    const p = normalize(postcode);

    let match =
      data.areas.find(a => normalize(a.postcode) === p && normalize(a.suburb) === s) ||
      data.areas.find(a => normalize(a.postcode) === p) ||
      data.areas.find(a => normalize(a.suburb) === s);

    return match || null;
  }

  function showResult(area, data) {
    const disclaimer =
      "Coverage checker is a guide only and may not be 100% accurate. Final coverage will be confirmed during sign‑up.";

    if (!area) {
      coverageStatus.innerHTML =
        "⚠️ Coverage not found for this address.<br><em>" + disclaimer + "</em>";
      return;
    }

    if (!area.fibreAvailable) {
      coverageStatus.innerHTML =
        "⚠️ Fibre not available in this area yet.<br><em>" + disclaimer + "</em>";
      return;
    }

    const provider = area.fno;
    const providerData = data.providers[provider];

    let packages = "";
    if (providerData && providerData.packages) {
      packages =
        "<ul>" +
        providerData.packages
          .map(p => `<li>${p.speedMbps} Mbps — R${p.price}</li>`)
          .join("") +
        "</ul>";
    }

    coverageStatus.innerHTML =
      "✅ Fibre available via <strong>" +
      provider +
      "</strong><br>" +
      packages +
      "<em>" +
      disclaimer +
      "</em>";
  }

  async function checkCoverage() {
    const data = await loadCoverage();

    if (!selectedPlace) {
      coverageStatus.innerHTML = "Please select an address from the suggestions.";
      return;
    }

    const loc = extractLocation(selectedPlace);
    const area = findMatch(data, loc.suburb, loc.postcode);

    showResult(area, data);
  }

  function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(addressInput, {
      componentRestrictions: { country: "za" },
      fields: ["address_components", "formatted_address"],
      types: ["address"]
    });

    autocomplete.addListener("place_changed", () => {
      selectedPlace = autocomplete.getPlace();
    });
  }

  function loadGoogleMaps() {
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      GOOGLE_MAPS_API_KEY +
      "&libraries=places";
    script.async = true;
    document.head.appendChild(script);
    script.onload = initAutocomplete;
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadGoogleMaps();

    if (checkBtn) {
      checkBtn.addEventListener("click", checkCoverage);
    }
  });
})();
