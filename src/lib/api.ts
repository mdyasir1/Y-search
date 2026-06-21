import type { District, Assembly, PollingStation, VoterRecord } from '@/types'

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `POST ${url} failed: ${res.status}`)
  }
  return res.json()
}

export function fetchDistricts(): Promise<{ districts: District[] }> {
  return getJSON('/api/mlc/districts')
}

export function fetchAssemblies(districtId: string): Promise<{ assemblies: Assembly[] }> {
  return getJSON(`/api/mlc/assemblies?districtId=${districtId}`)
}

export function fetchPollingStations(districtId: string, acId: string): Promise<{ stations: PollingStation[] }> {
  return getJSON(`/api/mlc/polling-stations?districtId=${districtId}&acId=${acId}`)
}

export function fetchVotersExport(districtId: string, acId: string, psId: string): Promise<{ voters: VoterRecord[]; count: number }> {
  return postJSON('/api/mlc/export', { districtId, acId, psId })
}
