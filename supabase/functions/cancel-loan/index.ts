import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { loan_id } = await req.json();
    if (!loan_id) throw new Error('Loan ID is required.');
    
    // Authenticate user with JWT
    const authHeader = req.headers.get('Authorization')!;
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    // Use service client for database operations
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select('id, borrower_id, status')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) throw new Error('Loan not found.');
    if (loan.borrower_id !== user.id) throw new Error('You are not the borrower of this loan.');
    if (loan.status !== 'reserved') throw new Error('Only reserved loans can be cancelled.');

    const { error: updateError } = await serviceClient
      .from('loans')
      .update({ status: 'cancelled', cancel_reason: 'Cancelled by borrower' })
      .eq('id', loan_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, message: 'Reservation successfully cancelled.' }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});