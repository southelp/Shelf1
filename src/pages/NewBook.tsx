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
  source?: string;
};

const videoConstraints = {
  width: 720,
  height: 960,
  facingMode: "environment"
};

// SearchResultsModal Component (within the same file)
const SearchResultsModal = ({ candidates, onRegister, onClose }: { candidates: BookCandidate[], onRegister: (book: BookCandidate) => void, onClose: () => void }) => {
  if (candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div 
        className="w-full max-w-4xl h-full max-h-[85vh] flex flex-col rounded-2xl shadow-lg"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium" style={{ color: '#1A1C1E' }}>Search Results</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-4 space-y-6">
          {Object.entries(
            candidates.reduce((acc, book) => {
              const source = book.source || 'unknown';
              if (!acc[source]) acc[source] = [];
              acc[source].push(book);
              return acc;
            }, {} as Record<string, BookCandidate[]>)
          ).map(([source, books]) => (
            <div key={source}>
              <h3 className="text-md font-semibold mb-3 capitalize" style={{ color: '#1A1C1E' }}>{source} API Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {books.map((c, idx) => (
                  <div key={`${c.isbn || idx}`} onClick={() => onRegister(c)} className="cursor-pointer p-3 border rounded-2xl hover:shadow-md flex flex-col items-center text-center gap-2 bg-white bg-opacity-80" style={{ borderColor: '#EEEEEC' }}>
                    <img src={c.cover_url || 'https://via.placeholder.com/100x150.png?text=No+Image'} alt={c.title} className="w-24 h-36 object-cover rounded-lg shadow-sm" />
                    <div className="flex-grow w-full mt-1">
                      <p className="font-medium text-sm line-clamp-2 leading-tight">{c.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">{c.authors?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function NewBook() {
  const user = useUser();

  const [isScanMode, setIsScanMode] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
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
      source_api: book.source,
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
      setError(e.message || 'Failed to search for the book.');
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
      setError(e.message || 'Failed to recognize the book.');
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, webcamRef]);

  const handleRetake = () => {
    setCapturedImage(null);
    setCandidates([]);
    setError(null);
  };

  const handleClearResults = () => {
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

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center gap-6 self-stretch py-20">
        <div className="text-lg font-medium">Please log in to add books</div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ backgroundColor: '#FCFCFC' }}>
      <div>
        <h1 className="text-2xl font-medium my-6 text-center" style={{ color: '#1A1C1E' }}>
          Add a Book
        </h1>
        <div className="max-w-md mx-auto">
          {isScanMode ? (
            <div className="max-w-md mx-auto">
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border shadow-lg" style={{ backgroundColor: '#000', borderColor: '#EEEEEC' }}>
                {capturedImage ? (
                  <img src={capturedImage} alt="Captured book cover" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={videoConstraints} className="w-full h-full object-contain" />
                    {/* Camera Guide Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-white text-lg mb-4">Align with the book title</p>
                      <div 
                        className="w-[85%] h-[30%] border-2 border-white rounded-2xl"
                        style={{
                          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                        }}
                      ></div>
                    </div>
                  </>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                    <p className="text-lg text-center">{loadingMessage}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-center gap-4">
                {capturedImage ? (
                  <button onClick={handleRetake} disabled={isLoading} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
                    Retake
                  </button>
                ) : (
                  <button onClick={handleCapture} disabled={isLoading} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm">
                    Capture
                  </button>
                )}
                <button onClick={() => setIsScanMode(false)} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
                  Close
                </button>
              </div>
            </div>
          ) : isManualMode ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-6 border rounded-2xl space-y-4" style={{ backgroundColor: '#F8F8F7', borderColor: '#EEEEEC' }}>
                <input type="text" name="title" placeholder="Title (required)" value={manualBook.title} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" name="authors" placeholder="Authors (comma-separated)" value={manualBook.authors?.join(', ')} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" name="publisher" placeholder="Publisher" value={manualBook.publisher} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="number" name="published_year" placeholder="Year" value={manualBook.published_year || ''} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" name="isbn" placeholder="ISBN" value={manualBook.isbn || ''} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" name="cover_url" placeholder="Cover Image URL" value={manualBook.cover_url} onChange={handleManualInputChange} className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={() => handleRegister(manualBook)} disabled={isLoading || !manualBook.title} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                  Register Manually
                </button>
                <button onClick={() => setIsManualMode(false)} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 border rounded-2xl space-y-4" style={{ backgroundColor: '#F8F8F7', borderColor: '#EEEEEC' }}>
                <input type="text" value={isbnQuery} onChange={e => setIsbnQuery(e.target.value)} placeholder="ISBN" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" value={titleQuery} onChange={e => setTitleQuery(e.target.value)} placeholder="Title" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" value={authorQuery} onChange={e => setAuthorQuery(e.target.value)} placeholder="Author" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
                <input type="text" value={publisherQuery} onChange={e => setPublisherQuery(e.target.value)} placeholder="Publisher" className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: '#EEEEEC' }} />
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={handleSearch} disabled={isLoading || (!titleQuery.trim() && !isbnQuery.trim())} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                  Search
                </button>
                <button onClick={() => setIsScanMode(true)} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
                  Camera
                </button>
                <button onClick={() => setIsManualMode(true)} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border rounded-xl hover:bg-gray-50 shadow-sm" style={{ borderColor: '#E1E1E1' }}>
                  Manual
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="max-w-md mx-auto text-center p-4 rounded-2xl border mt-6" style={{ color: '#991b1b', backgroundColor: '#fee2e2', borderColor: '#fecaca' }}>
          {error}
        </div>
      )}

      {/* Search Results Modal */}
      <SearchResultsModal 
        candidates={candidates}
        onRegister={handleRegister}
        onClose={handleClearResults}
      />
    </div>
  );
}