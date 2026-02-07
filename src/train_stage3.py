from ultralytics import YOLO

model = YOLO("yolov8s.pt")

model.train(
    data="data_stage3/data.yaml",
    epochs=80,
    imgsz=640,
    batch=16,
    device=0,
    workers=0,
    cache=True,
    name="fire_stage35"
)
