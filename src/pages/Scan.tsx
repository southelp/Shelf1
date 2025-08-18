import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Candidate 타입 정의
type Candidate = {
  score: number;
  isbn13?: string | null;
  isbn10?: string | null;
  title: string;
  authors: string[];
  publisher?: string;
  published_year?: number | null;
  cover_url?: string | null;
};

export default function Scan() {
  const { session, isLoading: authLoading } = useSessionContext();
  const user = useUser();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 'live' (카메라) 또는 'preview' (캡처 이미지) 모드를 관리하는 상태
  const [viewMode, setViewMode] = useState<'live' | 'preview'>('live');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to access the camera.');
    }
  }, []);

  useEffect(() => {
    if (session) {
      // 'live' 모드일 때만 카메라를 시작합니다.
      if (viewMode === 'live') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    // 컴포넌트가 언마운트될 때 카메라를 확실히 종료합니다.
    return () => stopCamera();
  }, [session, viewMode, startCamera, stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to get canvas context.');
      setIsLoading(false);
      return;
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    // 1. 카메라 스트림을 완전히 중지합니다.
    stopCamera();
    // 2. 캡처된 이미지 URL을 설정하고, viewMode를 'preview'로 변경합니다.
    setPreviewDataUrl(dataUrl);
    setViewMode('preview');

    try {
      const response = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, maxCandidates: 5 }),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Server error: ${response.status} ${txt}`);
      }
      const result = await response.json();
      const foundCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
      setCandidates(foundCandidates);
      if (foundCandidates.length === 0) {
        setError("No book information found. Please try again.");
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to recognize the book.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    // 상태를 초기화하고 viewMode를 'live'로 변경하여 카메라를 다시 시작합니다.
    setPreviewDataUrl(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setViewMode('live');
  };

  const handleRegister = async () => {
    if (!selectedCandidate || !user) {
      alert("Please select a book to register.");
      return;
    }

    setIsLoading(true);
    const payload = {
      owner_id: user.id,
      isbn: selectedCandidate.isbn13 || selectedCandidate.isbn10 || null,
      title: selectedCandidate.title,
      authors: selectedCandidate.authors,
      publisher: selectedCandidate.publisher,
      published_year: selectedCandidate.published_year,
      cover_url: selectedCandidate.cover_url,
      available: true,
    };

    const { error } = await supabase.from('books').insert(payload);
    setIsLoading(false);

    if (error) {
      alert('Failed to register book: ' + error.message);
    } else {
      alert('Book registered successfully!');
      navigate('/my');
    }
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

      <div className="rounded-lg overflow-hidden bg-black relative">
        {/* viewMode에 따라 비디오 또는 이미지를 조건부로 렌더링합니다. */}
        {viewMode === 'live' ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              playsInline
              autoPlay
              muted
            />
            <button
              onClick={handleCapture}
              disabled={isLoading}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/90 text-black font-medium shadow"
            >
              {isLoading ? 'Processing...' : 'Capture'}
            </button>
          </>
        ) : (
          <img
            src={previewDataUrl!}
            alt="Captured book cover"
            className="w-full h-full object-contain bg-black"
          />
        )}
      </div>

      {/* 캡처 후(viewMode가 'preview'일 때)에만 결과 및 버튼을 표시합니다. */}
      {viewMode === 'preview' && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 justify-center">
            <button onClick={handleRetake} className="btn" style={{ background: '#6b7280' }} disabled={isLoading}>
              Retake
            </button>
            <button onClick={handleRegister} className="btn" disabled={!selectedCandidate || isLoading}>
              {isLoading ? 'Registering...' : 'Register Selected Book'}
            </button>
          </div>

          {isLoading && <div className="text-sm text-gray-600 text-center">Recognizing book information...</div>}
          {error && <div className="text-sm text-red-600 text-center">Error: {error}</div>}
          
          {!isLoading && candidates.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-center mb-2">Select a book to register:</h2>
              <ul className="space-y-2">
                {candidates.map((c, idx) => (
                  <li
                    key={`${c.isbn13 || c.title}-${idx}`}
                    className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                    style={{
                      outline: selectedCandidate?.title === c.title ? '2px solid var(--purple)' : 'none',
                      background: selectedCandidate?.title === c.title ? '#f3f0ff' : 'white'
                    }}
                    onClick={() => setSelectedCandidate(c)}
                  >
                    {c.cover_url && <img src={c.cover_url} alt={c.title} className="w-12 h-16 object-contain rounded bg-gray-100"/>}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-sm text-gray-600 truncate">{(c.authors || []).join(', ')}</div>
                      <div className="text-xs text-gray-500">
                        {c.publisher || ''}
                        {c.published_year ? ` · ${c.published_year}` : ''}
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
