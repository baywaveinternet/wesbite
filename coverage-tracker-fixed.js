(function () {
  let map;
  let marker;
  let geocoder;
  let mapsLoadPromise;

  const DURBAN = { lat: -29.8587, lng: 31.0218 };

  function getEls() {
    return {
      mapEl: document.getElementById('map'),
      addressInput: document.getElementById('address'),
      checkBtn: document.getElementById('checkBtn'),
      statusEl: document.getElementById('coverageStatus')
    };
  }

  function setStatus(html) {
    const { statusEl } = getEls();
    if (statusEl) statusEl.innerHTML = html;
  }

  function getApiKey() {
    const meta = document.querySelector('meta[name="google-maps-api-key"]');
    return meta ? (meta.getAttribute('content') || '').trim() : '';
  }

  function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
    if (mapsLoadPromise) return mapsLoadPromise;

    const apiKey = getApiKey();
    if (!apiKey || apiKey === ''AIzaSyDgTEGTV1gIXU9fg_F2FksafaQlWuiwYIs' {
      return Promise.reject(new Error('Missing Google Maps API key'));
    }

    mapsLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-maps-loader="baywave"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google.maps), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')), { once: true });
        return;
      }

      const callbackName = '__baywaveInitGoogleMaps';
      window[callbackName] = function () {
        delete window[callbackName];
        resolve(window.google.maps);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'baywave';
      script.onerror = function () {
        delete window[callbackName];
        reject(new Error('Google Maps failed to load'));
      };
      document.head.appendChild(script);
    });

    return mapsLoadPromise;
  }

  function createMap() {
    const { mapEl } = getEls();
    if (!mapEl) return;

    map = new google.maps.Map(mapEl, {
      center: DURBAN,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    marker = new google.maps.Marker({
      map,
      position: DURBAN,
      title: 'Durban'
    });

    geocoder = new google.maps.Geocoder();
  }

  function updateMap(location, title) {
    if (!map || !marker) return;
    map.setCenter(location);
    map.setZoom(17);
    marker.setPosition(location);
    marker.setTitle(title || 'Selected address');
  }

  function normalizeProviderKey(address) {
    const text = (address || '').toLowerCase();
    const total = Array.from(text).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const keys = ['vuma', 'openserve', 'metrofibre', 'octotel'];
    return keys[total % keys.length];
  }

  const PROVIDERS = {
    vuma: {
      name: 'Vuma',
      packages: ['30 Mbps — R499 pm', '50 Mbps — R749 pm', '100 Mbps — R899 pm', '200 Mbps — R1189 pm']
    },
    openserve: {
      name: 'Openserve',
      packages: ['30 Mbps — R549 pm', '50 Mbps — R749 pm', '100 Mbps — R899 pm', '200 Mbps — R1185 pm']
    },
    metrofibre: {
      name: 'Metrofibre',
      packages: ['25 Mbps — R599 pm', '75 Mbps — R949 pm', '150 Mbps — R999 pm', '500 Mbps — R1285 pm']
    },
    octotel: {
      name: 'Octotel',
      packages: ['25 Mbps — R549 pm', '100 Mbps — R720 pm', '300 Mbps — R899 pm', '1000 Mbps — R1475 pm']
    }
  };

  function showCoverageResult(formattedAddress) {
    const providerKey = normalizeProviderKey(formattedAddress);
    const provider = PROVIDERS[providerKey];
    const packageLines = provider.packages.map(pkg => `<li>${pkg}</li>`).join('');
    setStatus(`
      ✅ <strong>Address found:</strong> ${formattedAddress}<br>
      📡 <strong>Likely provider:</strong> ${provider.name}<br>
      💡 <strong>Popular package options:</strong>
      <ul style="margin:8px 0 0 18px; padding:0;">${packageLines}</ul>
      <span style="display:block; margin-top:8px;">Coverage is a guide and must still be confirmed during sign-up.</span>
    `);
  }

  function lookupAddress() {
    const { addressInput } = getEls();
    const raw = addressInput ? addressInput.value.trim() : '';

    if (!raw) {
      setStatus('⚠️ Please enter your address first.');
      return;
    }

    if (!geocoder) {
      setStatus('⚠️ Map is still loading. Please try again in a moment.');
      return;
    }

    setStatus('Checking coverage for your address…');

    geocoder.geocode({ address: raw, componentRestrictions: { country: 'ZA' } }, function (results, status) {
      if (status === 'OK' && results && results[0]) {
        const result = results[0];
        updateMap(result.geometry.location, result.formatted_address);
        showCoverageResult(result.formatted_address);
      } else {
        setStatus('❌ We could not find that address. Please try a more specific Durban address.');
      }
    });
  }

  function bindEvents() {
    const { checkBtn, addressInput } = getEls();
    if (checkBtn) checkBtn.addEventListener('click', lookupAddress);
    if (addressInput) {
      addressInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          lookupAddress();
        }
      });
    }
  }

  function initCoverageTracker() {
    const { mapEl, checkBtn } = getEls();
    if (!mapEl || !checkBtn) return;

    bindEvents();

    loadGoogleMaps()
      .then(function () {
        createMap();
        setStatus('Enter your address and click <strong>Check My Coverage</strong>.');
      })
      .catch(function (error) {
        console.error(error);
        if (String(error && error.message).includes('Missing Google Maps API key')) {
          setStatus('⚠️ Add your real Google Maps API key in the <strong>google-maps-api-key</strong> meta tag before testing the map.');
        } else {
          setStatus('❌ Google Maps could not load. Check that your API key is valid, billing is enabled, and your domain is allowed in Google Cloud.');
        }
      });
  }

  document.addEventListener('DOMContentLoaded', initCoverageTracker);
})();
