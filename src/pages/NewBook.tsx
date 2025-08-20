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
  
  // Search query state
  const [titleQuery, setTitleQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [publisherQuery, setPublisherQuery] = useState('');
  const [isbnQuery, setIsbnQuery] = useState('');

  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
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
      setTitleQuery('');
      setAuthorQuery('');
      setPublisherQuery('');
      setIsbnQuery('');
      setCapturedImage(null);
      setIsScanMode(false);
      setIsManualMode(false);
      setManualBook({ title: '', authors: [], publisher: '', published_year: null, isbn: '', cover_url: '' });
    }
  };

  const handleSearch = async () => {
    if (!titleQuery.trim() && !isbnQuery.trim()) return alert('Title or ISBN is required for search.');
    setIsLoading(true);
    setLoadingMessage('Searching...');
    setError(null);
    setCandidates([]);

    try {
      const searchResponse = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: titleQuery,
          author: authorQuery,
          publisher: publisherQuery,
          isbn: isbnQuery
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Search failed: ${errorText}`);
      }

      const { candidates: foundCandidates } = await searchResponse.json();
      setCandidates(foundCandidates ?? []);

      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`Book not found for the given criteria.`);
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
    if (!imageSrc) {
      setError("Could not get image from camera.");
      return;
    }

    setCapturedImage(imageSrc);
    setIsLoading(true);
    setError(null);
    setCandidates([]);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Recognition timed out after 10 seconds. Please try again.')), 10000)
    );

    const recognitionPromise = (async () => {
      setLoadingMessage('Extracting book info from cover...');
      const geminiResponse = await fetch('/api/gemini-cover-to-book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imageSrc }) });
      if (!geminiResponse.ok) throw new Error(`Failed to extract info: ${await geminiResponse.text()}`);
      const { title } = await geminiResponse.json();
      if (!title) throw new Error('Could not find a title on the book cover.');

      setLoadingMessage(`Searching for '${title}'...`);
      const searchResponse = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title }),
      });
      if (!searchResponse.ok) throw new Error(`Search failed: ${await searchResponse.text()}`);
      const { candidates: foundCandidates } = await searchResponse.json();
      
      if (!foundCandidates || foundCandidates.length === 0) {
        setError(`Book not found for title: '${title}'`);
      }
      setCandidates(foundCandidates ?? []);
    })();

    try {
      await Promise.race([recognitionPromise, timeoutPromise]);
    } catch (e: any) {
      setError(e?.message || 'Failed to recognize the book.');
      setCandidates([]); // Clear any partial results
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
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Register a Book</h1>

      {isScanMode ? (
        <div className="max-w-md mx-auto">
          <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden shadow-lg">
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
              <button onClick={handleRetake} disabled={isLoading} className="g-button-gray">Retake</button>
            ) : (
              <button onClick={handleCapture} disabled={isLoading} className="g-button-blue">Capture</button>
            )}
            <button onClick={() => setIsScanMode(false)} className="g-button-gray">Close</button>
          </div>
        </div>
      ) : isManualMode ? (
        <div className="max-w-md mx-auto space-y-4">
          <input type="text" name="title" placeholder="Title (required)" value={manualBook.title} onChange={handleManualInputChange} className="g-search-input" />
          <input type="text" name="authors" placeholder="Authors (comma-separated)" value={manualBook.authors?.join(', ')} onChange={handleManualInputChange} className="g-search-input" />
          <input type="text" name="publisher" placeholder="Publisher" value={manualBook.publisher} onChange={handleManualInputChange} className="g-search-input" />
          <input type="number" name="published_year" placeholder="Year" value={manualBook.published_year || ''} onChange={handleManualInputChange} className="g-search-input" />
          <input type="text" name="isbn" placeholder="ISBN" value={manualBook.isbn || ''} onChange={handleManualInputChange} className="g-search-input" />
          <input type="text" name="cover_url" placeholder="Cover Image URL" value={manualBook.cover_url} onChange={handleManualInputChange} className="g-search-input" />
          <div className="flex justify-center gap-4">
            <button onClick={() => handleRegister(manualBook)} disabled={isLoading || !manualBook.title} className="g-button-blue">Register Manually</button>
            <button onClick={() => setIsManualMode(false)} className="g-button-gray">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-4">
          <input type="text" value={isbnQuery} onChange={e => setIsbnQuery(e.target.value)} placeholder="ISBN" className="g-search-input" />
          <input type="text" value={titleQuery} onChange={e => setTitleQuery(e.target.value)} placeholder="Title" className="g-search-input" />
          <input type="text" value={authorQuery} onChange={e => setAuthorQuery(e.target.value)} placeholder="Author" className="g-search-input" />
          <input type="text" value={publisherQuery} onChange={e => setPublisherQuery(e.target.value)} placeholder="Publisher" className="g-search-input" />
          <div className="flex items-center justify-center gap-4 pt-2">
            <button onClick={handleSearch} disabled={isLoading || (!titleQuery.trim() && !isbnQuery.trim())} className="g-button-blue">Search</button>
            <button onClick={() => setIsScanMode(true)} className="g-button-gray">Camera</button>
            <button onClick={() => setIsManualMode(true)} className="g-button-gray">Manual</button>
          </div>
        </div>
      )}

      {error && <div className="mt-6 text-center text-red-600 bg-red-100 p-3 rounded-lg max-w-md mx-auto">{error}</div>}
      
      {!isLoading && candidates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-center mb-4">Search Results</h2>
          <ul className="space-y-4">
            {candidates.map((c, idx) => (
              <li key={`${c.isbn || idx}`} onClick={() => handleRegister(c)} className="g-card flex items-center gap-4 cursor-pointer">
                <img src={c.cover_url || 'https://via.placeholder.com/80x120.png?text=No+Image'} alt={c.title} className="object-contain rounded bg-gray-100 flex-shrink-0" style={{ height: '120px', width: '80px' }} />
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