from fastapi import FastAPI

app = FastAPI(
    title="VeriTrace API",
    description="Hallucination Detection and Verification Middleware",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "veritrace",
    }
