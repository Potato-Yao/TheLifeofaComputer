from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.endpoints import router
import os

app = FastAPI(title="Cyber Campus Survival Guide API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

# Check if we should serve static frontend files (Single Container Deployment)
dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    if os.path.exists(os.path.join(dist_path, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    if os.path.exists(os.path.join(dist_path, "pcs")):
        app.mount("/pcs", StaticFiles(directory=os.path.join(dist_path, "pcs")), name="pcs")
        
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return {"status": "error", "message": "API endpoint not found"}
        
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    def health_check():
        return {"status": "ok", "message": "Welcome to Cyber Campus!"}
