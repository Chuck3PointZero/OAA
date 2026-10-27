"""probe_site: one GET of the configured page. Prints {"status": <int>, "ms": <int>} as JSON.

Enforces the tool's never rules: it takes no address argument (only the configured one), makes a
single GET, and does not follow a redirect to another host.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


class _SameHostOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).netloc != urllib.parse.urlparse(req.full_url).netloc:
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def main() -> int:
    url = os.environ.get("SITE_URL", "")
    if not url.startswith("https://"):
        print(json.dumps({"error": "SITE_URL must be set to an https address"}))
        return 2
    opener = urllib.request.build_opener(_SameHostOnly())
    started = time.monotonic()
    try:
        with opener.open(urllib.request.Request(url, method="GET"), timeout=20) as response:
            status = response.status
    except urllib.error.HTTPError as e:
        status = e.code
    except OSError:
        status = 0
    print(json.dumps({"status": status, "ms": int((time.monotonic() - started) * 1000)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
