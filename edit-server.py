"""
Local server for the portfolio site that also supports saving inline edits
made in "Edit Mode" (see script.js) straight back to the .html files.

Run this instead of `python -m http.server` when you want to be able to
click "Edit Page" on the site and save your changes.

Usage:
    python edit-server.py
Then open:
    http://localhost:8080/index.html
"""

import http.server
import json
import os
import re
import socketserver

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

# Only these exact filenames may be overwritten. Keeps the save endpoint
# from being able to touch anything outside the known set of pages.
ALLOWED_FILENAME = re.compile(r"^[a-zA-Z0-9_-]+\.html$")


class EditHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_POST(self):
        if self.path != "/__save__":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body)
            filename = data.get("file", "")
            html = data.get("html", "")
        except Exception as e:
            self._json_response(400, {"ok": False, "error": f"Bad request: {e}"})
            return

        if not ALLOWED_FILENAME.match(filename):
            self._json_response(400, {"ok": False, "error": "Invalid filename"})
            return

        target = os.path.join(ROOT, filename)
        if not os.path.isfile(target):
            self._json_response(404, {"ok": False, "error": "File does not exist"})
            return

        if not html.strip():
            self._json_response(400, {"ok": False, "error": "Empty HTML, refusing to save"})
            return

        with open(target, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"Saved edits to {filename} ({len(html)} bytes)")
        self._json_response(200, {"ok": True})

    def _json_response(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Quieter logging: only show POST saves and errors, not every GET.
        if self.command == "POST" or "40" in str(args[1:2]):
            super().log_message(format, *args)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with ReusableTCPServer(("", PORT), EditHandler) as httpd:
        print(f"Serving {ROOT}")
        print(f"Open http://localhost:{PORT}/index.html")
        print("Edit Mode save endpoint is live. Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
