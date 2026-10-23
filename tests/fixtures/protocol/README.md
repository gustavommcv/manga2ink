# Protocol recordings

`mangaprep-v1-events.jsonl` was recorded on Windows from the published mangaprep 0.9.0 executable. The input was `Mangá São José - Vol.01.cbz`, containing two copies of `e2e/manga-folder/Manga2Ink E2E/Chapter 1/001.png` under `c001 - Chapter 1/001.png` and `002.png`, and a `note.txt` entry. The invocation used `--profile KV --format epub --json-events -o "Output Library"`.

Only the recording directory and path separators were normalized to `/fixtures/`; the tool version, messages, sizes and event order are the real response. The old mangapress recording remains unchanged and checks that the new adapter rejects the old tool identity.
