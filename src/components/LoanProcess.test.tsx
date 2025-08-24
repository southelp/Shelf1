import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookDetailsPanel from './BookDetailsPanel';
import LoanRequestCard from './LoanRequestCard';
import * as supabaseClient from '../lib/supabaseClient';
import { Book, Loan, Profile } from '../types';

// Mocking the Supabase client's function invocation method
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Loan Process', () => {
  const mockInvoke = supabaseClient.supabase.functions.invoke as vi.Mock;

  // Mock user and book data
  const ownerProfile: Profile = { id: 'user-a-owner', full_name: 'Owner A' , email: 'owner@test.com', role: 'user'};
  const borrowerProfile: Profile = { id: 'user-b-borrower', full_name: 'Borrower B' , email: 'borrower@test.com', role: 'user'};

  const mockBook: Book = {
    id: 'book-1',
    owner_id: ownerProfile.id!,
    title: 'A Book to Borrow',
    available: true,
    created_at: new Date().toISOString(),
    authors: ['An Author'],
    cover_url: null,
    isbn: null,
    profiles: ownerProfile, // The book owner's profile
    publisher: null,
    published_year: null,
    source_api: undefined,
    description: 'A book to borrow',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock browser alerts and confirms for non-interactive testing
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    // Default mock for a successful API call
    mockInvoke.mockResolvedValue({ error: null, data: { ok: true } });
  });

  describe('As a Borrower', () => {
    it('should be able to request a loan for a book', async () => {
      render(
        <MemoryRouter>
          <BookDetailsPanel
            book={mockBook}
            activeLoan={null}
            userId={borrowerProfile.id}
            onClose={() => {}}
            onLoanRequested={() => {}}
          />
        </MemoryRouter>
      );

      const requestButton = screen.getByRole('button', { name: /request loan/i });
      fireEvent.click(requestButton);

      // Verify that the correct Supabase function was called
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('request-loan', {
          body: { book_id: mockBook.id },
        });
      });

      // Verify that a success alert was shown to the user
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Loan requested successfully! The owner has been notified.');
      });
    });

    it('should not allow a user to request a book that is already reserved', () => {
      const mockActiveLoan: Loan = {
        id: 'loan-active',
        book_id: mockBook.id,
        borrower_id: 'another-user-id',
        owner_id: ownerProfile.id!,
        status: 'reserved',
        requested_at: new Date().toISOString(),
        approved_at: null,
        due_at: null,
        returned_at: null,
        cancel_reason: null,
        books: null,
        profiles: null,
      };

      render(
        <MemoryRouter>
          <BookDetailsPanel
            book={{...mockBook, available: false}}
            activeLoan={mockActiveLoan}
            userId={borrowerProfile.id} // Rendered from our main borrower's perspective
            onClose={() => {}}
            onLoanRequested={() => {}}
          />
        </MemoryRouter>
      );

      // The "Request Loan" button should not be present
      expect(screen.queryByRole('button', { name: /request loan/i })).not.toBeInTheDocument();

      // A disabled button with the status "Reserved" should be present
      const statusButton = screen.getByRole('button', { name: /reserved/i });
      expect(statusButton).toBeInTheDocument();
      expect(statusButton).toBeDisabled();
    });
  });

  describe('As an Owner', () => {
    const mockLoan: Loan = {
      id: 'loan-1',
      book_id: mockBook.id,
      borrower_id: borrowerProfile.id!,
      owner_id: ownerProfile.id!,
      status: 'reserved',
      requested_at: new Date().toISOString(),
      approved_at: null,
      due_at: null,
      returned_at: null,
      cancel_reason: null,
      books: mockBook, // Nested book info
      profiles: borrowerProfile, // Borrower's profile
    };

    it('should be able to approve a loan request', async () => {
      render(<LoanRequestCard loan={mockLoan} onComplete={() => {}} />);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('manage-loan-request', {
          body: { loan_id: mockLoan.id, action: 'approve' },
        });
      });
    });

    it('should be able to reject a loan request', async () => {
      render(<LoanRequestCard loan={mockLoan} onComplete={() => {}} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(1);
        expect(mockInvoke).toHaveBeenCalledWith('manage-loan-request', {
          body: { loan_id: mockLoan.id, action: 'reject' },
        });
      });
    });
  });
});
