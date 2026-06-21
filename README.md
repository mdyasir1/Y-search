# Y Search — SIR 2002 Electoral Roll Portal

> **Live demo**: [https://y-search.vercel.app](https://y-search.vercel.app) (deploy your own — see below)

## Why This Project?

In **2002**, the Election Commission of India conducted a Special Intensive Revision (SIR) of electoral rolls for Andhra Pradesh. These rolls exist as **Excel files and PDFs** scattered across government portals — but there was **no unified, searchable, modern web interface** to access them.

If you wanted to find a voter by name, you had to:
1. Know their exact polling station number
2. Download the corresponding Excel file
3. Open it in a desktop app
4. Manually search through thousands of rows

**This was the problem.** Elderly citizens, small-town residents, and people helping their parents trace old records had no easy way to search.

## What We Built

**Y Search** is a modern web portal that:

- **Livescrapes** the official [CEO AP MLC Rolls portal](https://ceoaperolls.ap.gov.in/MLC_Rolls_Print_Final/MLCRollsNonPhotoGraduate_ABC.aspx) — zero hardcoded data files
- Replicates the entire District → Assembly Constituency → Polling Station hierarchy via ASP.NET postback automation
- Downloads and parses the Excel/XLSX export for every polling station in real-time
- Aggregates **hundreds of thousands of voter records** across an entire constituency
- Provides **three search modes** to handle messy 20-year-old data:

| Mode | What it does |
|---|---|
| **Exact Match** | Finds names containing your search text (substring) |
| **Related Words** | Fuzzy partial-match via [fuzzball](https://github.com/nickanc/jsfuzzball) — catches related name parts |
| **Close Spelling** | Levenshtein-based edit distance — catches spelling mistakes like `పరహదున్నీసా` → `ఫరహత్తున్నీసా` |

- **English → Telugu transliteration** powered by Google Input Tools API (type "farhathunnissa", get Telugu text)
- **Mobile-first responsive design** — works on the cheapest smartphones
- **Branded splash screen** with Y logo and smooth animations

## How It Works (Architecture)

```
User selects District → AC → PS in browser
         │
         ▼
  Next.js API Route (/api/mlc/*)
         │
         ▼
  MLC Scraper (src/lib/mlc-scraper.ts)
    ├── GET initial page → extract __VIEWSTATE, __EVENTVALIDATION, session cookie
    ├── POST with ddlAC=districtId → extract AC dropdown options
    ├── POST with ddlDist=acId → extract PS dropdown options  
    ├── POST with btnGetPollingStations → extract ControlID from ReportViewer
    └── GET Reserved.ReportViewerWebControl.axd?Format=EXCELOPENXML → download XLSX
         │
         ▼
  XLSX parsing (SheetJS/xlsx library)
    ├── Sheet1 = header/summary info
    └── Sheet2 = voter records (serial, house, name, rel_type, rel_name, gender, age, EPIC)
         │
         ▼
  Browser displays voter table with:
    ├── Three search modes (exact / related / spelling via fuzzball)
    ├── Pagination (50/100/200/500 rows, page navigation)
    └── Transliteration helper (English → Telugu)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Scraping | Native `fetch()` with ASP.NET postback automation |
| Excel Parsing | [SheetJS (xlsx)](https://sheetjs.com) |
| Fuzzy Search | [fuzzball](https://github.com/nickanc/jsfuzzball) (Levenshtein/partial ratio) |
| Transliteration | [Google Input Tools API](https://www.google.com/intl/sa/inputtools/try/) |
| Deployment | [Vercel](https://vercel.com) |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/y-search.git
cd y-search/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### To deploy on Vercel

```bash
npm install -g vercel
vercel
```

No environment variables needed — the app is fully self-contained.

## Project Structure

```
frontend/
├── public/
│   ├── Y logo.png          # Brand logo
│   ├── Y.ico               # Favicon (Y branding)
│   └── favicon_ico/        # Additional favicon sizes
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main UI — 3-tier dropdowns, search, pagination
│   │   ├── layout.tsx        # Root layout with branding metadata
│   │   ├── globals.css       # Tailwind import
│   │   └── api/
│   │       ├── mlc/          # API routes (districts, assemblies, polling-stations, export)
│   │       └── pdf/          # PDF proxy for ECI roll PDFs
│   ├── components/
│   │   ├── SplashScreen.tsx  # Animated splash with Y logo
│   │   ├── Transliterator.tsx # English → Telugu input tool
│   │   └── Footer.tsx        # "Built with care by Yasir"
│   └── lib/
│       ├── mlc-scraper.ts    # Core ASP.NET postback scraper + XLSX parser
│       ├── fuzzy-search.ts   # Three-mode fuzzy search engine
│       └── api.ts            # Client-side API helpers
```

## The Problem with 2002 SIR Data

The 2002 electoral rolls have several challenges that this project addresses:

1. **No online search** — data exists only as Excel/PDF exports from government portals
2. **Spelling inconsistencies** — names were typed manually, leading to variations like `ఫరహత్తున్నీసా` vs `పరహదున్నీసా`
3. **Telugu-only names** — the rolls are in Telugu script, making cross-script search impossible without transliteration
4. **Hundreds of files** — each constituency has 200+ polling station files; manual search is impractical
5. **ASP.NET legacy** — the source portal uses WebForms with viewstate/postback, making it non-trivial to automate

## What We Fixed

| Problem | Solution |
|---|---|
| Data scattered across 200+ Excel files per AC | Aggregation — fetch all, merge into one searchable index |
| No fuzzy/forgiving search | Three-mode search engine (exact / related / spelling) |
| Can't type Telugu on English keyboards | Google Input Tools transliteration |
| Source portal uses legacy ASP.NET postback | Automated viewstate extraction + cookie-preserving postback flow |
| Excel files are formatted reports, not clean data | XLSX parser extracts Sheet2 (voter list) while ignoring Sheet1 (header) |
| Large datasets (236K+ voters) slow down search | Client-side pagination with configurable page size |

## Acknowledgements

Built with care by **Yasir** as a portfolio project demonstrating:
- Full-stack Next.js development
- Reverse-engineering legacy web apps
- Fuzzy search algorithms and information retrieval
- Mobile-first responsive design
- API integration (Google Input Tools, govt portals)

**For freelance work, contact**: mdyasir4145@gmail.com

---

> Note: This project scrapes publicly available government data from the CEO Andhra Pradesh portal. No private or restricted data is accessed. The portal is freely accessible at [ceoaperolls.ap.gov.in](https://ceoaperolls.ap.gov.in).
