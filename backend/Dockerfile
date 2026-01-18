# Use official Python runtime as a parent image
FROM python:3.11-slim

# Install CA certificates for SSL
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8000

# Start the FastAPI server with Uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
