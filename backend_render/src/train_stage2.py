from ultralytics import YOLO

# Load your Stage 1 trained model
model = YOLO("runs/detect/fire_stage113/weights/best.pt")

# Fine-tune with negative samples
model.train(
    data="data/fire.yaml",
    epochs=40,
    imgsz=512,
    batch=16,
    device=0,
    workers=0,
    name="fire_stage2"
)
