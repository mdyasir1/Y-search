import { NextRequest, NextResponse } from 'next/server'

const ECI_PDF_BASE = 'https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01'

export async function GET(req: NextRequest) {
  const part = req.nextUrl.searchParams.get('part') || '1'
  const ac = '78'
  const pdfUrl = `${ECI_PDF_BASE}/${ac}/S01_${ac}_${part}.pdf`

  return NextResponse.json({ url: pdfUrl, ac, part, source: 'eci-live' })
}
