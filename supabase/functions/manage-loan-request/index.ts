// supabase/functions/manage-loan-request/index.ts

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
    const { loan_id, action } = await req.json(); // action: 'approve' or 'reject'
    if (!loan_id || !['approve', 'reject'].includes(action)) {
      throw new Error('Loan ID and a valid action (approve/reject) are required.');
    }
    
    // JWT 토큰으로 사용자 인증
    const authHeader = req.headers.get('Authorization')!;
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    // 서비스 롤 클라이언트는 데이터베이스 조작에만 사용
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1. 대출 요청 정보와 책 소유자 정보 확인
    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select('id, owner_id, status')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) throw new Error('Loan not found.');
    if (loan.owner_id !== user.id) throw new Error('You are not the owner of this book.');
    
    // 2. 이미 처리된 요청인지 확인 (핵심 충돌 방지 로직)
    if (loan.status !== 'reserved') {
      throw new Error(`This request has already been ${loan.status}.`);
    }

    // 3. 요청 처리
    let updateData = {};
    if (action === 'approve') {
      const loanDays = Number(Deno.env.get('DEFAULT_LOAN_DAYS') || '14');
      const dueDate = new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toISOString();
      updateData = { status: 'loaned', approved_at: new Date().toISOString(), due_at: dueDate };
    } else { // action === 'reject'
      updateData = { status: 'cancelled', cancel_reason: 'Rejected by owner in-app' };
    }

    const { error: updateError } = await serviceClient
      .from('loans')
      .update(updateData)
      .eq('id', loan_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, message: `Loan successfully ${action}d.` }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});