(function () {
  const DATA_URL = "coverage-data.json";

  // ============================
  // PLACE YOUR API KEY HERE
  // ============================
  const GOOGLE_MAPS_API_KEY = "AIzaSyDgTEGTV1gIXU9fg_F2FksafaQlWuiwYIs";

  const addressInput = document.getElementById("address");
  const checkBtn = document.getElementById("checkBtn");
  const coverageStatus = document.getElementById("coverageStatus");
  const mapElement = document.getElementById("map");

  let coverageData = null;
  let map = null;
  let marker = null;
  let geocoder = null;
  let autocomplete = null;
  let mapsLoaded = false;

  function setStatus(html) {
    if (coverageStatus) {
      coverageStatus.innerHTML = html;
    }
  }

  function normalize(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function loadCoverage() {
    if (coverageData) return coverageData;

    const r = await fetch(DATA_URL, { cache: "no-store" });

    if (!r.ok) {
      throw new Error("Could not load coverage-data.json (" + r.status + ")");
    }

    let data;
    try {
      data = await r.json();
    } catch (err) {
      throw new Error("coverage-data.json contains invalid JSON.");
    }

    if (!data || !Array.isArray(data.areas)) {
      throw new Error("coverage-data.json is missing a valid areas array.");
    }

    coverageData = data;
    return coverageData;
  }

  function getComponent(components, type) {
    const match = (components || []).find(function (c) {
      return (c.types || []).includes(type);
    });
    return match ? match.long_name : "";
  }

  function extractLocationFromGeocode(result) {
    const components = result.address_components || [];

    const suburb =
      getComponent(components, "sublocality_level_1") ||
      getComponent(components, "sublocality") ||
      getComponent(components, "neighborhood") ||
      getComponent(components, "locality") ||
      getComponent(components, "administrative_area_level_2");

    const postcode = getComponent(components, "postal_code");

    const city =
      getComponent(components, "locality") ||
      getComponent(components, "administrative_area_level_2");

    return {
      suburb: suburb,
      postcode: postcode,
      city: city,
      address: result.formatted_address || ""
    };
  }

  function findMatch(data, suburb, postcode, city) {
    const s = normalize(suburb);
    const p = normalize(postcode);
    const c = normalize(city);

    if (!data || !Array.isArray(data.areas)) return null;

    let match =
      data.areas.find(function (a) {
        return normalize(a.suburb) === s && normalize(a.postcode) === p;
      }) ||
      data.areas.find(function (a) {
        return normalize(a.postcode) === p;
      }) ||
      data.areas.find(function (a) {
        return normalize(a.suburb) === s;
      }) ||
      data.areas.find(function (a) {
        return normalize(a.suburb) === c;
      });

    if (!match && s) {
      match = data.areas.find(function (a) {
        const areaSuburb = normalize(a.suburb);
        return areaSuburb.includes(s) || s.includes(areaSuburb);
      });
    }

    return match || null;
  }

  function renderPackages(providerData) {
    if (!providerData || !providerData.packages || !providerData.packages.length) {
      return "";
    }

    return (
      "<ul>" +
      providerData.packages
        .map(function (p) {
          return "<li>" + p.speedMbps + " Mbps — R" + p.price + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  function showResult(area, data, formattedAddress, loc) {
    const disclaimer =
      (data.meta && data.meta.disclaimer) ||
      "Coverage checker is a guide only and may not be 100% accurate. Final coverage will be confirmed during sign-up.";

    if (!area) {
      setStatus(
        "⚠️ Coverage not found for <strong>" +
          formattedAddress +
          "</strong>.<br>" +
          "Detected suburb: <strong>" +
          (loc.suburb || "Unknown") +
          "</strong><br>" +
          "Detected postcode: <strong>" +
          (loc.postcode || "Unknown") +
          "</strong><br>" +
          "<em>" +
          disclaimer +
          "</em>"
      );
      return;
    }

    if (!area.fibreAvailable) {
      setStatus(
        "⚠️ Fibre not available in this area yet.<br>" +
          "Matched area: <strong>" +
          area.suburb +
          "</strong> " +
          (area.postcode ? "(" + area.postcode + ")" : "") +
          "<br><em>" +
          disclaimer +
          "</em>"
      );
      return;
    }

    const provider = area.fno;
    const providerData = data.providers ? data.providers[provider] : null;
    const packages = renderPackages(providerData);

    setStatus(
      "✅ Fibre available at <strong>" +
        formattedAddress +
        "</strong><br>" +
        "Matched area: <strong>" +
        area.suburb +
        "</strong> " +
        (area.postcode ? "(" + area.postcode + ")" : "") +
        "<br>" +
        "Provider: <strong>" +
        (provider || "Not specified") +
        "</strong><br>" +
        packages +
        "<em>" +
        disclaimer +
        "</em>"
    );
  }

  function createMap() {
    if (!mapElement || !window.google || !google.maps) return;

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

    if (addressInput && google.maps.places) {
      autocomplete = new google.maps.places.Autocomplete(addressInput, {
        componentRestrictions: { country: "za" },
        fields: ["formatted_address", "geometry", "address_components", "name"],
        types: ["address"]
      });

      autocomplete.addListener("place_changed", function () {
        const place = autocomplete.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          return;
        }

        moveMap(place.geometry.location, place.formatted_address || place.name);
      });
    }

    mapsLoaded = true;
  }

  function moveMap(location, title) {
    if (!map || !marker) return;
    map.setCenter(location);
    map.setZoom(17);
    marker.setPosition(location);
    marker.setTitle(title || "Selected address");
  }

  async function checkCoverage() {
    const address = (addressInput && addressInput.value ? addressInput.value : "").trim();

    if (!address) {
      setStatus("Please enter your address.");
      return;
    }

    if (!geocoder) {
      setStatus("Map failed to load. Check your Google API key.");
      return;
    }

    setStatus("Checking coverage...");

    try {
      const data = await loadCoverage();

      geocoder.geocode(
        {
          address: address,
          componentRestrictions: { country: "ZA" }
        },
        function (results, status) {
          if (status !== "OK" || !results || !results[0]) {
            setStatus("Address not found. Please try a full address.");
            return;
          }

          const result = results[0];
          const location = result.geometry.location;
          const loc = extractLocationFromGeocode(result);
          const area = findMatch(data, loc.suburb, loc.postcode, loc.city);

          moveMap(location, result.formatted_address);
          showResult(area, data, result.formatted_address, loc);
        }
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not load coverage data.<br><small>" + error.message + "</small>");
    }
  }

  function loadGoogleMaps() {
    if (window.google && window.google.maps) {
      createMap();
      return;
    }

    window.initBayWaveMap = function () {
      createMap();
    };

    const existingScript = document.querySelector('script[data-baywave-maps="true"]');
    if (existingScript) return;

    const script = document.createElement("script");
    script.setAttribute("data-baywave-maps", "true");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(GOOGLE_MAPS_API_KEY) +
      "&libraries=places&callback=initBayWaveMap";
    script.async = true;
    script.defer = true;
    script.onerror = function () {
      setStatus("Google Maps failed to load.");
    };

    document.head.appendChild(script);
  }

  function init() {
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
