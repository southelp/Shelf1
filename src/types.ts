export type Profile = { id: string; email: string; full_name: string | null; role: 'user'|'admin' };
export type Book = {
  id: string; owner_id: string;
  isbn: string | null; title: string; authors: string[] | null;
  publisher: string | null; published_year: number | null; cover_url: string | null;
  available: boolean; created_at: string;
  profiles: { full_name: string | null } | null; // ✨ 이 부분을 다시 추가합니다.
};
export type LoanStatus = 'reserved' | 'loaned' | 'returned' | 'cancelled';
export type Loan = {
  id: string; book_id: string; owner_id: string; borrower_id: string; status: LoanStatus;
  requested_at: string; approved_at: string | null; due_at: string | null; returned_at: string | null; cancel_reason: string | null;
  books: Book | null; // ✨ 대출 정보에 책 상세 정보가 포함될 수 있도록 추가
};
  loans: (Loan & { profiles: Profile | null })[] | null;
};