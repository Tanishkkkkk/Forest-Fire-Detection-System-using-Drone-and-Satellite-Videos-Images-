import time
import random

lat = 12.9716   # start somewhere (Bangalore-like)
lon = 77.5946

def get_gps():
    global lat, lon
    lat += random.uniform(-0.0001, 0.0001)
    lon += random.uniform(-0.0001, 0.0001)
    return round(lat, 6), round(lon, 6)

if __name__ == "__main__":
    while True:
        print(get_gps())
        time.sleep(1)
