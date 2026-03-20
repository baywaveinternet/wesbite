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
  let infoWindow = null;

  function injectStyles() {
    if (document.getElementById("baywave-coverage-styles")) return;

    const style = document.createElement("style");
    style.id = "baywave-coverage-styles";
    style.textContent = `
      #coverageStatus {
        margin-top: 18px;
      }

      .bw-status-card {
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        padding: 22px 22px 18px;
        background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
        box-shadow: 0 14px 38px rgba(16, 53, 87, 0.10);
        border: 1px solid rgba(25, 118, 210, 0.08);
        animation: bwFadeUp 0.6s ease;
        transform-origin: center;
      }

      .bw-status-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0) 20%,
          rgba(255,255,255,0.35) 50%,
          rgba(255,255,255,0) 80%
        );
        transform: translateX(-120%);
        animation: bwShine 2.2s ease 0.2s 1;
        pointer-events: none;
      }

      .bw-status-success {
        border-left: 6px solid #12b76a;
      }

      .bw-status-warning {
        border-left: 6px solid #f59e0b;
      }

      .bw-status-error {
        border-left: 6px solid #ef4444;
      }

      .bw-status-loading {
        border-left: 6px solid #2563eb;
      }

      .bw-top {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
      }

      .bw-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        flex-shrink: 0;
        box-shadow: 0 10px 25px rgba(0,0,0,0.10);
      }

      .bw-status-success .bw-icon {
        background: radial-gradient(circle at top left, #34d399, #059669);
        color: #fff;
        animation: bwPop 0.45s ease;
      }

      .bw-status-warning .bw-icon {
        background: radial-gradient(circle at top left, #fbbf24, #f59e0b);
        color: #fff;
        animation: bwPop 0.45s ease;
      }

      .bw-status-error .bw-icon {
        background: radial-gradient(circle at top left, #f87171, #dc2626);
        color: #fff;
        animation: bwPop 0.45s ease;
      }

      .bw-status-loading .bw-icon {
        background: radial-gradient(circle at top left, #60a5fa, #2563eb);
        color: #fff;
      }

      .bw-title-wrap {
        flex: 1;
        min-width: 0;
      }

      .bw-title {
        margin: 0;
        font-size: 1.35rem;
        line-height: 1.2;
        font-weight: 700;
        color: #153b5c;
      }

      .bw-subtitle {
        margin: 6px 0 0;
        color: #55748f;
        font-size: 0.98rem;
        line-height: 1.45;
      }

      .bw-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin: 16px 0 14px;
      }

      .bw-detail-box {
        background: rgba(255,255,255,0.78);
        border: 1px solid rgba(20, 82, 140, 0.08);
        border-radius: 16px;
        padding: 12px 14px;
        animation: bwFadeUp 0.5s ease;
      }

      .bw-label {
        display: block;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #6f8aa1;
        margin-bottom: 5px;
        font-weight: 600;
      }

      .bw-value {
        color: #16324a;
        font-weight: 700;
        font-size: 1rem;
        line-height: 1.4;
        word-break: break-word;
      }

      .bw-package-wrap {
        margin-top: 14px;
      }

      .bw-package-title {
        margin: 0 0 10px;
        color: #153b5c;
        font-size: 1rem;
        font-weight: 700;
      }

      .bw-package-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 10px;
      }

      .bw-package-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        background: rgba(255,255,255,0.88);
        border: 1px solid rgba(21, 59, 92, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 6px 18px rgba(21, 59, 92, 0.05);
        opacity: 0;
        transform: translateY(12px);
        animation: bwItemIn 0.45s ease forwards;
      }

      .bw-package-speed {
        font-weight: 700;
        color: #153b5c;
      }

      .bw-package-price {
        font-weight: 800;
        color: #0f766e;
      }

      .bw-disclaimer {
        margin-top: 14px;
        color: #5d7589;
        font-size: 0.95rem;
        line-height: 1.55;
        font-style: italic;
      }

      .bw-loading-line {
        position: relative;
        height: 10px;
        background: #e8f1fb;
        border-radius: 999px;
        overflow: hidden;
        margin-top: 16px;
      }

      .bw-loading-line::after {
        content: "";
        position: absolute;
        top: 0;
        left: -35%;
        width: 35%;
        height: 100%;
        background: linear-gradient(90deg, #60a5fa, #2563eb);
        border-radius: 999px;
        animation: bwLoading 1.2s infinite ease-in-out;
      }

      .bw-map-popup {
        min-width: 210px;
        max-width: 260px;
        padding: 6px 4px 4px;
        animation: bwCloudIn 0.35s ease;
      }

      .bw-map-popup-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 10px;
      }

      .bw-map-popup-success .bw-map-popup-badge {
        background: #e8fff3;
        color: #087443;
      }

      .bw-map-popup-warning .bw-map-popup-badge {
        background: #fff6df;
        color: #a16207;
      }

      .bw-map-popup-error .bw-map-popup-badge {
        background: #ffe9e9;
        color: #b42318;
      }

      .bw-map-popup-title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 800;
        line-height: 1.25;
        color: #16324a;
      }

      .bw-map-popup-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.45;
        color: #536b80;
      }

      .bw-map-popup-provider {
        margin-top: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #0f766e;
      }

      @keyframes bwFadeUp {
        from {
          opacity: 0;
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bwPop {
        0% {
          transform: scale(0.65);
          opacity: 0;
        }
        70% {
          transform: scale(1.08);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes bwShine {
        from {
          transform: translateX(-120%);
        }
        to {
          transform: translateX(120%);
        }
      }

      @keyframes bwItemIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bwLoading {
        0% {
          left: -35%;
        }
        100% {
          left: 100%;
        }
      }

      @keyframes bwCloudIn {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 640px) {
        .bw-status-card {
          padding: 18px 16px 16px;
          border-radius: 18px;
        }

        .bw-top {
          align-items: flex-start;
        }

        .bw-icon {
          width: 50px;
          height: 50px;
          font-size: 24px;
        }

        .bw-title {
          font-size: 1.15rem;
        }

        .bw-package-item {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderPackages(providerData) {
    if (!providerData || !providerData.packages || !providerData.packages.length) {
      return "";
    }

    return (
      '<div class="bw-package-wrap">' +
        '<div class="bw-package-title">Available Packages</div>' +
        '<ul class="bw-package-list">' +
          providerData.packages
            .map(function (p, index) {
              return (
                '<li class="bw-package-item" style="animation-delay:' + (0.18 + index * 0.08) + 's;">' +
                  '<span class="bw-package-speed">' + escapeHtml(p.speedMbps) + ' Mbps</span>' +
                  '<span class="bw-package-price">R' + escapeHtml(p.price) + '</span>' +
                '</li>'
              );
            })
            .join("") +
        "</ul>" +
      "</div>"
    );
  }

  function renderLoadingCard(message) {
    return (
      '<div class="bw-status-card bw-status-loading">' +
        '<div class="bw-top">' +
          '<div class="bw-icon">⌛</div>' +
          '<div class="bw-title-wrap">' +
            '<h3 class="bw-title">Checking coverage...</h3>' +
            '<p class="bw-subtitle">' + escapeHtml(message || "Please wait while we verify your address.") + '</p>' +
          "</div>" +
        "</div>" +
        '<div class="bw-loading-line"></div>' +
      "</div>"
    );
  }

  function renderErrorCard(title, subtitle, disclaimer) {
    return (
      '<div class="bw-status-card bw-status-error">' +
        '<div class="bw-top">' +
          '<div class="bw-icon">✕</div>' +
          '<div class="bw-title-wrap">' +
            '<h3 class="bw-title">' + escapeHtml(title) + '</h3>' +
            '<p class="bw-subtitle">' + escapeHtml(subtitle) + '</p>' +
          "</div>" +
        "</div>" +
        (disclaimer
          ? '<div class="bw-disclaimer">' + escapeHtml(disclaimer) + '</div>'
          : '') +
      '</div>'
    );
  }

  function renderWarningCard(title, subtitle, detailBoxes, disclaimer) {
    return (
      '<div class="bw-status-card bw-status-warning">' +
        '<div class="bw-top">' +
          '<div class="bw-icon">!</div>' +
          '<div class="bw-title-wrap">' +
            '<h3 class="bw-title">' + escapeHtml(title) + '</h3>' +
            '<p class="bw-subtitle">' + escapeHtml(subtitle) + '</p>' +
          '</div>' +
        '</div>' +
        (detailBoxes || '') +
        '<div class="bw-disclaimer">' + escapeHtml(disclaimer || '') + '</div>' +
      '</div>'
    );
  }

  function renderSuccessCard(address, area, provider, packagesHtml, disclaimer) {
    return (
      '<div class="bw-status-card bw-status-success">' +
        '<div class="bw-top">' +
          '<div class="bw-icon">✓</div>' +
          '<div class="bw-title-wrap">' +
            '<h3 class="bw-title">Great news — Fibre is available</h3>' +
            '<p class="bw-subtitle">We found coverage for your address and matching packages are ready to view.</p>' +
          '</div>' +
        '</div>' +

        '<div class="bw-details">' +
          '<div class="bw-detail-box">' +
            '<span class="bw-label">Address</span>' +
            '<div class="bw-value">' + escapeHtml(address) + '</div>' +
          '</div>' +

          '<div class="bw-detail-box">' +
            '<span class="bw-label">Matched Area</span>' +
            '<div class="bw-value">' +
              escapeHtml(area.suburb || "Unknown") +
              (area.postcode ? ' (' + escapeHtml(area.postcode) + ')' : '') +
            '</div>' +
          '</div>' +

          '<div class="bw-detail-box">' +
            '<span class="bw-label">Provider</span>' +
            '<div class="bw-value">' + escapeHtml(provider || "Not specified") + '</div>' +
          '</div>' +
        '</div>' +

        packagesHtml +
        '<div class="bw-disclaimer">' + escapeHtml(disclaimer) + '</div>' +
      '</div>'
    );
  }

  function clearMapPopup() {
    if (infoWindow) {
      infoWindow.close();
    }
  }

  function showMapPopup(type, title, message, provider, location) {
    if (!map || !window.google || !google.maps || !location) return;

    if (!infoWindow) {
      infoWindow = new google.maps.InfoWindow();
    }

    const popupClass =
      type === "success"
        ? "bw-map-popup-success"
        : type === "warning"
        ? "bw-map-popup-warning"
        : "bw-map-popup-error";

    const badge =
      type === "success"
        ? "✓ Coverage Found"
        : type === "warning"
        ? "! Area Found"
        : "✕ Not Found";

    const html =
      '<div class="bw-map-popup ' + popupClass + '">' +
        '<div class="bw-map-popup-badge">' + escapeHtml(badge) + '</div>' +
        '<div class="bw-map-popup-title">' + escapeHtml(title) + '</div>' +
        '<p class="bw-map-popup-text">' + escapeHtml(message) + '</p>' +
        (provider
          ? '<div class="bw-map-popup-provider">Provider: ' + escapeHtml(provider) + '</div>'
          : '') +
      '</div>';

    infoWindow.setContent(html);
    infoWindow.setPosition(location);
    infoWindow.open({
      map: map,
      anchor: marker
    });
  }

  function showResult(area, data, formattedAddress, loc, location) {
    const disclaimer =
      (data.meta && data.meta.disclaimer) ||
      "Coverage checker is a guide only and may not be 100% accurate. Final coverage will be confirmed during sign-up.";

    if (!area) {
      const detailBoxes =
        '<div class="bw-details">' +
          '<div class="bw-detail-box">' +
            '<span class="bw-label">Detected Suburb</span>' +
            '<div class="bw-value">' + escapeHtml(loc.suburb || "Unknown") + '</div>' +
          '</div>' +
          '<div class="bw-detail-box">' +
            '<span class="bw-label">Detected Postcode</span>' +
            '<div class="bw-value">' + escapeHtml(loc.postcode || "Unknown") + '</div>' +
          '</div>' +
          '<div class="bw-detail-box">' +
            '<span class="bw-label">Address Entered</span>' +
            '<div class="bw-value">' + escapeHtml(formattedAddress || "Unknown") + '</div>' +
          '</div>' +
        '</div>';

      setStatus(
        renderWarningCard(
          "Coverage not found",
          "We could not match this address to a covered fibre area yet.",
          detailBoxes,
          disclaimer
        )
      );

      showMapPopup(
        "error",
        "Coverage not found",
        "We could not confirm fibre coverage for this address yet.",
        "",
        location
      );
      return;
    }

    if (!area.fibreAvailable) {
      const detailBoxes =
        '<div class="bw-details">' +
          '<div class="bw-detail-box">' +
            '<span class="bw-label">Matched Area</span>' +
            '<div class="bw-value">' +
              escapeHtml(area.suburb || "Unknown") +
              (area.postcode ? ' (' + escapeHtml(area.postcode) + ')' : '') +
            '</div>' +
          '</div>' +
        '</div>';

      setStatus(
        renderWarningCard(
          "Fibre is not available yet",
          "This area was found, but fibre is not currently marked as available.",
          detailBoxes,
          disclaimer
        )
      );

      showMapPopup(
        "warning",
        "Area found",
        "This address matched an area, but fibre is not available there yet.",
        area.fno || "",
        location
      );
      return;
    }

    const provider = area.fno;
    const providerData = data.providers ? data.providers[provider] : null;
    const packages = renderPackages(providerData);

    setStatus(
      renderSuccessCard(
        formattedAddress,
        area,
        provider || "Not specified",
        packages,
        disclaimer
      )
    );

    showMapPopup(
      "success",
      "Fibre is available here",
      "Good news — this address has fibre coverage.",
      provider || "Not specified",
      location
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
    infoWindow = new google.maps.InfoWindow();

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
        clearMapPopup();
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

    clearMapPopup();

    if (!address) {
      setStatus(
        renderWarningCard(
          "Enter your address",
          "Please type your full address before checking coverage.",
          "",
          ""
        )
      );
      return;
    }

    if (!geocoder) {
      setStatus(
        renderErrorCard(
          "Map failed to load",
          "Please check your Google Maps API key and script setup.",
          ""
        )
      );
      return;
    }

    setStatus(renderLoadingCard("Please wait while we search for fibre coverage in your area."));

    try {
      const data = await loadCoverage();

      geocoder.geocode(
        {
          address: address,
          componentRestrictions: { country: "ZA" }
        },
        function (results, status) {
          if (status !== "OK" || !results || !results[0]) {
            setStatus(
              renderWarningCard(
                "Address not found",
                "Please try entering a fuller street address.",
                "",
                ""
              )
            );
            return;
          }

          const result = results[0];
          const location = result.geometry.location;
          const loc = extractLocationFromGeocode(result);
          const area = findMatch(data, loc.suburb, loc.postcode, loc.city);

          moveMap(location, result.formatted_address);
          showResult(area, data, result.formatted_address, loc, location);
        }
      );
    } catch (error) {
      console.error(error);
      setStatus(
        renderErrorCard(
          "Could not load coverage data",
          error.message || "An unknown error occurred.",
          ""
        )
      );
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
      setStatus(
        renderErrorCard(
          "Google Maps failed to load",
          "Please confirm your API key is correct and billing is enabled.",
          ""
        )
      );
    };

    document.head.appendChild(script);
  }

  function init() {
    injectStyles();
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
