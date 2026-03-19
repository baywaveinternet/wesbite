// ============================
// BAYWAVE COVERAGE TRACKER
// ============================

// 🔑 PLACE YOUR API KEY HERE
const GOOGLE_MAPS_API_KEY = "AIzaSyDgTEGTV1gIXU9fg_F2FksafaQlWuiwYIs";

let map;
let marker;
let geocoder;

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "PLACE YOUR API KEY HERE") {
    document.getElementById("coverageStatus").innerHTML = "Add your Google API key.";
    return;
  }

  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    GOOGLE_MAPS_API_KEY +
    "&loading=async&libraries=marker";
  script.async = true;
  script.defer = true;
  script.onload = initMap;

  document.head.appendChild(script);
}

function initMap() {
  const mapEl = document.getElementById("map");
  const input = document.getElementById("address");
  const button = document.getElementById("checkBtn");
  const status = document.getElementById("coverageStatus");

  if (!mapEl || !input || !button || !status) return;

  const durban = { lat: -29.8587, lng: 31.0218 };

  map = new google.maps.Map(mapEl, {
    center: durban,
    zoom: 11,
    mapId: "DEMO_MAP_ID",
    mapTypeControl: false,
    streetViewControl: false
  });

  marker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
    position: durban
  });

  geocoder = new google.maps.Geocoder();

  button.addEventListener("click", function () {
    const address = input.value.trim();

    if (!address) {
      status.innerHTML = "Enter your address";
      return;
    }

    status.innerHTML = "Checking...";

    geocoder.geocode(
      { address: address, componentRestrictions: { country: "ZA" } },
      function (results, statusCode) {
        if (statusCode === "OK" && results[0]) {
          const loc = results[0].geometry.location;

          map.setCenter(loc);
          map.setZoom(17);

          marker.position = loc;
          marker.title = results[0].formatted_address;

          status.innerHTML =
            "✅ " + results[0].formatted_address;
        } else {
          status.innerHTML = "❌ Address not found";
        }
      }
    );
  });
}

// START
document.addEventListener("DOMContentLoaded", loadGoogleMaps);
