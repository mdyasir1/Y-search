'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { District, Assembly, PollingStation, VoterRecord } from '@/types'
import { fetchDistricts, fetchAssemblies, fetchPollingStations, fetchVotersExport } from '@/lib/api'
import { searchVoters, type SearchMode } from '@/lib/fuzzy-search'
import SplashScreen from '@/components/SplashScreen'
import Transliterator from '@/components/Transliterator'
import InfoModal from '@/components/InfoModal'
import ProgressCircle from '@/components/ProgressCircle'
import Footer from '@/components/Footer'

const MAX_BATCH = 10
const PAGE_SIZES = [50, 100, 200, 500]

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [districts, setDistricts] = useState<District[]>([])
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [stations, setStations] = useState<PollingStation[]>([])
  const [selDist, setSelDist] = useState('')
  const [selAc, setSelAc] = useState('')
  const [selPs, setSelPs] = useState('')
  const [loadingAc, setLoadingAc] = useState(false)
  const [loadingPs, setLoadingPs] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [voters, setVoters] = useState<VoterRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('exact')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<VoterRecord[]>([])
  const [searchTotal, setSearchTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(200)
  const [err, setErr] = useState('')
  const [exportInfo, setExportInfo] = useState('')
  const [fetchingAll, setFetchingAll] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{done: number; total: number; voters: number} | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const pendingFetchRef = useRef(false)
  const abortRef = useRef(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchDistricts().then((d) => setDistricts(d.districts)).catch(() => {})
  }, [])

  const handleDistChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const d = e.target.value
    setSelDist(d); setSelAc(''); setSelPs('')
    setAssemblies([]); setStations([]); setVoters([]); setSearchResults([]); setErr('')
    if (!d) return
    setLoadingAc(true)
    try { const data = await fetchAssemblies(d); setAssemblies(data.assemblies) }
    catch { setErr('Failed to load assemblies') }
    setLoadingAc(false)
  }, [])

  const handleAcChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const a = e.target.value
    setSelAc(a); setSelPs(''); setStations([]); setVoters([]); setSearchResults([]); setErr('')
    if (!a) return
    setLoadingPs(true)
    try { const data = await fetchPollingStations(selDist, a); setStations(data.stations) }
    catch { setErr('Failed to load polling stations') }
    setLoadingPs(false)
  }, [selDist])

  async function handleGetData() {
    if (!selDist || !selAc || !selPs) { setErr('Select district, AC, and polling station'); return }
    setLoadingData(true); setErr(''); setExportInfo(''); setVoters([]); setSearchResults([])
    try {
      const data = await fetchVotersExport(selDist, selAc, selPs)
      setVoters(data.voters)
      setExportInfo(`Loaded ${data.count} voters from PS ${selPs}`)
    } catch (e: any) { setErr(e.message || 'Failed to fetch voter data') }
    setLoadingData(false)
  }

  function handleFetchAllClick() {
    if (!selDist || !selAc || stations.length === 0) return
    // Start fetch FIRST
    pendingFetchRef.current = true
    startFetchAll()
    // Then show info modal (fetch continues in background)
    setTimeout(() => setShowInfoModal(true), 500)
  }

  function handleFetchAllOk() {
    setShowInfoModal(false)
    // fetch continues - no need to start anything
  }

  async function startFetchAll() {
    if (!selDist || !selAc || stations.length === 0) return
    abortRef.current = false; setFetchingAll(true); setFetchProgress(null)
    setErr(''); setVoters([]); setExportInfo(''); setSearchResults([])

    const allVoters: VoterRecord[] = []
    let done = 0; const total = stations.length
    setFetchProgress({ done: 0, total, voters: 0 })

    for (let i = 0; i < total; i += MAX_BATCH) {
      if (abortRef.current) break
      const batch = stations.slice(i, i + MAX_BATCH)
      const results = await Promise.allSettled(batch.map((s) => fetchVotersExport(selDist, selAc, s.id)))
      for (let j = 0; j < results.length; j++) {
        const r = results[j]
        if (r.status === 'fulfilled') allVoters.push(...r.value.voters)
        done++
        setFetchProgress({ done, total, voters: allVoters.length })
      }
    }
    setVoters(allVoters)
    setExportInfo(`Loaded ${allVoters.length.toLocaleString()} voters across ${done} polling stations`)
    setFetchingAll(false); setFetchProgress(null)
  }

  function doSearch(query: string, mode: SearchMode) {
    if (!query.trim() || voters.length === 0) {
      setSearchResults([]); setSearchTotal(0); setPage(1)
      return
    }
    setSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      const names = voters.map(v => v.name)
      const result = searchVoters(names, query.trim(), mode)
      const matched = result.indices.map(i => voters[i])
      setSearchResults(matched)
      setSearchTotal(result.total)
      setPage(1)
      setSearching(false)
    }, 50)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setSearchQuery(q)
    doSearch(q, searchMode)
  }

  function handleModeChange(mode: SearchMode) {
    setSearchMode(mode)
    if (searchQuery.trim()) doSearch(searchQuery, mode)
  }

  function handleTransliterateSelect(text: string) {
    setSearchQuery(text)
    doSearch(text, searchMode)
  }

  const totalPages = Math.max(1, Math.ceil(searchTotal / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const pageResults = searchResults.slice(startIdx, startIdx + pageSize)
  const stationNameMap: Record<string, string> = Object.fromEntries(stations.map(s => [s.id, s.nameTelugu]))

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (v >= 1 && v <= totalPages) setPage(v)
  }

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 animate-[fadeIn_0.5s_ease-out]">
      <header className="bg-gradient-to-r from-amber-900 to-amber-950 text-white px-3 py-4 md:px-6 md:py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src="/Y logo.png" alt="Y" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
          <div>
            <h1 className="text-base md:text-xl font-bold tracking-tight">
              <span className="text-amber-400">Y</span> Search
            </h1>
            <p className="text-amber-200/70 text-xs md:text-sm">
              SIR 2002 — AP Graduate MLC Constituency Rolls
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4">
        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
          <div>
            <label className="text-[10px] md:text-xs text-gray-500 mb-0.5 block font-medium">District</label>
            <select className="w-full border rounded-lg px-2.5 py-2 md:px-3 md:py-2.5 bg-white text-gray-800 text-xs md:text-sm" value={selDist} onChange={handleDistChange}>
              <option value="">Select District</option>
              {districts.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] md:text-xs text-gray-500 mb-0.5 block font-medium">Assembly</label>
            <select className="w-full border rounded-lg px-2.5 py-2 md:px-3 md:py-2.5 bg-white text-gray-800 text-xs md:text-sm disabled:opacity-50" value={selAc} onChange={handleAcChange} disabled={!selDist || loadingAc}>
              <option value="">{loadingAc ? 'Loading...' : selDist ? 'Select AC' : 'Select district first'}</option>
              {assemblies.map((a) => (<option key={a.id} value={a.id}>{a.nameTelugu}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] md:text-xs text-gray-500 mb-0.5 block font-medium">Polling Station</label>
            <select className="w-full border rounded-lg px-2.5 py-2 md:px-3 md:py-2.5 bg-white text-gray-800 text-xs md:text-sm disabled:opacity-50" value={selPs} onChange={(e) => setSelPs(e.target.value)} disabled={!selAc || loadingPs}>
              <option value="">{loadingPs ? 'Loading...' : selAc ? 'Select PS' : 'Select AC first'}</option>
              {stations.map((s) => (<option key={s.id} value={s.id}>{s.nameTelugu}</option>))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100" onClick={handleGetData} disabled={loadingData || !selPs || fetchingAll}>
            {loadingData ? 'Fetching...' : 'Get Data'}
          </button>
            {stations.length > 0 && (
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all active:scale-95 disabled:opacity-50" onClick={handleFetchAllClick} disabled={fetchingAll || loadingData}>
              {fetchingAll ? 'Fetching All...' : `Fetch All ${stations.length}`}
            </button>
          )}
          {fetchingAll && (
            <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-medium" onClick={() => { abortRef.current = true; pendingFetchRef.current = false }}>
              Abort
            </button>
          )}
          {exportInfo && (
            <span className="text-[10px] md:text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded-lg border border-green-200">{exportInfo}</span>
          )}
        </div>

        {fetchProgress && (
          <ProgressCircle done={fetchProgress.done} total={fetchProgress.total} voters={fetchProgress.voters} />
        )}
        {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-xs md:text-sm">{err}</div>}

        {/* Voter Data */}
        {voters.length > 0 && (
          <div className="space-y-2 md:space-y-3">
            {/* Search + Transliterator */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Search in Telugu..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {searching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <Transliterator onSelect={handleTransliterateSelect} />
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {([
                { value: 'exact' as SearchMode, label: 'Exact Match', tip: 'Only names that contain your exact search letters in order. Fast & precise.' },
                { value: 'related' as SearchMode, label: 'Related Words', tip: 'Names sharing common syllables or word parts, even when spelled differently.' },
                { value: 'spelling' as SearchMode, label: 'Close Spelling', tip: 'Accounts for Telugu letter substitutions (ప↔ఫ, త↔ద) and spelling mistakes in old records.' },
              ]).map((m) => (
                <button
                  key={m.value}
                  className={`group relative px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    searchMode === m.value
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={() => handleModeChange(m.value)}
                  title={m.tip}
                >
                  {m.label}
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                    {m.tip}
                  </span>
                </button>
              ))}
            </div>

            {/* Results */}
            {searchTotal > 0 && (
              <div>
                {/* Pagination top - responsive */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-[10px] md:text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span>Rows:</span>
                      <select className="border rounded px-1 py-0.5 text-[10px] md:text-xs" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                        {PAGE_SIZES.map(s => (<option key={s} value={s}>{s}</option>))}
                      </select>
                      <span className="text-gray-400 max-sm:hidden">({searchTotal.toLocaleString()} total)</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button className="px-1.5 md:px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-30 text-[10px] md:text-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
                      <span className="whitespace-nowrap">
                        <span className="sm:hidden">Pg </span>
                        <span className="max-sm:hidden">Page </span>
                        <input className="w-8 md:w-10 text-center border rounded mx-0.5 py-0.5 text-[10px] md:text-xs" type="number" min={1} max={totalPages} value={safePage} onChange={handlePageInput} />
                        <span className="max-sm:hidden"> of {totalPages}</span>
                      </span>
                      <button className="px-1.5 md:px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-30 text-[10px] md:text-xs" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next ›</button>
                    </div>
                  </div>
                )}

                {/* Table - horizontally scrollable */}
                <div className="bg-white border rounded-lg overflow-x-auto">
                  <table className="w-full text-[10px] md:text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50 border-b text-left text-[9px] md:text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">PS</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">#</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">Polling Station</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">Name</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">Relation</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">G</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap">Age</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap hidden md:table-cell">House</th>
                        <th className="px-1.5 md:px-3 py-1.5 md:py-2 whitespace-nowrap hidden md:table-cell">EPIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageResults.map((v, i) => (
                        <tr key={startIdx + i} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-400 font-mono">{v.part}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-400">{v.serial}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-600 text-[9px] md:text-xs truncate max-w-[100px] md:max-w-[150px]">{stationNameMap[v.part] || 'PS ' + v.part}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">{v.name}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-500 truncate max-w-[100px] md:max-w-none">
                            <span className="text-[8px] md:text-xs text-gray-400">{v.rel_type}</span> {v.rel_name}
                          </td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-500 text-center">{v.gender}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-500 text-center">{v.age}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-400 text-[9px] md:text-xs hidden md:table-cell truncate max-w-[100px]">{v.house}</td>
                          <td className="px-1.5 md:px-3 py-1 md:py-1.5 text-gray-400 text-[9px] md:text-xs font-mono hidden md:table-cell truncate max-w-[100px]">{v.epic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bottom */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2 text-[10px] md:text-xs text-gray-500">
                    <span className="text-gray-400 max-sm:w-full max-sm:text-center">
                      {startIdx + 1}–{Math.min(startIdx + pageSize, searchTotal)} of {searchTotal.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 mx-auto sm:mx-0">
                      <button className="px-1.5 md:px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-30 text-[10px] md:text-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
                      <span className="whitespace-nowrap">{safePage} / {totalPages}</span>
                      <button className="px-1.5 md:px-2 py-0.5 border rounded hover:bg-gray-100 disabled:opacity-30 text-[10px] md:text-xs" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next ›</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!searching && searchTotal === 0 && searchQuery.trim() && (
              <div className="text-center py-6 md:py-8 text-gray-400 text-xs md:text-sm space-y-1">
                <p>No matches for &ldquo;{searchQuery}&rdquo; in <strong>{searchMode === 'exact' ? 'Exact Match' : searchMode === 'related' ? 'Related Words' : 'Close Spelling'}</strong> mode.</p>
                <p>
                  Try{' '}
                  <button className="text-amber-600 underline font-medium" onClick={() => handleModeChange('exact')}>Exact Match</button>
                  {' · '}
                  <button className="text-amber-600 underline font-medium" onClick={() => handleModeChange('related')}>Related Words</button>
                  {' · '}
                  <button className="text-amber-600 underline font-medium" onClick={() => handleModeChange('spelling')}>Close Spelling</button>
                </p>
                {searchMode !== 'exact' && <p className="text-[10px] text-gray-300">Tip: Use the <strong>en → తె</strong> button to convert English names to Telugu.</p>}
              </div>
            )}
          </div>
        )}

        {voters.length === 0 && !loadingData && !fetchingAll && !err && (
          <div className="text-center py-10 md:py-14 text-gray-400">
            <div className="text-3xl md:text-4xl mb-3 opacity-30">📋</div>
            <p className="text-sm md:text-base">Select a polling station and click <strong>Get Data</strong></p>
            <p className="text-[10px] md:text-xs mt-1">Or use <strong>Fetch All</strong> to aggregate across all stations in the AC</p>
          </div>
        )}
      </main>

      <InfoModal show={showInfoModal} onOk={handleFetchAllOk} />

      <Footer />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
