#!/usr/bin/env bash
# Makes apt give up on a connection that has gone quiet, and try again, instead of waiting on it.
# On a runner the Ubuntu mirror sometimes stops answering in the middle of a download or of
# `apt-get update`. apt waits 120 seconds on a quiet connection and does not retry, so a step that
# takes 5 to 30 seconds has held a job for 8 minutes, or until its time limit. The setting is put in
# apt's configuration directory, so it also reaches the `apt-get` that
# `npx playwright install --with-deps` runs by itself.
#
# Usage: apt-give-up-on-stalls.sh   (Linux runners; uses sudo)
set -euo pipefail

sudo tee /etc/apt/apt.conf.d/99-give-up-on-stalls >/dev/null <<'EOF'
Acquire::Retries "3";
Acquire::http::Timeout "15";
Acquire::https::Timeout "15";
EOF

# Show what apt will use, so the log proves the setting took. A missing line fails the step.
apt-config dump | grep -E '^Acquire::(Retries|http::Timeout|https::Timeout) '
