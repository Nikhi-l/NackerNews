"""FastAPI application entry point."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import auth, comments, posts, votes

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Nacker News API",
    description="A Hacker News clone API built with FastAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for consistent error format
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with consistent error format."""
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "details": str(exc) if settings.cors_origins == "*" else None,
            }
        },
    )


# Include routers
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(votes.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Nacker News API"}


@app.get("/health")
async def health():
    """Health check endpoint for Vercel."""
    return {"status": "healthy"}
