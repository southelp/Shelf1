import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoogleSignInButton from './GoogleSignInButton';
import * as supabaseClient from '../lib/supabaseClient';

// Mock the entire supabaseClient module, including the supabase object and the allowedDomain variable.
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      onAuthStateChange: vi.fn(),
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
  allowedDomain: '.ac.kr', // Mock the allowed domain for consistent testing
}));

describe('GoogleSignInButton', () => {
  // This will hold the callback function that the component registers with onAuthStateChange.
  // We capture it so we can manually trigger it in our tests.
  let onAuthStateChangeCallback: (event: string, session: any) => Promise<void>;

  beforeEach(() => {
    // Reset all mocks to ensure tests are isolated.
    vi.clearAllMocks();

    // Provide a default mock implementation for signInWithOAuth to avoid unhandled promise rejections.
    (supabaseClient.supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValue({ error: null });

    // When the component calls onAuthStateChange, we capture the callback function it provides.
    (supabaseClient.supabase.auth.onAuthStateChange as vi.Mock).mockImplementation((callback) => {
      onAuthStateChangeCallback = callback;
      // Return the subscription object that the real function would return.
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });
  });

  it('should call the signInWithOAuth function when the button is clicked', () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(button);

    // Verify that the sign-in process was initiated with the correct parameters.
    expect(supabaseClient.supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(supabaseClient.supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  });

  it('should alert the user and sign them out if their email is not from an allowed domain', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Render the component to register the onAuthStateChange callback.
    render(<GoogleSignInButton />);

    // Define a mock session with a non-compliant email.
    const mockSession = { user: { email: 'test@gmail.com' } };
    // The component's `checkDomain` function also calls `getUser`, so we mock its return value.
    (supabaseClient.supabase.auth.getUser as vi.Mock).mockResolvedValue({ data: { user: mockSession.user } });

    // Manually trigger the auth state change event with the non-compliant session.
    await onAuthStateChangeCallback('SIGNED_IN', mockSession);

    // Assert that the user was shown an alert and then signed out.
    expect(alertMock).toHaveBeenCalledWith('You can only sign in with an academic email address (ending in .ac.kr).');
    expect(supabaseClient.supabase.auth.signOut).toHaveBeenCalledTimes(1);

    alertMock.mockRestore();
  });

  it('should NOT sign out the user if their email is from an allowed domain', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<GoogleSignInButton />);

    // Define a mock session with a compliant email.
    const mockSession = { user: { email: 'test@snu.ac.kr' } };
    (supabaseClient.supabase.auth.getUser as vi.Mock).mockResolvedValue({ data: { user: mockSession.user } });

    // Manually trigger the auth state change event.
    await onAuthStateChangeCallback('SIGNED_IN', mockSession);

    // Assert that no alert was shown and the user was not signed out.
    expect(alertMock).not.toHaveBeenCalled();
    expect(supabaseClient.supabase.auth.signOut).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });
});
