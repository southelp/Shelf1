// src/pages/Scan.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

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
};

export default function Scan() {
  const { session, isLoading: authLoading } = useSessionContext();
  const user = useUser();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraOn(false);
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
        setIsCameraOn(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to access the camera.');
    }
  }, []);

  useEffect(() => {
    if (session && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [session, capturedImage, startCamera, stopCamera]);

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
    
    // 1. 상태를 업데이트하여 카메라 스트림을 멈추게 함
    setCapturedImage(dataUrl); 

    // 2. 비디오 요소의 표지를 캡처된 이미지로 설정
    if (videoRef.current) {
      videoRef.current.poster = dataUrl;
    }

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
    if (videoRef.current) {
      // 비디오 표지 제거
      videoRef.current.poster = '';
    }
    setCapturedImage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setIsLoading(false);
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

      <div 
        className="rounded-lg overflow-hidden bg-black relative mx-auto"
        style={{
          width: '100%',
          maxWidth: '400px',
          aspectRatio: '3/4',
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // 비디오 스트림이 꺼지면 poster 이미지가 보이게 됨
            backgroundColor: 'black' 
          }}
          playsInline
          autoPlay
          muted
        />
        
        {!capturedImage && (
          <button
            onClick={handleCapture}
            disabled={isLoading || !isCameraOn}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 20px',
              borderRadius: '50px',
              border: 'none',
              background: (isLoading || !isCameraOn) ? '#9ca3af' : 'rgba(255, 255, 255, 0.95)',
              color: isLoading ? '#fff' : '#000',
              fontWeight: '600',
              cursor: (isLoading || !isCameraOn) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Processing...' : 'Capture'}
          </button>
        )}

        {isLoading && capturedImage && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2em'
            }}
          >
            Analyzing...
          </div>
        )}
      </div>

      {capturedImage && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 justify-center">
            <button onClick={handleRetake} className="btn" style={{ background: '#6b7280' }} disabled={isLoading}>
              Retake
            </button>
            <button onClick={handleRegister} className="btn" disabled={!selectedCandidate || isLoading}>
              {isLoading ? 'Registering...' : 'Register Selected Book'}
            </button>
          </div>

          {error && <div className="text-sm text-red-600 text-center">Error: {error}</div>}
          
          {!isLoading && candidates.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-center mb-2">Select a book to register:</h2>
              <ul className="space-y-2">
                {candidates.map((c, idx) => (
                  <li
                    key={`${c.isbn13 || c.title}-${idx}`}
                    className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
                    style={{
                      outline: selectedCandidate?.title === c.title ? '2px solid var(--purple)' : 'none',
                    }}
                    onClick={() => setSelectedCandidate(c)}
                  >
                    {c.cover_url && (
                      <img 
                        src={c.cover_url} 
                        alt={c.title} 
                        className="w-12 h-16 object-contain rounded bg-gray-100 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-sm text-gray-600 truncate">{(c.authors || []).join(', ')}</div>
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