// src/pages/NewBook.tsx

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react'; // useUser 훅 임포트

// ... (BookCandidate 타입 정의는 동일)

export default function NewBook() {
  // ... (useState 상태 변수들은 동일)
  
  const user = useUser(); // supabase.auth.getUser() 대신 useUser 훅 사용

  // ... (handleSearch, selectCandidate, clearForm 함수는 동일)

  // 책 정보를 저장하는 함수
  async function save() {
    if (!user) { // 훅에서 가져온 user 객체로 로그인 여부 확인
      alert('You must be logged in to register a book.');
      return;
    }
    if (!title) {
      alert('Title is required.');
      return;
    }

    const payload = {
      owner_id: user.id, // user.id를 직접 사용
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
    // ... (JSX 렌더링 부분은 동일)
  );
}