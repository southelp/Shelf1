import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

// BookCandidate type from previous version
type BookCandidate = {
  isbn?: string | null;
  title: string;
  authors?: string[];
  publisher?: string;
  published_year?: number | null;
  cover_url?: string;
};

export default function NewBook() {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishedYear, setPublishedYear] = useState<number | ''>('');
  const [cover, setCover] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const user = useUser();

  // Search by title
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setCandidates([]);

    try {
      const response = await fetch('/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Search request failed.');
      }
      
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
      } else {
        setError('No books found for your query.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Select a candidate from search results
  const selectCandidate = (candidate: BookCandidate) => {
    setTitle(candidate.title || '');
    setAuthors((candidate.authors || []).join(', '));
    setPublisher(candidate.publisher || '');
    setPublishedYear(candidate.published_year || '');
    setCover(candidate.cover_url || '');
    setIsbn(candidate.isbn || '');
    setCandidates([]); // Hide candidates
    setSearchQuery(candidate.title); // Display selected title in search bar
  };

  // Clear the form
  const clearForm = () => {
    setIsbn('');
    setTitle('');
    setAuthors('');
    setPublisher('');
    setPublishedYear('');
    setCover('');
    setSearchQuery('');
    setCandidates([]);
    setError(null);
  };

  // Save book information
  async function save() {
    if (!user) {
      alert('You must be logged in to register a book.');
      return;
    }
    if (!title) {
      alert('Title is required.');
      return;
    }

    const payload = {
      owner_id: user.id,
      isbn: isbn || null,
      title,
      authors: authors ? authors.split(',').map(s => s.trim()) : null,
      publisher: publisher || null,
      published_year: publishedYear || null,
      cover_url: cover || null,
      available: true,
    };

    const { error } = await supabase.from('books').insert(payload);

    if (error) {
      alert('Failed to save book: ' + error.message);
    } else {
      alert('Book registered successfully.');
      clearForm();
    }
  }

  return (
    <div className="container">
      {/* Search Area */}
      <div className="card">
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div className="label">Search by Title</div>
            <input
              className="input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g., The Hitchhiker's Guide to the Galaxy"
            />
          </div>
          <button className="btn" onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {/* Display Search Results */}
        {error && <div className="label" style={{color: 'crimson', marginTop: 8}}>{error}</div>}
        {candidates.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px', borderTop: '1px solid #eee' }}>
            {candidates.map((c, index) => (
              <li key={index} onClick={() => selectCandidate(c)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <img src={c.cover_url} alt={c.title} style={{width: '40px', height: '60px', objectFit: 'contain', borderRadius: '4px'}}/>
                <div>
                  <div style={{fontWeight: 600}}>{c.title}</div>
                  <div className="label">{(c.authors || []).join(', ')}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Input Form */}
      <div className="section card">
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 2 }}>
            <div className="label">Title</div>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">ISBN</div>
            <input className="input" value={isbn} onChange={e => setIsbn(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="label">Authors (comma separated)</div>
            <input className="input" value={authors} onChange={e => setAuthors(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Publisher</div>
            <input className="input" value={publisher} onChange={e => setPublisher(e.target.value)} />
          </div>
          <div style={{ width: 160 }}>
            <div className="label">Publication year</div>
            <input className="input" type="number" value={publishedYear} onChange={e => setPublishedYear(Number(e.target.value) || '')} />
          </div>
        </div>
        <div style={{marginTop: 12}}>
            <div className="label">Cover URL</div>
            <input className="input" value={cover} onChange={e => setCover(e.target.value)} />
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={clearForm} style={{background: '#6b7280'}}>Clear</button>
          <button className="btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}