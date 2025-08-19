// src/pages/UserLibrary.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Book } from '../types';
import BookCard from '../components/BookCard';
import { useUser } from '@supabase/auth-helpers-react';

export default function UserLibrary() {
  const { userId } = useParams<{ userId: string }>();
  const [books, setBooks] = useState<Book[]>([]);
  const [ownerName, setOwnerName] = useState<string>('');
  const currentUser = useUser();

  useEffect(() => {
    if (!userId) return;

    // Fetch owner's name
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setOwnerName(data?.full_name || 'User');
      });

    // Fetch owner's books
    supabase
      .from('books')
      .select('*, profiles(full_name)')
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
          <BookCard key={b.id} book={b} activeLoan={null} userId={currentUser?.id} />
        ))}
      </div>
    </div>
  );
}