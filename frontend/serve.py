#!/usr/bin/env python3
"""
Simple HTTP server to serve the Expo static web build
Serves the /app/frontend/dist directory on port 3000
"""
import http.server
import socketserver
import os
from pathlib import Path

PORT = 3000
DIRECTORY = "/app/frontend/dist"

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler that serves index.html for all routes (SPA support)"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        # Get the requested path
        path = self.translate_path(self.path)
        
        # If path doesn't exist and doesn't have an extension, serve index.html
        if not os.path.exists(path) and '.' not in os.path.basename(self.path):
            self.path = '/index.html'
        
        return super().do_GET()
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Log requests
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == "__main__":
    # Ensure directory exists
    if not os.path.exists(DIRECTORY):
        print(f"❌ Error: Directory {DIRECTORY} does not exist!")
        print(f"   Please run: cd /app/frontend && npx expo export -p web")
        exit(1)
    
    # Start server
    with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"✅ Frontend server started")
        print(f"   Serving: {DIRECTORY}")
        print(f"   Port: {PORT}")
        print(f"   URL: http://0.0.0.0:{PORT}")
        print(f"")
        print(f"   Press Ctrl+C to stop")
        print(f"")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")
