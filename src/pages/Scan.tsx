// src/pages/Scan.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    if (stream) return;
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e: any) {
      setError(e?.message || '카메라에 접근할 수 없습니다.');
    }
  }, [stream]);

  useEffect(() => {
    if (session && isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [session, isCameraActive, startCamera, stopCamera]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) {
      setError('캔버스 컨텍스트를 가져올 수 없습니다.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    setCapturedImage(dataUrl);
    setIsCameraActive(false);
    setIsLoading(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(null);

    try {
      const response = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, maxCandidates: 5 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`서버 오류: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const foundCandidates = result?.candidates ?? [];
      setCandidates(foundCandidates);

      if (foundCandidates.length === 0) {
        setError("책 정보를 찾지 못했습니다. 다시 시도해 주세요.");
      }
    } catch (e: any) {
      setError(e?.message || '책을 인식하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleRetake = () => {
    setCapturedImage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setError(null);
    setIsLoading(false);
    setIsCameraActive(true);
  };

  const handleRegister = async () => {
    if (!selectedCandidate || !user) {
      alert("등록할 책을 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    const { error: insertError } = await supabase.from('books').insert({
      owner_id: user.id,
      isbn: selectedCandidate.isbn13 || selectedCandidate.isbn10,
      title: selectedCandidate.title,
      authors: selectedCandidate.authors,
      publisher: selectedCandidate.publisher,
      published_year: selectedCandidate.published_year,
      cover_url: selectedCandidate.cover_url,
      available: true,
    });
    setIsLoading(false);

    if (insertError) {
      alert(`책 등록 실패: ${insertError.message}`);
    } else {
      alert('책이 성공적으로 등록되었습니다!');
      navigate('/my');
    }
  };

  if (authLoading) {
    return <div className="p-6 text-center">로그인 확인 중...</div>;
  }

  if (!session) {
    return <div className="p-6 text-center">카메라를 사용하려면 로그인해 주세요.</div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">책 표지 스캔</h1>

      <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden shadow-lg mx-auto" style={{maxWidth: '400px'}}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" style={{ display: isCameraActive ? 'block' : 'none' }} />
        {capturedImage && <img src={capturedImage} alt="Captured book cover" className="w-full h-full object-contain" style={{ display: !isCameraActive ? 'block' : 'none' }} />}
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p className="text-lg">분석 중...</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-4">
        {isCameraActive ? (
          <button onClick={handleCapture} disabled={isLoading} className="btn btn-primary">
            {isLoading ? '처리 중...' : '촬영하기'}
          </button>
        ) : (
          <>
            <button onClick={handleRetake} disabled={isLoading} className="btn btn-secondary">
              다시 찍기
            </button>
            <button onClick={handleRegister} disabled={!selectedCandidate || isLoading} className="btn btn-primary">
              {isLoading ? '등록 중...' : '선택한 책 등록'}
            </button>
          </>
        )}
      </div>

      {error && <div className="mt-4 text-center text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}

      {!isLoading && candidates.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-center mb-3">등록할 책을 선택하세요:</h2>
          <ul className="space-y-3">
            {candidates.map((c, idx) => (
              <li
                key={`${c.isbn13 || c.google_books_id || idx}`}
                onClick={() => setSelectedCandidate(c)}
                className={`p-3 border rounded-lg flex items-center gap-4 cursor-pointer transition-all duration-200 ${selectedCandidate?.google_books_id === c.google_books_id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-50'}`}
              >
                <img src={c.cover_url || 'https://via.placeholder.com/80x120.png?text=No+Image'} alt={c.title} className="w-16 h-24 object-contain rounded bg-gray-100 flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-lg truncate">{c.title}</p>
                  <p className="text-gray-600 truncate">{c.authors?.join(', ') || '저자 정보 없음'}</p>
                  <p className="text-sm text-gray-500">{c.publisher || '출판사 정보 없음'} ({c.published_year || 'N/A'})</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}