import { supabase, allowedDomain } from '../lib/supabaseClient'

export default function GoogleSignInButton(){
  const onClick = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
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
    if (email && !email.endsWith(`${allowedDomain}`)) {
      await supabase.auth.signOut();
      alert(`You can only sign in using a school email (@${allowedDomain}).`)
    }
  }

  // When the auth state changes ensure the logged in user has an allowed email domain.
  supabase.auth.onAuthStateChange((_e,_s) => { checkDomain() })

  return (
    <button className="btn" onClick={onClick}>
      Sign in with Google
    </button>
  )
}