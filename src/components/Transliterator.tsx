'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

const GOOGLE_IT_URL = 'https://inputtools.google.com/request'

interface Props {
  onSelect: (teluguText: string) => void
}

export default function Transliterator({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setInput('')
      setSuggestions([])
    }
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const fetchSuggestions = useCallback(async (text: string) => {
    if (!text.trim()) { setSuggestions([]); return }
    setLoading(true)
    try {
      const res = await fetch(`${GOOGLE_IT_URL}?itc=te-t-i0-und&text=${encodeURIComponent(text)}&num=6`)
      const data = await res.json()
      if (data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
        setSuggestions(data[1][0][1])
      }
    } catch {
      setSuggestions([])
    }
    setLoading(false)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  function handleSelect(s: string) {
    onSelect(s)
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="px-2.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium border border-amber-200 transition-colors whitespace-nowrap"
        onClick={() => setOpen(!open)}
        title="Type English, get Telugu text"
      >
        en → తె
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 w-72 bg-white border rounded-xl shadow-lg p-3 animate-[fadeIn_0.2s_ease-out]">
          <p className="text-xs text-gray-400 mb-1.5">Type English → get Telugu suggestions</p>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
            placeholder="e.g. farhathunnissa"
            value={input}
            onChange={handleInput}
            autoFocus
          />
          {loading && (
            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              Transliterating...
            </div>
          )}
          {suggestions.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-amber-50 text-gray-800 transition-colors"
                    onClick={() => handleSelect(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && input.trim() && suggestions.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">No suggestions. Try typing more.</p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
