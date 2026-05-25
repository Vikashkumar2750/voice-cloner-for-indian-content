FROM python:3.12-slim

# Install system dependencies required for audio processing and TTS
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    espeak-ng \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirement files first for cache layering
COPY requirements.txt .

# Install Python dependencies
# Using --no-cache-dir to save space. We use --timeout to avoid network drops during huge pytorch downloads.
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 10000

# Start FastAPI using uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "10000"]
