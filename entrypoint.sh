#!/bin/sh
# Replace the __BACKEND_URL__ placeholder baked into the JS bundle at build time
# with the real URL supplied via the BACKEND_URL environment variable at runtime.
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

find /usr/share/nginx/html -name "*.js" \
  -exec sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" {} \;

exec nginx -g "daemon off;"
