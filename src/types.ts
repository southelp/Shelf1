export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
};

export type Book = {
  id: string;
  owner_id: string;
  isbn: string | null;
  title: string;
  authors: string[] | null;
  publisher: string | null;
  published_year: number | null;
  description: string | null;
  cover_url: string | null;
  available: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export type LoanStatus = 'reserved' | 'loaned' | 'returned' | 'cancelled';

export type Loan = {
  id: string;
  book_id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  requested_at: string;
  approved_at: string | null;
  due_at: string | null;
  returned_at: string | null;
  cancel_reason: string | null;
  books: Book | null;
  profiles: Profile | null;
};

export type BookWithLoan = Book & {
  loans: (Loan & { profiles: Profile | null })[] | null;
};
