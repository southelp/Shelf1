import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './index.ts';
import * as email from '../_shared/email.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Mock all the dependencies of the handler function, using their exact import paths
vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: vi.fn(),
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2.45.0', () => {
  const mockSupabaseClient = {
    rpc: vi.fn(),
    from: vi.fn(),
  };
  return { createClient: vi.fn(() => mockSupabaseClient) };
});

vi.mock('../_shared/email.ts', () => ({
  sendEmail: vi.fn(),
}));

// Mock Deno's environment variable access
vi.stubGlobal('Deno', {
  env: {
    get: vi.fn((key) => {
      if (key === 'SUPABASE_URL') return 'http://fake.supabase.co';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'fake-key';
      return '';
    }),
  },
});

describe('due-reminder-cron handler', () => {
  let mockSupabaseClient: any;
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // This correctly sets up the mock client for each test.
    mockSupabaseClient = { from: mockFrom, rpc: mockRpc };
    (createClient as vi.Mock).mockReturnValue(mockSupabaseClient);
    mockInsert.mockResolvedValue({ error: null });
  });

  it('should send a reminder and log a notification for a due loan', async () => {
    const mockLoan = { id: 'loan-due-today', book_id: 'book-123', borrower_id: 'borrower-abc', due_at: new Date().toISOString() };
    const mockBook = { title: 'The Stand' };
    const mockBorrower = { email: 'borrower@example.com' };

    // Make the RPC mock smarter to only return the loan for the correct date.
    mockRpc.mockImplementation(async (procedureName, params) => {
      if (procedureName === 'get_due_loans_on') {
        const today = new Date();
        const ymdForToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
        if (params.ymd === ymdForToday) {
          return { data: [mockLoan], error: null }; // Return the loan only for today's check
        }
      }
      return { data: [], error: null }; // Return empty for other dates
    });

    const mockNotificationsSelect = { eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    const mockBooksSelect = { eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockBook }) };
    const mockProfilesSelect = { eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockBorrower }) };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') return { select: () => mockNotificationsSelect, insert: mockInsert };
      if (table === 'books') return { select: () => mockBooksSelect };
      if (table === 'profiles') return { select: () => mockProfilesSelect };
      return { select: vi.fn(), insert: vi.fn() };
    });

    await handler();

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).toHaveBeenCalledWith(mockBorrower.email, `[반납 알림] ${mockBook.title}`, expect.any(String));
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith({ loan_id: mockLoan.id, kind: 'due_day' });
  });

  it('should NOT send a reminder if one has already been sent', async () => {
    const mockLoan = { id: 'loan-already-notified' };
    mockRpc.mockResolvedValue({ data: [mockLoan], error: null });

    const mockNotificationsSelect = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-notification' } }),
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') return { select: () => mockNotificationsSelect, insert: mockInsert };
      return { select: vi.fn(), insert: vi.fn() };
    });

    await handler();

    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
