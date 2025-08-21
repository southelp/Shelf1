import { supabase, allowedDomain } from '../lib/supabaseClient'

let alertShown = false; // Flag to prevent multiple alerts

export default function GoogleSignInButton(){
  const onClick = async () => {
    alertShown = false; // Reset flag on new sign-in attempt
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) alert(error.message);
  };

  const checkDomain = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    
    if (email) {
      const domain = email.substring(email.lastIndexOf('@') + 1);
      console.log('Checking email domain:', domain, 'against allowed suffix:', allowedDomain); // Debug log

      if (!domain.endsWith(allowedDomain)) {
        if (!alertShown) {
          alertShown = true;
          alert(`You can only sign in using a school email (e.g., @*.${allowedDomain}).`);
          await supabase.auth.signOut();
        }
      } else {
        alertShown = false;
      }
    }
  }

  // When the auth state changes ensure the logged in user has an allowed email domain.
  supabase.auth.onAuthStateChange((_e, session) => {
    if (session) {
      checkDomain();
    } else {
      // Reset flag when user signs out
      alertShown = false;
    }
  })

  return (
    <button className="btn" onClick={onClick}>
      Sign in with Google
    </button>
  )
}