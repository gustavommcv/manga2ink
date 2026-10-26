#!/usr/bin/env bash
# Runs a command that installs from the Ubuntu mirror, and runs it again when it stalls.
#
# On a runner the mirror sometimes slows to a stop in the middle of a download. A step that takes
# 5 to 30 seconds has held a job for 8 minutes, or until its time limit, and apt's own timeout does
# not fire on a connection that is slow and not silent (a 15 second one was set and the stall came
# anyway). Every stall seen was on azure.archive.ubuntu.com, the first mirror of the runner's list.
#
# Each attempt gets a limit of its own and is killed when it passes it. A later attempt drops the
# azure mirror from the list, so apt falls back to the next one. What an attempt had downloaded
# stays in apt's cache.
#
# Usage: apt-retry.sh <seconds for each attempt> <command> [argument...]
#   apt-retry.sh 100 bash -c 'sudo apt-get update && sudo apt-get install --yes weston'
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "::error::Usage: apt-retry.sh <seconds for each attempt> <command> [argument...]"
  exit 1
fi

limit="$1"
shift
mirrors="/etc/apt/apt-mirrors.txt"

# A connection that goes silent is given up on, and retried, instead of waited on for 120 seconds.
# The file sorts after every other, so what the runner image sets does not override it.
sudo tee /etc/apt/apt.conf.d/zz-retry >/dev/null <<'EOF'
Acquire::Retries "3";
Acquire::http::Timeout "15";
Acquire::https::Timeout "15";
EOF
apt-config dump | grep -E '^Acquire::(Retries|http::Timeout|https::Timeout) '

for attempt in 1 2 3; do
  if [[ -f $mirrors ]]; then
    echo "Mirrors for attempt $attempt:"
    cat "$mirrors"
  fi
  if timeout --kill-after=10 "$limit" "$@"; then
    exit 0
  fi
  echo "::warning::Attempt $attempt of '$*' failed or did not finish in ${limit} seconds."
  # An attempt that was cut off may leave an apt-get running, or dpkg half-way: end both first.
  sudo pkill -x apt-get || true
  sudo dpkg --configure -a
  if [[ -f $mirrors ]] && grep -qv 'azure\.archive\.ubuntu\.com' "$mirrors"; then
    sudo sed -i '/azure\.archive\.ubuntu\.com/d' "$mirrors"
  fi
  sleep 5
done

echo "::error::The command did not succeed in 3 attempts of ${limit} seconds."
exit 1
