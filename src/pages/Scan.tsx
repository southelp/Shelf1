import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';

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
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
    streamRef.current = null;
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to access the camera.');
    }
  }, []);

  useEffect(() => {
    if (session) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [session, startCamera, stopCamera]);

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    setError(null);
    setCandidates([]);

    // 1. 캔버스에 현재 비디오 프레임 그리기
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas not available.');
      setIsCapturing(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // 2. 카메라를 먼저 정지
    stopCamera();
    
    // 3. 캡처된 이미지 URL을 상태에 설정하여 화면 전환
    setPreviewDataUrl(dataUrl);

    // 4. API 호출 시작
    setIsLoading(true);
    try {
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
      setError(e?.message || 'Error during recognition.');
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
  };

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
            onClick={captureAndRecognize}
            disabled={isCapturing || !isCameraReady}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/90 text-black font-medium shadow"
          >
            {isCapturing ? 'Processing...' : 'Capture'}
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
              disabled={isLoading}
            >
              Retake
            </button>
          </div>

          {isLoading && <div className="text-sm text-gray-600">Recognizing book information...</div>}
          {error && <div className="text-sm text-red-600">Error: {error}</div>}

          {!isLoading && !error && candidates.length === 0 && (
            <div className="text-sm text-gray-600">No results. Please retake and try again.</div>
          )}
          
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
                    {c.cover_url && <img src={c.cover_url} alt="" className="w-12 h-16 object-contain rounded bg-gray-100"/>}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.title || '(No Title)'}</div>
                      <div className="text-sm text-gray-600 truncate">{(c.authors || []).join(', ')}</div>
                      <div className="text-xs text-gray-500">
                        {c.publisher || ''}
                        {c.published_year ? ` · ${c.published_year}` : ''}
                        {c.source ? ` · ${c.source}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}