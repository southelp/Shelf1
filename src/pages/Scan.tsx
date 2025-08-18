import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';

// Candidate, Draft 타입 정의 (기존과 동일)
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

// 이미지 리사이징 헬퍼 함수
const resizeImage = (canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number): string => {
  const { width: originalWidth, height: originalHeight } = canvas;
  let width = originalWidth;
  let height = originalHeight;

  if (width > height) {
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }
  }

  const resizeCanvas = document.createElement('canvas');
  resizeCanvas.width = width;
  resizeCanvas.height = height;
  const ctx = resizeCanvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, width, height);
  return resizeCanvas.toDataURL('image/jpeg', 0.92);
};


export default function Scan() {
  const { session, isLoading: authLoading } = useSessionContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isFrozen, setIsFrozen] = useState(false); // 카메라가 정지되었는지 여부
  const [isLoading, setIsLoading] = useState(false); // API 호출 로딩 상태
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // 카메라 스트림을 완전히 종료하는 함수
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // 카메라를 시작하는 함수
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

  // 컴포넌트 마운트/언마운트 시 카메라 관리
  useEffect(() => {
    if (session) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [session, startCamera, stopCamera]);

  // 'Capture' 버튼 클릭 시 실행되는 함수
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCandidates([]);

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
    
    // 1. 현재 비디오 프레임을 캔버스에 그리고, 비디오를 일시정지
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.pause();
    setIsFrozen(true);

    // 2. 이미지를 리사이징하여 API로 전송
    const resizedDataUrl = resizeImage(canvas, 1024, 1024);

    try {
      const response = await fetch('/api/gemini-cover-to-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: resizedDataUrl, maxCandidates: 5 }),
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

  // 'Retake' 버튼 클릭 시 실행되는 함수
  const handleRetake = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
    setIsFrozen(false);
    setCandidates([]);
    setError(null);
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
    // TODO: 이 정보를 도서 등록 페이지로 전달하는 로직 구현
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

      {/* 카메라 뷰 및 버튼 컨테이너 */}
      <div className="rounded-lg overflow-hidden bg-black relative">
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          muted
        />
        {/* isFrozen 상태에 따라 버튼 기능과 텍스트 변경 */}
        {!isFrozen ? (
          <button
            onClick={handleCapture}
            disabled={isLoading}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-white/90 text-black font-medium shadow"
          >
            {isLoading ? 'Processing...' : 'Capture'}
          </button>
        ) : (
          <button
            onClick={handleRetake}
            disabled={isLoading}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-gray-200/90 text-black font-medium shadow"
          >
            Retake
          </button>
        )}
      </div>

      {/* 결과 표시 영역 */}
      <div className="mt-4 space-y-3">
        {isLoading && <div className="text-sm text-gray-600 text-center">Recognizing book information...</div>}
        {error && <div className="text-sm text-red-600 text-center">Error: {error}</div>}
        
        {isFrozen && !isLoading && candidates.length > 0 && (
          <div className="space-y-2">
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
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
