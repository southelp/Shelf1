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

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current || capturedImage) return;
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
      setError(e?.message || '카메라에 접근할 수 없습니다.');
    }
  }, [capturedImage]);

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
      setError('캔버스 컨텍스트를 가져오는데 실패했습니다.');
      setIsLoading(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setCapturedImage(dataUrl);

    try {
      const response = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, maxCandidates: 5 }),
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`서버 오류: ${response.status} ${txt}`);
      }
      const result = await response.json();
      const foundCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
      setCandidates(foundCandidates);
      if (foundCandidates.length === 0) {
        setError("책 정보를 찾지 못했습니다. 다시 시도해 주세요.");
      }
    } catch (e: any) {
      setError(e?.message || '책을 인식하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!selectedCandidate || !user) {
      alert("등록할 책을 선택해 주세요.");
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
      alert('책 등록 실패: ' + error.message);
    } else {
      alert('책이 성공적으로 등록되었습니다!');
      navigate('/my');
    }
  };

  if (authLoading) {
    return <div className="p-6 text-center text-gray-600">로그인 확인 중...</div>;
  }

  if (!session) {
    return <div className="p-6 text-center text-gray-600">카메라를 사용하려면 로그인해 주세요.</div>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">책 표지 스캔</h1>

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
            display: capturedImage ? 'none' : 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          playsInline
          autoPlay
          muted
        />
        <img
          src={capturedImage || ''}
          alt="촬영된 책 표지"
          style={{
            display: capturedImage ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
        
        {!capturedImage && (
          <button
            onClick={handleCapture}
            disabled={isLoading}
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 20px',
              borderRadius: '50px',
              border: 'none',
              background: isLoading ? '#9ca3af' : 'rgba(255, 255, 255, 0.95)',
              color: isLoading ? '#fff' : '#000',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              zIndex: 10,
            }}
          >
            {isLoading ? '처리 중...' : '촬영'}
          </button>
        )}

        {isLoading && capturedImage && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 20
            }}
          >
            분석 중...
          </div>
        )}
      </div>

      {capturedImage && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 justify-center">
            <button onClick={handleRetake} className="btn" style={{ background: '#6b7280' }} disabled={isLoading}>
              다시 찍기
            </button>
            <button onClick={handleRegister} className="btn" disabled={!selectedCandidate || isLoading}>
              {isLoading ? '등록 중...' : '선택한 책 등록'}
            </button>
          </div>

          {error && <div className="text-sm text-red-600 text-center">오류: {error}</div>}
          
          {!isLoading && candidates.length > 0 && (
             <div>
              <h2 className="text-base font-semibold text-center mb-2">등록할 책을 선택하세요:</h2>
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
