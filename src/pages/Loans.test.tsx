import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Loans from './Loans';
import * as supabaseClient from '../lib/supabaseClient';
import * as authHelpers from '@supabase/auth-helpers-react';
import { Loan } from '../types';

// Mock dependencies
vi.mock('@supabase/auth-helpers-react');
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Loans Page', () => {
  const mockUser = { id: 'test-borrower-id' };
  const mockInvoke = vi.fn();
  const mockSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authentication to simulate a logged-in user
    (authHelpers.useUser as vi.Mock).mockReturnValue(mockUser);

    // Mock Supabase function calls
    (supabaseClient.supabase as any).functions = { invoke: mockInvoke };
    mockInvoke.mockResolvedValue({ error: null, data: { ok: true } });

    // Mock Supabase database calls
    (supabaseClient.supabase.from as vi.Mock).mockReturnValue({
      select: mockSelect,
    });

    // Mock browser interactions
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('should allow a user to cancel a reservation', async () => {
    const mockLoan: Loan = {
      id: 'loan-to-cancel',
      status: 'reserved',
      book_id: 'book-1',
      owner_id: 'owner-1',
      borrower_id: 'borrower-1',
      requested_at: new Date().toISOString(),
      approved_at: null,
      due_at: null,
      returned_at: null,
      cancel_reason: null,
      books: {
        id: 'book-1',
        owner_id: 'owner-1',
        title: 'Reserved Book Title',
        authors: [],
        publisher: null,
        published_year: null,
        description: null,
        cover_url: null,
        available: false,
        created_at: new Date().toISOString(),
        isbn: null,
        profiles: { id: 'owner-1', full_name: 'Owner' }
      },
      profiles: null,
    };

    // Mock the chained query builder: .select(...).eq(...).in(...).order(...)
    const mockQueryBuilder = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockLoan], error: null }),
    };
    mockSelect.mockReturnValue(mockQueryBuilder);

    render(
      <MemoryRouter>
        <Loans />
      </MemoryRouter>
    );

    // Find the button specific to reserved books
    const cancelButton = await screen.findByRole('button', { name: /cancel reservation/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);

    // Verify the correct function was invoked
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('cancel-loan', {
        body: { loan_id: 'loan-to-cancel' },
      });
    });
  });

  it('should allow a user to return a loaned book', async () => {
    const mockLoan: Loan = {
      id: 'loan-to-return',
      status: 'loaned',
      book_id: 'book-2',
      owner_id: 'owner-2',
      borrower_id: 'borrower-1',
      requested_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      due_at: new Date().toISOString(),
      returned_at: null,
      cancel_reason: null,
      books: {
        id: 'book-2',
        owner_id: 'owner-2',
        title: 'Loaned Book Title',
        authors: [],
        publisher: null,
        published_year: null,
        description: null,
        cover_url: null,
        available: false,
        created_at: new Date().toISOString(),
        isbn: null,
        profiles: { id: 'owner-2', full_name: 'Owner' }
      },
      profiles: null,
    };

    const mockQueryBuilder = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockLoan], error: null }),
    };
    mockSelect.mockReturnValue(mockQueryBuilder);

    render(
      <MemoryRouter>
        <Loans />
      </MemoryRouter>
    );

    // Find the button specific to loaned books
    const returnButton = await screen.findByRole('button', { name: /return book/i });
    expect(returnButton).toBeInTheDocument();

    fireEvent.click(returnButton);

    // Verify the correct function was invoked
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('return-loan', {
        body: { loan_id: 'loan-to-return' },
      });
    });
  });
});
