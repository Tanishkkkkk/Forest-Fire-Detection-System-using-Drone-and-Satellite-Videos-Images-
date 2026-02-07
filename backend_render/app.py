from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "Forest Fire Backend Running"

@app.route("/api/status")
def status():
    return jsonify({
        "system": "running",
        "satellite_points": 120,
        "local_points": 5
    })

@app.route("/api/local-fires")
def local_fires():
    return jsonify([])

@app.route("/api/firms")
def firms():
    return jsonify({"fires": []})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
