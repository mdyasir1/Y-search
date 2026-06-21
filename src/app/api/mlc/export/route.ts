import { fetchPsExcel } from '@/lib/mlc-scraper'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { districtId, acId, psId } = await request.json()
  if (!districtId || !acId || !psId) {
    return Response.json({ error: 'districtId, acId, and psId are required' }, { status: 400 })
  }
  try {
    const { voters } = await fetchPsExcel(districtId, acId, psId)
    return Response.json({ voters, count: voters.length })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
