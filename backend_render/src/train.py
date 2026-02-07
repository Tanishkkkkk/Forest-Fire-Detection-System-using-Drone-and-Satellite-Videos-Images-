from ultralytics import YOLO

model = YOLO("yolov8s.pt")

model.train(
    data="data/fire.yaml",
    epochs=60,
    imgsz=512,        # smaller = faster
    batch=16,        # better GPU usage
    workers=0,       # safe on Windows
    cache=True,      # CRITICAL
    device=0,
    name="fire_stage1"
)
