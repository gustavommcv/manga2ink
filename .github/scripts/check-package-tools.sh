#!/usr/bin/env bash
# Fails when a Linux package carries a bundled tool that is not the one pinned in
# toolchain.lock.json. The app hashes mangabind and mangapress on every start and refuses to
# convert when either differs, and a package builder that edits them (rpmbuild does by default)
# installs without a word and then keeps every conversion from starting. The package file itself
# is unpacked, so what is checked is what would be installed.
#
# Usage: check-package-tools.sh <package.deb|package.rpm|package.pkg.tar.zst>...
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "::error::No package given to check."
  exit 1
fi

failed=0
for package in "$@"; do
  unpacked=$(mktemp -d)
  case "$package" in
    *.deb) dpkg-deb -x "$package" "$unpacked" ;;
    *.rpm)
      absolute=$(realpath "$package")
      (cd "$unpacked" && rpm2cpio "$absolute" | cpio --extract --make-directories --quiet)
      ;;
    *.pkg.tar.zst) tar --zstd -xf "$package" -C "$unpacked" ;;
    *)
      echo "::error::Do not know how to unpack $package."
      exit 1
      ;;
  esac
  if ! node scripts/verify-package-tools.mjs "$package" "$unpacked"; then
    failed=1
  fi
  rm -rf "$unpacked"
done

exit "$failed"
