import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewBook from './NewBook';
import * as supabaseClient from '../lib/supabaseClient';
import * as authHelpers from '@supabase/auth-helpers-react';

// Mock the react-webcam library to control the getScreenshot function
vi.mock('react-webcam', () => {
  const MockWebcam = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,fakedata',
    }));
    return <div data-testid="mock-webcam" {...props} />;
  });
  return {
    __esModule: true,
    default: MockWebcam,
  };
});

// Mocking external dependencies
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn(),
  },
}));

vi.mock('@supabase/auth-helpers-react', () => ({
  useUser: vi.fn(),
}));

// Mock the global fetch API
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('NewBook Page - Manual Registration', () => {
  const mockUser = { id: 'test-user-id-manual' };
  const mockInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useUser to return a valid user, which is required to see the form.
    (authHelpers.useUser as vi.Mock).mockReturnValue(mockUser);

    // Configure the mock to resolve with a successful response shape
    mockInsert.mockResolvedValue({ error: null });

    // Mock the chainable Supabase call `supabase.from(...).insert(...)`
    (supabaseClient.supabase.from as vi.Mock).mockReturnValue({
      insert: mockInsert,
    });

    // Mock the browser's confirm and alert functions.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const switchToManualMode = () => {
    // The default mode is 'title' search. We need to switch to 'manual'.
    // The UI path is: Title -> ISBN -> Manual
    fireEvent.click(screen.getByRole('button', { name: /isbn/i }));
    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
  };

  it('should allow a user to fill out the manual registration form and submit it', async () => {
    // The component uses <Link>, so it must be rendered within a router.
    render(
      <MemoryRouter>
        <NewBook />
      </MemoryRouter>
    );

    switchToManualMode();

    // Find form elements
    const titleInput = screen.getByPlaceholderText(/title/i);
    const authorsInput = screen.getByPlaceholderText(/authors/i);
    const coverUrlInput = screen.getByPlaceholderText(/cover image url/i);
    const registerButton = screen.getByRole('button', { name: /register manually/i });

    // Simulate user input
    const bookData = {
      title: 'The Lord of the Rings',
      authors: 'J.R.R. Tolkien',
      cover_url: 'http://example.com/lotr.jpg',
    };

    fireEvent.change(titleInput, { target: { value: bookData.title } });
    fireEvent.change(authorsInput, { target: { value: bookData.authors } });
    fireEvent.change(coverUrlInput, { target: { value: bookData.cover_url } });

    // Simulate form submission
    fireEvent.click(registerButton);

    // Wait for the async registration logic to complete
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    // Assert that the data sent to Supabase is correct
    expect(mockInsert).toHaveBeenCalledWith({
      owner_id: mockUser.id,
      isbn: undefined,
      title: bookData.title,
      authors: ['J.R.R. Tolkien'], // The component splits the author string by comma
      publisher: undefined,
      published_year: undefined,
      cover_url: bookData.cover_url,
      available: true,
      source_api: undefined,
    });

    // Assert that a success message was shown
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Book registered successfully!');
    });
  });

  it('should handle long and special character inputs gracefully', async () => {
    render(
      <MemoryRouter>
        <NewBook />
      </MemoryRouter>
    );

    switchToManualMode();

    const titleInput = screen.getByPlaceholderText(/title/i);
    const authorsInput = screen.getByPlaceholderText(/authors/i);

    const longString = 'a'.repeat(1000);
    const specialChars = '<script>alert("xss")</script>, !@#$%^&*(), |"<>?';

    fireEvent.change(titleInput, { target: { value: longString } });
    fireEvent.change(authorsInput, { target: { value: specialChars } });

    fireEvent.click(screen.getByRole('button', { name: /register manually/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        title: longString,
        authors: specialChars.split(',').map(s => s.trim()),
      }));
    });
  });
});

describe('NewBook Page - Camera Scan', () => {
  const mockUser = { id: 'test-user-id-camera' };
  const mockInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (authHelpers.useUser as vi.Mock).mockReturnValue(mockUser);
    mockInsert.mockResolvedValue({ error: null });
    (supabaseClient.supabase.from as vi.Mock).mockReturnValue({ insert: mockInsert });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('should allow scanning a book cover, selecting a result, and registering it', async () => {
    render(
      <MemoryRouter>
        <NewBook />
      </MemoryRouter>
    );

    // Switch to camera mode
    fireEvent.click(screen.getByRole('button', { name: /camera/i }));

    // Verify the mock webcam is rendered
    expect(screen.getByTestId('mock-webcam')).toBeInTheDocument();

    const geminiApiResponse = { title: 'The Great Gatsby' };
    const searchApiResponse = {
      candidates: [{ title: 'The Great Gatsby', authors: ['F. Scott Fitzgerald'], isbn: '978-0743273565', source: 'google' }]
    };

    // Set up the two fetch mocks in order
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(geminiApiResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(searchApiResponse) });

    // Click capture button
    fireEvent.click(screen.getByRole('button', { name: /capture/i }));

    // Wait for the modal with the search result
    const candidateTitle = await screen.findByText('The Great Gatsby');
    expect(candidateTitle).toBeInTheDocument();

    // Click the candidate to register
    fireEvent.click(candidateTitle.parentElement!.parentElement!);

    // Check if insert was called with the correct data
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'The Great Gatsby',
        authors: ['F. Scott Fitzgerald'],
        isbn: '978-0743273565',
      }));
    });

    // Check for success alert
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Book registered successfully!');
    });
  });
});

describe('NewBook Page - Text Search', () => {
  const mockUser = { id: 'test-user-id-search' };
  const mockInsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (authHelpers.useUser as vi.Mock).mockReturnValue(mockUser);
    mockInsert.mockResolvedValue({ error: null });
    (supabaseClient.supabase.from as vi.Mock).mockReturnValue({ insert: mockInsert });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('should allow searching for a book by title, selecting it, and registering it', async () => {
    const mockCandidates = [
      { title: 'Dune', authors: ['Frank Herbert'], isbn: '978-0441013593', source: 'google' },
      { title: 'Dune Messiah', authors: ['Frank Herbert'], isbn: '978-0441172698', source: 'naver' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: mockCandidates }),
    });

    render(
      <MemoryRouter>
        <NewBook />
      </MemoryRouter>
    );

    // Input search query
    const titleInput = screen.getByPlaceholderText('Title');
    fireEvent.change(titleInput, { target: { value: 'Dune' } });

    // Click search
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    // Wait for modal and find the first candidate by its title
    const firstCandidate = await screen.findByText('Dune');
    expect(firstCandidate).toBeInTheDocument();

    // Also check the second one is there
    expect(screen.getByText('Dune Messiah')).toBeInTheDocument();

    // Click the first candidate's container to register it
    // The title is inside a div that has the onClick handler
    fireEvent.click(firstCandidate.parentElement!.parentElement!);

    // Check if insert was called with the correct data
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Dune',
        authors: ['Frank Herbert'],
        isbn: '978-0441013593',
        owner_id: mockUser.id,
      }));
    });

    // Check for success alert
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Book registered successfully!');
    });
  });
});
