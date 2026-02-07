const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ---------------- FIRMS LOAD ----------------
const FIRMS_DIR = path.join(__dirname, "firms_data");
const FIRMS_FILE = "fire_nrt_SV-C2_710922.csv";
let satelliteFires = [];

fs.createReadStream(path.join(FIRMS_DIR, FIRMS_FILE))
  .pipe(csv())
  .on("data", row => {
    const lat = Number(row.latitude || row.lat);
    const lon = Number(row.longitude || row.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      satelliteFires.push({
        lat,
        lon,
        intensity: Number(row.brightness || 300)
      });
    }
  })
  .on("end", () => {
    console.log("Loaded satellite fires:", satelliteFires.length);
  });

// ---------------- LOCAL YOLO ----------------
let localFires = [];

app.post("/api/local-fires", (req, res) => {
  // Mock confidence if missing (for demo purposes)
  const confidence = req.body.confidence !== undefined
    ? Number(req.body.confidence)
    : (Math.random() * 0.4 + 0.55); // Random 0.55 - 0.95

  localFires.push({
    ...req.body,
    confidence,
    time: new Date().toISOString()
  });
  res.json({ status: "ok" });
});

app.get("/api/local-fires", (req, res) => {
  res.json(localFires.slice(-500));
});

// ---------------- HYDRATE FROM LOG (ON START) ----------------
try {
  const logPath = path.join(__dirname, "../fire_log.txt");
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim().length > 0);
    const recent = lines.slice(-500); // Take last 500

    recent.forEach(line => {
      // Format: "Tue Feb  3 02:19:37 2026 - FIRE at 12.971678, 77.594545"
      const parts = line.split(" - FIRE at ");
      if (parts.length === 2) {
        const timeStr = parts[0];
        const coords = parts[1].split(",");
        if (coords.length === 2) {
          localFires.push({
            lat: parseFloat(coords[0]),
            lon: parseFloat(coords[1]),
            confidence: Math.random() * 0.4 + 0.55, // Simulate confidence for history
            time: new Date(timeStr).toISOString()
          });
        }
      }
    });
    console.log(`Hydrated ${localFires.length} fires from log.`);
  }
} catch (e) {
  console.error("Failed to load initial log:", e.message);
}

// ---------------- APIs ----------------
app.get("/api/status", (req, res) => {
  res.json({
    system: "active",
    satellite_points: satelliteFires.length,
    local_points: localFires.length,
    time: new Date().toISOString()
  });
});

app.get("/api/firms", (req, res) => {
  res.json({
    count: satelliteFires.length,
    fires: satelliteFires.slice(0, 2000)
  });
});

// ---------------- START ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
