// src/pages/Scan.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSessionContext } from '@supabase/auth-helpers-react'

type Candidate = {
  score: number
  isbn13?: string | null
  isbn10?: string | null
  title?: string
  authors?: string[]
  publisher?: string
  published_year?: number | null
  cover_url?: string | null
  google_books_id?: string
  source?: 'kakao' | 'google' | 'gemini'
}

type Draft = {
  isbn: string
  title: string
  authors: string[]
  publisher: string
  published_year: number | null
  cover_url: string | null
}

export default function Scan() {
  const { session, isLoading: authLoading } = useSessionContext()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  // ===== Camera control =====
  const stopCamera = useCallback(() => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop())
    } catch {}
    if (videoRef.current) {
      videoRef.current.pause()
      // @ts-ignore
      videoRef.current.srcObject = null
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    setStream(null)
  }, [stream])

  const startCamera = useCallback(async () => {
    // already live -> skip
    if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live')) {
      return
    }
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      if (videoRef.current) {
        // @ts-ignore
        videoRef.current.srcObject = s
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        await videoRef.current.play()
      }
      setStream(s)
    } catch (e: any) {
      setError(e?.message || 'Unable to access the camera.')
    }
  }, [stream])

  // Mount/Unmount
  useEffect(() => {
    if (!session) {
      stopCamera()
      return
    }
    startCamera()
    return () => stopCamera()
  }, [session, startCamera, stopCamera])

  // Visibility change
  useEffect(() => {
    if (!session) return
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        startCamera()
      } else {
        stopCamera()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [session, startCamera, stopCamera])

  // ===== Capture & Recognize =====
  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)
    setError(null)
    setCandidates([])
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const w = video.videoWidth
      const h = video.videoHeight
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not available.')
      ctx.drawImage(video, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPreviewDataUrl(dataUrl)

      stopCamera()

      setIsLoading(true)
      const r = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, maxCandidates: 5 }),
      })
      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        throw new Error(`Server error: ${r.status} ${txt}`)
      }
      const j = await r.json()
      setCandidates(Array.isArray(j?.candidates) ? j.candidates : [])
    } catch (e: any) {
      setError(e?.message || 'Error during capture/recognition.')
    } finally {
      setIsLoading(false)
      setIsCapturing(false)
    }
  }

  const retake = async () => {
    setPreviewDataUrl(null)
    setCandidates([])
    setError(null)
    await startCamera()
  }

  const selectCandidate = (c: Candidate) => {
    const draft: Draft = {
      isbn: c.isbn13 || c.isbn10 || '',
      title: c.title || '',
      authors: c.authors || [],
      publisher: c.publisher || '',
      published_year: c.published_year ?? null,
      cover_url: c.cover_url ?? null,
    }
    console.log('SELECTED DRAFT', draft)
  }

  // ===== Render =====
  if (authLoading) {
    return <div className="p-6 text-center text-gray-600">Checking login...</div>
  }

  if (!session) {
    return <div className="p-6 text-center text-gray-600">Please log in to use the camera.</div>
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">Book Cover Scan</h1>

      {!previewDataUrl ? (
        <div className="rounded-lg overflow-hidden bg-black relative">
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            autoPlay
            muted
          />
          <button
            onClick={capture}
            disabled={isCapturing || !stream}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/90 text-black font-medium shadow"
          >
            {isCapturing ? 'Capturing...' : 'Capture'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <img
            src={previewDataUrl}
            alt="preview"
            className="w-full rounded-lg shadow object-contain max-h-[70vh] bg-black"
          />
          <div className="flex gap-2">
            <button
              onClick={retake}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              Retake
            </button>
          </div>

          {isLoading && (
            <div className="text-sm text-gray-600">Recognizing book information...</div>
          )}
          {error && <div className="text-sm text-red-600">Error: {error}</div>}

          {!isLoading && candidates.length > 0 && (
            <div className="mt-2 space-y-2">
              <h2 className="text-base font-semibold">Recognition Results</h2>
              <ul className="space-y-2">
                {candidates.map((c, idx) => (
                  <li
                    key={`${c.isbn13 || c.isbn10 || c.title || ''}-${idx}`}
                    className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    onClick={() => selectCandidate(c)}
                  >
                    {c.cover_url ? (
                      <img
                        src={c.cover_url}
                        alt=""
                        className="w-12 h-16 object-contain rounded bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-gray-200 rounded" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.title || '(No Title)'}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {(c.authors || []).join(', ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.publisher || ''}
                        {c.published_year ? ` · ${c.published_year}` : ''}{' '}
                        {c.source ? ` · ${c.source}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isLoading && !error && candidates.length === 0 && (
            <div className="text-sm text-gray-600">
              No results. Please retake and try again.
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
