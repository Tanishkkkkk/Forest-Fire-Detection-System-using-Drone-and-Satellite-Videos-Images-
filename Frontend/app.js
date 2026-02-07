let map;
let fireMarkerCluster = null;
let localFireMarkers = [];
let lastUpdate = { status: 0, fires: 0, local: 0, analytics: 0 };

// ---------------- STATUS ----------------
async function loadStatus() {
  // Throttle: don't update more than once per 3 seconds
  const now = Date.now();
  if (now - lastUpdate.status < 3000) return;
  lastUpdate.status = now;

  try {
    const res = await fetch("https://forest-fire-detection-system-using-drone.onrender.com");
    const data = await res.json();

    const cardSat = document.getElementById("cardSat");
    const cardLocal = document.getElementById("cardLocal");
    const cardStatus = document.getElementById("cardStatus");

    if (cardSat) cardSat.innerText = "Satellite Fires: " + data.satellite_points;
    if (cardLocal) cardLocal.innerText = "Local Fires: " + data.local_points;
    if (cardStatus) cardStatus.innerText = "System: " + data.system;
  } catch (err) {
    console.error("Error loading status:", err);
  }
}

// ---------------- MAP WITH CLUSTERING ----------------
async function loadFirms() {
  // Only load once or when explicitly refreshed (satellite data doesn't change frequently)
  if (fireMarkerCluster) return;

  try {
    const res = await fetch("https://forest-fire-detection-system-using-drone.onrender.com");
    const data = await res.json();

    if (!map) {
      map = L.map("mapBox").setView([20, 78], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      console.log("Map initialized successfully");
    }

    // Clear existing cluster
    if (fireMarkerCluster) {
      map.removeLayer(fireMarkerCluster);
    }

    // Create marker cluster for performance
    fireMarkerCluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15,
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let sizeClass = count > 100 ? 'large' : (count > 50 ? 'medium' : 'small');
        return L.divIcon({
          html: `<div style="background:#ff3b3b;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #ff6666;box-shadow:0 2px 8px rgba(255,59,59,0.4);">${count}</div>`,
          className: 'fire-cluster-' + sizeClass,
          iconSize: L.point(40, 40)
        });
      }
    });

    // Add fires in batches to prevent UI freeze
    const fires = data.fires || [];
    const batchSize = 300;
    
    for (let i = 0; i < fires.length; i += batchSize) {
      const batch = fires.slice(i, i + batchSize);
      
      batch.forEach(f => {
        const marker = L.circleMarker([f.lat, f.lon], {
          radius: 5,
          color: "#ff3b3b",
          fillColor: "#ff6666",
          fillOpacity: 0.6,
          weight: 1,
          opacity: 0.8
        });
        
        marker.bindPopup(`
          <strong>🛰️ Satellite Detection</strong><br>
          Intensity: ${f.intensity || 'N/A'}<br>
          Location: ${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}
        `);
        
        fireMarkerCluster.addLayer(marker);
      });
      
      // Yield to browser between batches
      if (i + batchSize < fires.length) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    map.addLayer(fireMarkerCluster);
    console.log(`Loaded ${fires.length} satellite fires (clustered)`);
  } catch (err) {
    console.error("Error loading FIRMS data:", err);
  }
}

