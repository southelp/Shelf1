import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try{
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, service, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { loan_id } = await req.json();
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);

    const uid = authUser?.id; if (!uid) return new Response('인증 필요', { status: 401 });

    const { data: loan } = await client.from('loans').select('id, owner_id, borrower_id').eq('id', loan_id).single();
    if (!loan) return new Response('대출 없음', { status: 404 });
    if (!(loan.owner_id === uid || loan.borrower_id === uid)) return new Response('권한 없음', { status: 403 });

    await client.from('loans').update({ status:'returned', returned_at: new Date().toISOString() }).eq('id', loan.id);
    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} })
  }catch(e){ console.error(e); return new Response(JSON.stringify({message:'서버 오류'}),{status:500}) }
})
