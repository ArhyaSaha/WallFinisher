# Use specific Python 3.11.9 slim image as base
FROM python:3.11.9-slim

# Set work directory
WORKDIR /app

# Install system dependencies and clean up in same layer
RUN apt-get update && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/')" || exit 1

# Run the application
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]