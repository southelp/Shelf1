import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import Webcam from 'react-webcam';

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

  const [isScanMode, setIsScanMode] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Manual form state
  const [manualBook, setManualBook] = useState<BookCandidate>({
    title: '',
    authors: [],
    publisher: '',
    published_year: null,
    isbn: '',
    cover_url: ''
  });

  const handleRegister = async (book: BookCandidate) => {
    if (!user) return alert('You must be logged in to register a book.');
    if (!book.title) return alert('Title is required.');
    
    const confirmMessage = `Are you sure you want to register this book?\n\nTitle: ${book.title}`;
    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    setLoadingMessage('Registering book...');

    const { error: insertError } = await supabase.from('books').insert({
      owner_id: user.id,
      isbn: book.isbn,
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      published_year: book.published_year,
      cover_url: book.cover_url,
      available: true,
    });

    setIsLoading(false);

    if (insertError) {
      alert(`Failed to register book: ${insertError.message}`);
    } else {
      alert('Book registered successfully!');
      setCandidates([]);
      setSearchQuery('');
      setCapturedImage(null);
      setIsScanMode(false);
      setIsManualMode(false);
      setManualBook({ title: '', authors: [], publisher: '', published_year: null, isbn: '', cover_url: '' });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Searching...');
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
        throw new Error(`Search failed: ${errorText}`);
      }

      const { candidates: foundCandidates } = await searchResponse.json();
      setCandidates(foundCandidates ?? []);

      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`Book not found for query: '${searchQuery}'`);
      }

    } catch (e: any) {
      setError(e?.message || 'Failed to search for the book.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = useCallback(async () => {
    if (isLoading) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return setError("Could not get image from camera.");

    setCapturedImage(imageSrc);
    setIsLoading(true);
    setError(null);
    setCandidates([]);

    try {
      setLoadingMessage('Extracting book info from cover...');
      const geminiResponse = await fetch('/api/gemini-cover-to-book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageSrc }) });
      if (!geminiResponse.ok) throw new Error(`Failed to extract info: ${await geminiResponse.text()}`);
      const { title } = await geminiResponse.json();
      if (!title) throw new Error('Could not find a title on the book cover.');

      setLoadingMessage(`Searching for '${title}'...`);
      const searchResponse = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: title }),
      });
      if (!searchResponse.ok) throw new Error(`Search failed: ${await searchResponse.text()}`);
      const { candidates: foundCandidates } = await searchResponse.json();
      setCandidates(foundCandidates ?? []);
      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`Book not found for title: '${title}'`);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to recognize the book.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, webcamRef]);

  const handleRetake = () => {
    setCapturedImage(null);
    setCandidates([]);
    setError(null);
  };
  
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'authors') {
      setManualBook(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()) }));
    } else if (name === 'published_year') {
      setManualBook(prev => ({ ...prev, [name]: value ? Number(value) : null }));
    } else {
      setManualBook(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Register a Book</h1>

      {isScanMode ? (
        <div className="relative">
          <div className="absolute top-2 right-2 z-20">
            <button onClick={() => setIsScanMode(false)} className="btn btn-circle bg-gray-700 text-white hover:bg-gray-900">
              Close
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
              <button onClick={handleRetake} disabled={isLoading} className="btn btn-secondary">Retake</button>
            ) : (
              <button onClick={handleCapture} disabled={isLoading} className="btn btn-primary">Capture</button>
            )}
          </div>
        </div>
      ) : isManualMode ? (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setIsManualMode(false)} className="btn btn-ghost">Cancel</button>
          </div>
          <div className="space-y-3">
            <input type="text" name="title" placeholder="Title (required)" value={manualBook.title} onChange={handleManualInputChange} className="input input-bordered w-full" />
            <input type="text" name="authors" placeholder="Authors (comma-separated)" value={manualBook.authors?.join(', ')} onChange={handleManualInputChange} className="input input-bordered w-full" />
            <input type="text" name="publisher" placeholder="Publisher" value={manualBook.publisher} onChange={handleManualInputChange} className="input input-bordered w-full" />
            <input type="number" name="published_year" placeholder="Year" value={manualBook.published_year || ''} onChange={handleManualInputChange} className="input input-bordered w-full" />
            <input type="text" name="isbn" placeholder="ISBN" value={manualBook.isbn || ''} onChange={handleManualInputChange} className="input input-bordered w-full" />
            <input type="text" name="cover_url" placeholder="Cover Image URL" value={manualBook.cover_url} onChange={handleManualInputChange} className="input input-bordered w-full" />
          </div>
          <div className="mt-4 flex justify-center">
            <button onClick={() => handleRegister(manualBook)} disabled={isLoading || !manualBook.title} className="btn btn-primary">Register Manually</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by book title"
            className="input input-bordered w-full"
          />
          <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary">Search</button>
          <button onClick={() => setIsScanMode(true)} className="btn btn-outline">Camera</button>
          <button onClick={() => setIsManualMode(true)} className="btn btn-outline">Manual</button>
        </div>
      )}

      {error && <div className="mt-4 text-center text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}
      
      {!isLoading && candidates.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-center mb-3">Search Results (Click to register)</h2>
          <ul className="space-y-3">
            {candidates.map((c, idx) => (
              <li
                key={`${c.isbn || c.google_books_id || idx}`}
                onClick={() => handleRegister(c)}
                className="p-3 border rounded-lg flex items-center gap-4 cursor-pointer transition-all duration-200 bg-white hover:bg-gray-100"
              >
                <img src={c.cover_url || 'https://via.placeholder.com/80x120.png?text=No+Image'} alt={c.title} className="object-contain rounded bg-gray-100 flex-shrink-0" style={{ height: '120px', width: 'auto', marginRight: '16px' }} />
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-lg truncate">{c.title}</p>
                  <p className="text-gray-600 truncate">{c.authors?.join(', ') || 'No author info'}</p>
                  <p className="text-sm text-gray-500">{c.publisher || 'No publisher info'} ({c.published_year || 'N/A'})</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}