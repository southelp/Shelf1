import { useState } from 'react'

export default function FilterBar({ onSearch, onlyAvailable, onToggleAvailable }:{ onSearch:(q:string)=>void; onlyAvailable:boolean; onToggleAvailable:(v:boolean)=>void }){
  const [q,setQ] = useState('')
  return (
    <div className="card row" style={{justifyContent:'space-between'}}>
      {/* Search input; pressing Enter will trigger the search callback */}
      <input
        className="input"
        placeholder="Search (title/author/ISBN)"
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch(q)}
      />
      <label className="row" style={{gap:6}}>
        <input type="checkbox" checked={onlyAvailable} onChange={e=>onToggleAvailable(e.target.checked)} />
        <span className="label">Only available</span>
      </label>
    </div>
  )
}
