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
    const mockLoan: Partial<Loan> = {
      id: 'loan-to-cancel',
      status: 'reserved',
      books: { title: 'Reserved Book Title', cover_url: null, profiles: { full_name: 'Owner' } },
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
    const mockLoan: Partial<Loan> = {
      id: 'loan-to-return',
      status: 'loaned',
      due_at: new Date().toISOString(),
      books: { title: 'Loaned Book Title', cover_url: null, profiles: { full_name: 'Owner' } },
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
