// src/pages/UserLibrary.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Book } from '../types';
import BookCard from '../components/BookCard';
import { useUser } from '@supabase/auth-helpers-react';

// ✨ 이름 포맷팅 함수 추가
const formatOwnerName = (name: string | null | undefined) => {
  if (!name) return 'User';
  return name.replace('(School of Innovation Foundations)', '').trim();
};

export default function UserLibrary() {
  const { userId } = useParams<{ userId: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [ownerName, setOwnerName] = useState<string>('');
  const currentUser = useUser();

  useEffect(() => {
    if (!userId) return;

    // 소유자 이름 가져오기
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        // ✨ 가져온 이름에 포맷팅 함수 적용
        setOwnerName(formatOwnerName(data?.full_name));
      });

    // 소유자의 책 목록 가져오기
    supabase
      .from('books')
      .select('*, profiles(id, full_name)') // ✨ 여기도 명시적으로 선택
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBooks(data || []);
      });
  }, [userId]);

  return (
    <div className="container">
      <h2 className="section" style={{ fontSize: '24px', fontWeight: 'bold' }}>
        {ownerName}'s Library
      </h2>
      <div className="grid">
        {books.map(b => (
          // ✨ activeLoan을 null 대신 빈 객체로 전달하여 오류 방지
          <BookCard key={b.id} book={b} activeLoan={null} userId={currentUser?.id} />
        ))}
      </div>
    </div>
  );
}