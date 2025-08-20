import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import Webcam from 'react-webcam';

// BookCandidate type from previous version
type BookCandidate = {
  isbn?: string | null;
  title: string;
  authors?: string[];
  publisher?: string;
  published_year?: number | null;
  cover_url?: string;
};

const videoConstraints = {
  width: 720,
  height: 960,
  facingMode: "environment"
};

export default function NewBook() {
  const user = useUser();

  // --- State Management ---
  // Mode state
  const [isScanMode, setIsScanMode] = useState(false);

  // Common state
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Manual search state
  const [searchQuery, setSearchQuery] = useState('');

  // Scan state
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // --- Functions ---

  // Combined registration logic
  const handleRegister = async (book: BookCandidate) => {
    if (!user) return alert('로그인이 필요합니다.');
    
    const confirmMessage = `'${book.title}'\n이 책을 등록하시겠습니까?`;
    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    setLoadingMessage('등록 중...');

    const { error: insertError } = await supabase.from('books').insert({
      owner_id: user.id,
      isbn: book.isbn13 || book.isbn10,
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      published_year: book.published_year,
      cover_url: book.cover_url,
      available: true,
    });

    setIsLoading(false);

    if (insertError) {
      alert(`책 등록 실패: ${insertError.message}`);
    } else {
      alert('책이 성공적으로 등록되었습니다!');
      // Reset state after successful registration
      setCandidates([]);
      setSearchQuery('');
      setCapturedImage(null);
      setIsScanMode(false);
    }
  };

  // Manual search logic
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setLoadingMessage('검색 중...');
    setError(null);
    setCandidates([]);

    try {
      const searchResponse = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`책 검색 실패: ${errorText}`);
      }

      const { candidates: foundCandidates } = await searchResponse.json();
      setCandidates(foundCandidates ?? []);

      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`'${searchQuery}'에 대한 검색 결과가 없습니다.`);
      }

    } catch (e: any) {
      setError(e?.message || '책을 검색하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Scan logic
  const handleCapture = useCallback(async () => {
    if (isLoading) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return setError("카메라에서 이미지를 가져올 수 없습니다.");

    setCapturedImage(imageSrc);
    setIsLoading(true);
    setError(null);
    setCandidates([]);

    try {
      setLoadingMessage('표지에서 책 정보 추출 중...');
      const geminiResponse = await fetch('/api/gemini-cover-to-book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageSrc }) });
      if (!geminiResponse.ok) throw new Error(`책 정보 추출 실패: ${await geminiResponse.text()}`);
      const { title } = await geminiResponse.json();
      if (!title) throw new Error('표지에서 책 제목을 찾지 못했습니다.');

      setLoadingMessage(`'${title}' 검색 중...`);
      const searchResponse = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: title }),
      });
      if (!searchResponse.ok) throw new Error(`책 검색 실패: ${await searchResponse.text()}`);
      const { candidates: foundCandidates } = await searchResponse.json();
      setCandidates(foundCandidates ?? []);
      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`'${title}'에 대한 검색 결과가 없습니다.`);
      }
    } catch (e: any) {
      setError(e?.message || '책을 인식하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, webcamRef, setError, setCapturedImage, setIsLoading, setCandidates, setLoadingMessage]);

  const handleRetake = () => {
    setCapturedImage(null);
    setCandidates([]);
    setError(null);
  };

  // --- Render Logic ---
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">도서 등록</h1>

      {/* --- Mode-specific UI --- */}
      {isScanMode ? (
        // --- Scan Mode UI ---
        <div className="relative">
          <div className="absolute top-2 right-2 z-20">
            <button onClick={() => setIsScanMode(false)} className="btn btn-circle bg-gray-700 text-white hover:bg-gray-900">
              닫기
            </button>
          </div>
          <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden shadow-lg mx-auto" style={{maxWidth: '400px'}}>
            {capturedImage ? (
              <img src={capturedImage} alt="Captured book cover" className="w-full h-full object-contain" />
            ) : (
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={videoConstraints} className="w-full h-full object-contain" />
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-lg">{loadingMessage}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-4">
            {capturedImage ? (
              <button onClick={handleRetake} disabled={isLoading} className="btn btn-secondary">다시 찍기</button>
            ) : (
              <button onClick={handleCapture} disabled={isLoading} className="btn btn-primary"> 촬영하기</button>
            )}
          </div>
        </div>
      ) : (
        // --- Search Mode UI ---
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="책 제목으로 검색"
            className="input input-bordered w-full"
          />
          <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary">검색</button>
          <button onClick={() => setIsScanMode(true)} className="btn btn-square btn-outline">
            카메라
          </button>
        </div>
      )}

      {/* --- Common Results Area --- */}
      {error && <div className="mt-4 text-center text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}
      
      {!isLoading && candidates.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-center mb-3">검색 결과 (클릭하여 등록)</h2>
          <ul className="space-y-3">
            {candidates.map((c, idx) => (
              <li
                key={`${c.isbn13 || c.google_books_id || idx}`}
                onClick={() => handleRegister(c)}
                className="p-3 border rounded-lg flex items-center gap-4 cursor-pointer transition-all duration-200 bg-white hover:bg-gray-100"
              >
                <img src={c.cover_url || 'https://via.placeholder.com/80x120.png?text=No+Image'} alt={c.title} className="w-10 h-16 object-contain rounded bg-gray-100 flex-shrink-0" />
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