from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS so the frontend can talk to backend (local dev + cross-origin previews)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

client = None

# Built Matrix UI lands here during the Vercel build (see vercel.json)
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"

def get_openai_client() -> OpenAI:
    """Create the OpenAI client on demand so missing env vars don't crash import."""
    global client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    if client is None:
        client = OpenAI(api_key=api_key)
    return client

SYSTEM_PROMPT = (
    "You are a supportive mental coach. Respond in the same language as the user's message. "
    "Respond as if you are in the matrix as if you are the computer Neo is talking to."
)

class ChatRequest(BaseModel):
    message: str

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/chat")
def chat(request: ChatRequest):
    """Stream the model reply as plain text chunks so the UI can render live."""
    openai_client = get_openai_client()

    def token_stream():
        try:
            stream = openai_client.chat.completions.create(
                model="gpt-5",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": request.message},
                ],
                stream=True,
            )
            for chunk in stream:
                # Each chunk may include a small text delta — forward it immediately
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as e:
            # Surface mid-stream failures as readable terminal text
            yield f"\n[SIGNAL LOST] {str(e)}"

    return StreamingResponse(
        token_stream(),
        media_type="text/plain; charset=utf-8",
        headers={
            # Disable proxy buffering so tokens reach the browser ASAP
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

@app.get("/")
def root():
    """Serve the Matrix terminal UI when the static export is present."""
    index = PUBLIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"status": "ok", "detail": "frontend not built yet"}

# Next.js assets (/_next/*, favicon, etc.) — registered after API routes
if PUBLIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="frontend")