// ---------------- LOCAL FIRES (OPTIMIZED) ----------------
async function loadLocalFires() {
  // Throttle: max once per 2 seconds
  const now = Date.now();
  if (now - lastUpdate.local < 2000) return;
  lastUpdate.local = now;

  try {
    const res = await fetch("https://forest-fire-detection-system-using-drone.onrender.com");
    const data = await res.json();

    const box = document.getElementById("detectionsList");
    if (!box) return;

    // Clear old local fire markers
    localFireMarkers.forEach(m => map.removeLayer(m));
    localFireMarkers = [];

    // Only show latest 20 detections in list
    const recent = data.slice(-20);
    
    // Build HTML in one go (faster than concatenation)
    const htmlParts = recent.map((f, i) => `
      <div style="margin-bottom:10px;padding:8px;background:rgba(255,59,59,0.1);border-left:3px solid #ff3b3b;border-radius:4px;">
        🔥 Fire #${data.length - recent.length + i + 1}<br>
        📍 Lat: <b>${f.lat.toFixed(5)}</b>, Lon: <b>${f.lon.toFixed(5)}</b><br>
        🎯 Confidence: <b>${(f.confidence * 100).toFixed(1)}%</b><br>
        🕒 ${new Date(f.time).toLocaleTimeString()}
      </div>
    `);
    
    box.innerHTML = htmlParts.join('');

    // Add local fires to map
    if (map && data.length > 0) {
      const latest = data[data.length - 1];
      
      // Only pan to latest if it's new
      if (data.length > (window.lastLocalCount || 0)) {
        map.setView([latest.lat, latest.lon], 13, { animate: true, duration: 0.5 });
      }
      window.lastLocalCount = data.length;

      // Show recent local fires on map
      recent.forEach(f => {
        const marker = L.circleMarker([f.lat, f.lon], {
          radius: 8,
          color: "#ff1744",
          fillColor: "#ff3366",
          fillOpacity: 0.7,
          weight: 2,
          opacity: 1
        }).addTo(map);

        marker.bindPopup(`
          <strong>🔥 Local Detection</strong><br>
          Confidence: ${(f.confidence * 100).toFixed(1)}%<br>
          Time: ${new Date(f.time).toLocaleString()}<br>
          Location: ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}
        `);

        localFireMarkers.push(marker);
      });
    }

    console.log("LOCAL FIRES:", data.length);
  } catch (err) {
    console.error("Error loading local fires:", err);
  }
}

// ---------- ANALYTICS ----------
let trendData = [];

async function loadAnalytics() {
  // Throttle analytics
  const now = Date.now();
  if (now - lastUpdate.analytics < 4000) return;
  lastUpdate.analytics = now;

  try {
    const status = await fetch("https://forest-fire-detection-system-using-drone.onrender.com").then(r => r.json());
    const locals = await fetch("https://forest-fire-detection-system-using-drone.onrender.com").then(r => r.json());

    const totalSat = document.getElementById("totalSat");
    const totalLocal = document.getElementById("totalLocal");

    if (totalSat) totalSat.innerText = "Satellite Fires: " + status.satellite_points;
    if (totalLocal) totalLocal.innerText = "Local Detections: " + locals.length;

    trendData.push(locals.length);
    if (trendData.length > 10) trendData.shift();

    drawChart();
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}

function drawChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (window.trendChartObj) window.trendChartObj.destroy();

  window.trendChartObj = new Chart(ctx, {
    type: "line",
    data: {
      labels: trendData.map((_, i) => i + 1),
      datasets: [{
        label: "Local Fire Detections",
        data: trendData,
        borderColor: "#ff3b3b",
        backgroundColor: "rgba(255,59,59,0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function showAnalytics() {
  const grid = document.querySelector(".content-grid");
  const analytics = document.getElementById("analyticsPage");
  if (grid) grid.style.display = "none";
  if (analytics) analytics.style.display = "block";
  loadAnalytics();
}

function showLive() {
  const grid = document.querySelector(".content-grid");
  const analytics = document.getElementById("analyticsPage");
  if (grid) grid.style.display = "grid";
  if (analytics) analytics.style.display = "none";
}

function showMap() {
  const grid = document.querySelector(".content-grid");
  const analytics = document.getElementById("analyticsPage");
  if (grid) grid.style.display = "grid";
  if (analytics) analytics.style.display = "none";
  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

// ---------------- INITIALIZE & AUTO REFRESH ----------------
// Load initial data
loadStatus();
loadFirms();
loadLocalFires();

// Optimized refresh intervals (less aggressive)
setInterval(loadStatus, 4000);        // Status every 4s (was 5s)
setInterval(loadLocalFires, 3000);    // Local fires every 3s (was 2s)
setInterval(loadAnalytics, 6000);     // Analytics every 6s (was 5s)

// Optional: Refresh satellite fires every 5 minutes (they don't change often)
setInterval(() => {
  if (fireMarkerCluster && map) {
    map.removeLayer(fireMarkerCluster);
    fireMarkerCluster = null;
    loadFirms();
  }

}, 300000); // 5 minutes

