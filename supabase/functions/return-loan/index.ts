import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ✨ 1. CORS 헤더를 정의합니다.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // ✨ 2. OPTIONS 사전 요청을 처리합니다.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { loan_id } = await req.json();
    if (!loan_id) throw new Error('Loan ID is required.');
    
    const authHeader = req.headers.get('Authorization')!;
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: loan } = await serviceClient
      .from('loans')
      .select('id, owner_id, borrower_id')
      .eq('id', loan_id)
      .single();
      
    if (!loan) throw new Error('Loan not found.');
    
    // 소유자 또는 대출자만 반납할 수 있도록 권한을 확인합니다.
    if (loan.owner_id !== user.id && loan.borrower_id !== user.id) {
      throw new Error('You do not have permission to return this book.');
    }

    await serviceClient
      .from('loans')
      .update({ status: 'returned', returned_at: new Date().toISOString() })
      .eq('id', loan.id);
      
    // ✨ 3. 성공 응답에 CORS 헤더를 추가합니다.
    return new Response(JSON.stringify({ ok: true }), { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });

  } catch (e: any) {
    // ✨ 4. 에러 응답에도 CORS 헤더를 추가합니다.
    return new Response(JSON.stringify({ message: e.message }), { 
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});