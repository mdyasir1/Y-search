import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const part = req.nextUrl.searchParams.get('part') || '1'
  const ac = '78'
  const pdfUrl = `https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01/${ac}/S01_${ac}_${part}.pdf`

  const resp = await fetch(pdfUrl)
  const blob = await resp.blob()

  return new Response(blob, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="S01_${ac}_${part}.pdf"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}