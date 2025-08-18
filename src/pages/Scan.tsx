// src/pages/Scan.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';

// --- (Candidate, Draft 타입 정의는 기존과 동일) ---
type Candidate = {
  score: number;
  isbn13?: string | null;
  isbn10?: string | null;
  title?: string;
  authors?: string[];
  publisher?: string;
  published_year?: number | null;
  cover_url?: string | null;
  google_books_id?: string;
  source?: 'kakao' | 'google' | 'gemini';
};

type Draft = {
  isbn: string;
  title: string;
  authors: string[];
  publisher: string;
  published_year: number | null;
  cover_url: string | null;
};


export default function Scan() {
  const { session, isLoading: authLoading } = useSessionContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // stream을 ref로 관리
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // ===== Camera control =====
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // 이미 실행 중이면 중복 실행 방지
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to access the camera.');
    }
  }, []);

  // Mount/Unmount 및 세션 변경 시 카메라 관리
  useEffect(() => {
    if (session) {
      startCamera();
    } else {
      stopCamera();
    }
    // 컴포넌트가 언마운트될 때 카메라 정리
    return () => {
      stopCamera();
    };
  }, [session, startCamera, stopCamera]);


  // ===== Capture & Recognize =====
  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    setError(null);
    setCandidates([]);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPreviewDataUrl(dataUrl);

      stopCamera();

      setIsLoading(true);
      const r = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, maxCandidates: 5 }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`Server error: ${r.status} ${txt}`);
      }
      const j = await r.json();
      setCandidates(Array.isArray(j?.candidates) ? j.candidates : []);
    } catch (e: any) {
      setError(e?.message || 'Error during capture/recognition.');
    } finally {
      setIsLoading(false);
      setIsCapturing(false);
    }
  };

  const retake = () => {
    setPreviewDataUrl(null);
    setCandidates([]);
    setError(null);
    startCamera();
  };

  const selectCandidate = (c: Candidate) => {
    const draft: Draft = {
      isbn: c.isbn13 || c.isbn10 || '',
      title: c.title || '',
      authors: c.authors || [],
      publisher: c.publisher || '',
      published_year: c.published_year ?? null,
      cover_url: c.cover_url ?? null,
    };
    console.log('SELECTED DRAFT', draft);
    // TODO: 이 데이터를 NewBook 페이지로 넘겨주는 로직 구현 필요
  };

  // ===== Render =====
  if (authLoading) {
    return <div className="p-6 text-center text-gray-600">Checking login...</div>;
  }

  if (!session) {
    return <div className="p-6 text-center text-gray-600">Please log in to use the camera.</div>;
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
            disabled={isCapturing || !isCameraReady}
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
  );
}