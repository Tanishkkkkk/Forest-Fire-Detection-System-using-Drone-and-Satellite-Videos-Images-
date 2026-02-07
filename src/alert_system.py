import time
import threading
import winsound

def _beep_alarm():
    for _ in range(3):
        winsound.Beep(1500, 500)
        time.sleep(0.2)

def send_alert(lat, lon):
    print("🚨 FIRE ALERT!")
    print(f"Location: {lat}, {lon}")

    # Run beep in background thread
    threading.Thread(target=_beep_alarm, daemon=True).start()

    # Log to file
    with open("fire_log.txt", "a") as f:
        f.write(f"{time.ctime()} - FIRE at {lat}, {lon}\n")
