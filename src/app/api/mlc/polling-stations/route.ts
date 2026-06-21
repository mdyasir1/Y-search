import { getPollingStations } from '@/lib/mlc-scraper'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const districtId = request.nextUrl.searchParams.get('districtId')
  const acId = request.nextUrl.searchParams.get('acId')
  if (!districtId || !acId) {
    return Response.json({ error: 'districtId and acId are required' }, { status: 400 })
  }
  const stations = await getPollingStations(districtId, acId)
  return Response.json({ stations })
}
