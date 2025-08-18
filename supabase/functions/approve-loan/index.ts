import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try{
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return new Response('토큰이 없습니다', { status: 400 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, service);

    const { data: t } = await client.from('action_tokens').select('*').eq('token', token).single();
    if (!t) return new Response('유효하지 않은 토큰', { status: 400 });
    if (t.used_at) return new Response('이미 사용된 토큰', { status: 400 });
    if (new Date(t.expires_at).getTime() < Date.now()) return new Response('만료된 토큰', { status: 400 });
    if (t.action !== 'approve_loan') return new Response('토큰 액션 불일치', { status: 400 });

    const { data: loan } = await client.from('loans').select('*').eq('id', t.loan_id).single();
    if (!loan) return new Response('대출 정보를 찾을 수 없음', { status: 404 });

    const days = Number(Deno.env.get('DEFAULT_LOAN_DAYS') || '14');
    const due = new Date(Date.now()+days*24*60*60*1000).toISOString();

    await client.from('loans').update({ status:'loaned', approved_at: new Date().toISOString(), due_at: due }).eq('id', loan.id);
    await client.from('action_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);

    return new Response('대여가 승인되었습니다. 이제 창을 닫아도 됩니다.', { headers:{ 'Content-Type':'text/plain; charset=utf-8' } })
  }catch(e){ console.error(e); return new Response('서버 오류', { status: 500 }) }
})
