#!/usr/bin/env python3
"""Merge ALL provided chapter PDFs into ONE book + compress as hard as possible.

Order: Ganita Manjari Part 1 (iemh101-108) -> Part 2 (iemh201-206)
       -> Understanding Society (iest103,108,109,201-206)
Pipeline: pypdf merge -> ghostscript /ebook re-encode (falls back to /screen
if still huge) -> report. Output lands in public/ for the download link.
"""
import os, subprocess, sys
from pypdf import PdfReader, PdfWriter

ROOT = "/home/z/my-project"
UP = os.path.join(ROOT, "upload")
OUT_RAW = "/tmp/saathy_all_raw.pdf"
OUT_FINAL = os.path.join(ROOT, "public", "Saathy_All_Chapters.pdf")

ORDER = (
    [f"iemh10{i}.pdf" for i in range(1, 9)] +
    [f"iemh20{i}.pdf" for i in range(1, 7)] +
    ["iest103.pdf", "iest108.pdf", "iest109.pdf", "iest201.pdf", "iest202.pdf",
     "iest203.pdf", "iest204.pdf", "iest205.pdf", "iest206.pdf"]
)

def human(n): return f"{n/1048576:.1f} MB"

def merge():
    w = PdfWriter()
    for f in ORDER:
        p = os.path.join(UP, f)
        if not os.path.exists(p):
            print(f"!! missing {f}, skipped"); continue
        r = PdfReader(p)
        for pg in r.pages:
            w.add_page(pg)
        print(f"  + {f}: {len(r.pages)} pages")
    with open(OUT_RAW, "wb") as fh:
        w.write(fh)

def compress(profile):
    subprocess.run([
        "gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5",
        f"-dPDFSETTINGS=/{profile}", "-dNOPAUSE", "-dQUIET", "-dBATCH",
        "-dDetectDuplicateImages=true", "-dCompressFonts=true",
        "-dSubsetFonts=true", "-dAutoFilterColorImages=false",
        "-dColorImageFilter=/DCTEncode", "-dDownsampleColorImages=true",
        "-dColorImageResolution=110", "-dColorImageDownsampleType=/Bicubic",
        f"-sOutputFile={OUT_FINAL}", OUT_RAW,
    ], check=True)

if __name__ == "__main__":
    print("Merging", len(ORDER), "PDFs…")
    merge()
    raw = os.path.getsize(OUT_RAW)
    print(f"raw merged: {human(raw)}, pages: {len(PdfReader(OUT_RAW).pages)}")
    compress("ebook")
    size = os.path.getsize(OUT_FINAL)
    print(f"/ebook -> {human(size)}")
    if size > 30 * 1048576:
        print("still heavy, trying /screen…")
        compress("screen")
        size2 = os.path.getsize(OUT_FINAL)
        print(f"/screen -> {human(size2)}")
    final = os.path.getsize(OUT_FINAL)
    print(f"FINAL {OUT_FINAL} = {human(final)}  ({100 - final*100//raw}% smaller)")
