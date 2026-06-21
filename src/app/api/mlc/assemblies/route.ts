import { getAssemblies } from '@/lib/mlc-scraper'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const districtId = request.nextUrl.searchParams.get('districtId')
  if (!districtId) {
    return Response.json({ error: 'districtId is required' }, { status: 400 })
  }
  const assemblies = await getAssemblies(districtId)
  return Response.json({ assemblies })
}
