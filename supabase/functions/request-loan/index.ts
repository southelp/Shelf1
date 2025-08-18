// deno run --allow-net --allow-env --allow-read
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

serve(async (req) => {
  try{
    const { book_id } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // 서비스 롤 키 사용
    const client = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);
    
    const borrowerId = authUser?.id; if (!borrowerId) return new Response(JSON.stringify({message:'로그인이 필요합니다'}),{status:401});

    const { data: book } = await client.from('books').select('id, title, owner_id').eq('id', book_id).single();
    if (!book) return new Response(JSON.stringify({message:'도서를 찾을 수 없습니다'}),{status:404});

    const { data: active } = await client.from('loans').select('id').eq('book_id', book_id).in('status',['reserved','loaned']);
    if (active && active.length > 0) return new Response(JSON.stringify({message:'이미 예약/대여 중입니다'}),{status:400});

    const { data: loan, error } = await client.from('loans').insert({
      book_id, owner_id: book.owner_id, borrower_id: borrowerId, status:'reserved'
    }).select('id').single();
    if (error) throw error;

    const expires = new Date(Date.now()+1000*60*60*48).toISOString();
    const { data: tokenRow, error: tokenErr } = await client.from('action_tokens').insert({ action:'approve_loan', loan_id: loan.id, expires_at: expires }).select('token').single();
    if (tokenErr) throw tokenErr;

    const { data: owner } = await client.from('profiles').select('email').eq('id', book.owner_id).single();
    if (!owner) throw new Error('Owner profile not found');
    
    const approveUrl = `${Deno.env.get('APP_BASE_URL')}/functions/v1/approve-loan?token=${tokenRow.token}`;

    await sendEmail(owner.email, \`[승인요청] "${book.title}" 대출 요청\`,
      \`<p>도서: <b>${book.title}</b></p>
       <p>대출 요청이 들어왔습니다. 아래 버튼을 눌러 승인하세요.</p>
       <p><a href="${approveUrl}" style="display:inline-block;padding:10px 16px;background:#6b4efc;color:white;border-radius:8px;text-decoration:none">승인하기</a></p>\`
    )

    return new Response(JSON.stringify({ ok:true }), { headers:{'Content-Type':'application/json'} })
  }catch(e){
    console.error(e); return new Response(JSON.stringify({message:'서버 오류: ' + e.message}),{status:500})
  }
})
