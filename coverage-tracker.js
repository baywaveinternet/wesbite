(function () {
  const DATA_URL = "AIzaSyDgTEGTV1gIXU9fg_F2FksafaQlWuiwYIs";

  // ============================
  // PLACE YOUR API KEY HERE
  // ============================
  const GOOGLE_MAPS_API_KEY = "PLACE YOUR API KEY HERE";

  const addressInput = document.getElementById("address");
  const checkBtn = document.getElementById("checkBtn");
  const coverageStatus = document.getElementById("coverageStatus");
  const mapElement = document.getElementById("map");

  let coverageData = null;
  let map = null;
  let marker = null;
  let geocoder = null;

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

  function extractLocationFromGeocode(result) {
    const components = result.address_components || [];

    const suburb =
      getComponent(components, "sublocality_level_1") ||
      getComponent(components, "sublocality") ||
      getComponent(components, "locality") ||
      getComponent(components, "administrative_area_level_2");

    const postcode = getComponent(components, "postal_code");

    return {
      suburb,
      postcode,
      address: result.formatted_address || ""
    };
  }

  function findMatch(data, suburb, postcode) {
    const s = normalize(suburb);
    const p = normalize(postcode);

    return (
      data.areas.find(a => normalize(a.postcode) === p && normalize(a.suburb) === s) ||
      data.areas.find(a => normalize(a.postcode) === p) ||
      data.areas.find(a => normalize(a.suburb) === s) ||
      null
    );
  }

  function renderPackages(providerData) {
    if (!providerData || !providerData.packages || !providerData.packages.length) {
      return "";
    }

    return (
      "<ul>" +
      providerData.packages
        .map(p => `<li>${p.speedMbps} Mbps — R${p.price}</li>`)
        .join("") +
      "</ul>"
    );
  }

  function showResult(area, data, formattedAddress) {
    const disclaimer =
      "Coverage checker is a guide only and may not be 100% accurate. Final coverage will be confirmed during sign-up.";

    if (!area) {
      coverageStatus.innerHTML =
        `⚠️ Coverage not found for <strong>${formattedAddress}</strong>.<br><em>${disclaimer}</em>`;
      return;
    }

    if (!area.fibreAvailable) {
      coverageStatus.innerHTML =
        `⚠️ Fibre not available in this area yet.<br><em>${disclaimer}</em>`;
      return;
    }

    const provider = area.fno;
    const providerData = data.providers ? data.providers[provider] : null;
    const packages = renderPackages(providerData);

    coverageStatus.innerHTML =
      `✅ Fibre available at <strong>${formattedAddress}</strong><br>` +
      `Provider: <strong>${provider}</strong><br>` +
      packages +
      `<em>${disclaimer}</em>`;
  }

  function createMap() {
    if (!mapElement) return;

    const durban = { lat: -29.8587, lng: 31.0218 };

    map = new google.maps.Map(mapElement, {
      center: durban,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    marker = new google.maps.Marker({
      position: durban,
      map: map,
      title: "Durban"
    });

    geocoder = new google.maps.Geocoder();
  }

  function moveMap(location, title) {
    if (!map || !marker) return;
    map.setCenter(location);
    map.setZoom(17);
    marker.setPosition(location);
    marker.setTitle(title || "Selected address");
  }

  async function checkCoverage() {
    const address = (addressInput.value || "").trim();

    if (!address) {
      coverageStatus.innerHTML = "Please enter your address.";
      return;
    }

    if (!geocoder) {
      coverageStatus.innerHTML = "Map failed to load. Check your Google API key.";
      return;
    }

    coverageStatus.innerHTML = "Checking coverage...";

    try {
      const data = await loadCoverage();

      geocoder.geocode(
        {
          address: address,
          componentRestrictions: { country: "ZA" }
        },
        function (results, status) {
          if (status !== "OK" || !results || !results[0]) {
            coverageStatus.innerHTML = "Address not found. Please try a full address.";
            return;
          }

          const result = results[0];
          const location = result.geometry.location;
          const loc = extractLocationFromGeocode(result);
          const area = findMatch(data, loc.suburb, loc.postcode);

          moveMap(location, result.formatted_address);
          showResult(area, data, result.formatted_address);
        }
      );
    } catch (error) {
      console.error(error);
      coverageStatus.innerHTML = "Could not load coverage data.";
    }
  }

  function loadGoogleMaps() {
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      GOOGLE_MAPS_API_KEY;
    script.async = true;
    script.defer = true;
    script.onload = createMap;
    document.head.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadGoogleMaps();

    if (checkBtn) {
      checkBtn.addEventListener("click", checkCoverage);
    }

    if (addressInput) {
      addressInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          checkCoverage();
        }
      });
    }
  });
})();
