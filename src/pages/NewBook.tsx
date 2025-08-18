import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchBookMeta } from '../lib/bookApis'

export default function NewBook() {
  const [isbn, setIsbn] = useState('')
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [publisher, setPublisher] = useState('')
  const [publishedYear, setPublishedYear] = useState<number | ''>('')
  const [cover, setCover] = useState('')
  const [source, setSource] = useState<'auto' | 'domestic' | 'foreign'>('auto')

  async function autoFill() {
    const meta = await fetchBookMeta(isbn, source)
    if (!meta) {
      alert('Unable to find metadata for the given ISBN.')
      return
    }
    setTitle(meta.title || '')
    setAuthors((meta.authors || []).join(', '))
    setPublisher(meta.publisher || '')
    setPublishedYear(meta.year || '')
    setCover(meta.cover || '')
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be logged in to register a book.')
      return
    }

    // 책을 저장하기 전에, 내 프로필이 존재하는지 확인하고 없으면 생성합니다.
    const { error: profileError } = await supabase.rpc('create_profile_if_not_exists')
    if (profileError) {
      console.error('Profile check failed:', profileError)
      alert('An error occurred while checking your profile: ' + profileError.message)
      return
    }

    const payload = {
      owner_id: user.id,
      isbn,
      title,
      authors: authors ? authors.split(',').map(s => s.trim()) : null,
      publisher,
      published_year: publishedYear || null,
      cover_url: cover,
      available: true,
    }

    const { error } = await supabase.from('books').insert(payload)

    if (error) {
      alert('Failed to save book: ' + error.message)
      return
    }

    alert('Book registered successfully.')
    setIsbn('')
    setTitle('')
    setAuthors('')
    setPublisher('')
    setPublishedYear('')
    setCover('')
  }

  return (
    <div className="container">
      <div className="card">
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div className="label">ISBN</div>
            <input
              className="input"
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              placeholder="e.g. 9788998139018"
            />
          </div>
          <div>
            <div className="label">Data source</div>
            <select className="input" value={source} onChange={e => setSource(e.target.value as any)}>
              <option value="auto">Auto (domestic priority)</option>
              <option value="domestic">Domestic priority</option>
              <option value="foreign">Foreign (Google Books)</option>
            </select>
          </div>
          <button className="btn" onClick={autoFill}>Auto&nbsp;Fill</button>
        </div>
      </div>

      <div className="section card">
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 2 }}>
            <div className="label">Title</div>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Authors&nbsp;(comma&nbsp;separated)</div>
            <input className="input" value={authors} onChange={e => setAuthors(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="label">Publisher</div>
            <input className="input" value={publisher} onChange={e => setPublisher(e.target.value)} />
          </div>
          <div style={{ width: 160 }}>
            <div className="label">Publication&nbsp;year</div>
            <input className="input" value={publishedYear} onChange={e => setPublishedYear(Number(e.target.value) || '')} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Cover&nbsp;URL</div>
            <input className="input" value={cover} onChange={e => setCover(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}
