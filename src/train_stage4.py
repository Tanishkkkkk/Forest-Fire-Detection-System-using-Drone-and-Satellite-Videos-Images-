from ultralytics import YOLO

def main():
    # Load Stage 3 best model
    model = YOLO("runs/detect/fire_stage35/weights/best.pt")

    # Stage 4 fine-tuning
    model.train(
        data="data_stage4/data.yaml",
        epochs=40,
        imgsz=960,
        batch=8,
        workers=4,
        device=0,              
        lr0=1e-4,
        lrf=1e-5,
        optimizer="AdamW",
        cos_lr=True,
        patience=15,
        augment=True,
        mosaic=0.3,
        mixup=0.1,
        close_mosaic=10,
        project="runs/detect",
        name="stage4",
        exist_ok=True
    )

    # Export model
    model.export(format="onnx")
    print("Stage 4 training complete.")

if __name__ == "__main__":
    main()
