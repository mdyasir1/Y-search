import { getDistricts } from '@/lib/mlc-scraper'

export const dynamic = 'force-dynamic'

export async function GET() {
  const districts = getDistricts()
  return Response.json({ districts })
}
