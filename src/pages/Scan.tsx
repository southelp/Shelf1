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

  // 디버깅을 위한 useEffect 추가
  useEffect(() => {
    console.log('capturedImage state:', capturedImage ? 'HAS_IMAGE' : 'NO_IMAGE');
  }, [capturedImage]);

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
      setError(e?.message || 'Unable to access the camera.');
    }
  }, [capturedImage]);

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
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    
    // 먼저 카메라를 중지하고 이미지를 설정
    stopCamera();
    
    // 비디오 요소 완전히 정리
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    // 상태 업데이트를 강제로 동기화
    setCapturedImage(dataUrl); 

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
    // 모든 상태를 명시적으로 초기화
    setCapturedImage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setIsLoading(false);
    
    // 비디오 요소 완전히 정리
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    // 약간의 지연 후 카메라 재시작
    setTimeout(() => {
      startCamera();
    }, 100);
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

      {/* 적절한 가로세로 비율을 가진 카메라/이미지 컨테이너 */}
      <div 
        className="rounded-lg overflow-hidden bg-black relative mx-auto"
        style={{
          width: '100%',
          maxWidth: '400px', // 최대 너비 제한
          aspectRatio: '3/4', // 책 표지에 적합한 3:4 비율
        }}
      >
        {capturedImage ? (
          // 캡처된 이미지만 표시
          <img 
            src={capturedImage} 
            alt="Captured book cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: 'black',
              display: 'block' // 명시적으로 블록 요소로 설정
            }}
          />
        ) : (
          // 비디오만 표시
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: 'black',
              display: 'block' // 명시적으로 블록 요소로 설정
            }}
            playsInline
            autoPlay
            muted
          />
        )}
        
        {/* 캡처 버튼 - 로딩 중일 때는 비활성화 */}
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
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
              minWidth: '120px'
            }}
            onMouseDown={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
              }
            }}
            onMouseUp={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
              }
            }}
          >
            {isLoading ? '처리 중...' : 'Capture'}
          </button>
        )}

        {/* 로딩 상태를 오버레이로 표시 */}
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
              justifyContent: 'center'
            }}
          >
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '16px 24px',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>책 정보를 분석 중입니다...</div>
              <div style={{ fontSize: '14px', color: '#666' }}>잠시만 기다려주세요</div>
            </div>
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
                      background: selectedCandidate?.title === c.title ? '#f3f0ff' : 'white'
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