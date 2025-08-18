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

  const [isFrozen, setIsFrozen] = useState(false); // 카메라가 정지되었는지 여부를 관리하는 상태
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
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [session, startCamera, stopCamera]);

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
    
    // 1. 캔버스에 현재 비디오 프레임을 그리고, 비디오를 일시정지합니다.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.pause();
    setIsFrozen(true);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

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
    // 비디오를 다시 재생하고 상태를 초기화합니다.
    if (videoRef.current) {
      videoRef.current.play();
    }
    setIsFrozen(false);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
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
        {/* 비디오 요소는 항상 화면에 표시됩니다. */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          muted
        />
        
        {/* isFrozen 상태에 따라 캡처 또는 재촬영 버튼을 표시합니다. */}
        {!isFrozen ? (
          <button
            onClick={handleCapture}
            disabled={isLoading}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/90 text-black font-medium shadow"
          >
            {isLoading ? 'Processing...' : 'Capture'}
          </button>
        ) : null}
      </div>

      {/* 카메라가 정지된 상태일 때만 결과 및 버튼을 표시합니다. */}
      {isFrozen && (
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
