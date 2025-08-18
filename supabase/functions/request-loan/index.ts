import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

// --- 이메일 발송 함수 ---
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');

  if (!apiKey || !from) {
    console.error('Missing RESEND_API_KEY or MAIL_FROM environment variables');
    throw new Error('Email environment variables are not set.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Email API request failed:', errorBody);
    throw new Error(`Failed to send email. Status: ${res.status}`);
  }
}

// --- 메인 함수 ---
serve(async (req) => {
  // ✨ CORS 사전 요청(preflight) 처리 로직
  // 브라우저가 OPTIONS 메서드로 허락을 물어보면, 필요한 헤더와 함께 200 OK 응답을 즉시 반환합니다.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // 모든 Origin 허용
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    });
  }

  try {
    const { book_id } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);
    
    const borrowerId = authUser?.id;
    if (!borrowerId) {
      return new Response(JSON.stringify({ message: '인증되지 않은 사용자입니다. 로그인이 필요합니다.' }), { status: 401 });
    }

    const { data: book } = await client.from('books').select('id, title, owner_id').eq('id', book_id).single();
    if (!book) {
      return new Response(JSON.stringify({ message: '요청한 책을 찾을 수 없습니다.' }), { status: 404 });
    }
    
    const { data: owner } = await client.from('profiles').select('email').eq('id', book.owner_id).single();
    if (!owner || !owner.email) {
      console.error(`[ERROR] 책 소유자(id: ${book.owner_id})의 프로필 또는 이메일이 profiles 테이블에 없습니다.`);
      return new Response(JSON.stringify({ message: '책 소유자의 이메일 정보가 없어 요청을 보낼 수 없습니다. 관리자에게 문의하세요.' }), { status: 500 });
    }

    const { data: activeLoan } = await client.from('loans').select('id').eq('book_id', book_id).in('status', ['reserved', 'loaned']).limit(1);
    if (activeLoan && activeLoan.length > 0) {
      return new Response(JSON.stringify({ message: '이미 다른 사람이 예약 또는 대여 중인 책입니다.' }), { status: 400 });
    }

    const { data: loan, error: loanError } = await client.from('loans').insert({
      book_id, owner_id: book.owner_id, borrower_id: borrowerId, status: 'reserved'
    }).select('id').single();
    if (loanError) throw loanError;

    const expires = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
    const { data: tokenRow, error: tokenError } = await client.from('action_tokens').insert({ action: 'approve_loan', loan_id: loan.id, expires_at: expires }).select('token').single();
    if (tokenError) throw tokenError;
    
    const approveUrl = `${Deno.env.get('APP_BASE_URL')}/functions/v1/approve-loan?token=${tokenRow.token}`;

    await sendEmail(owner.email, `[대출 요청] "${book.title}"`,
        `<p>안녕하세요!</p>
         <p>회원님의 책 <b>"${book.title}"</b>에 대한 대출 요청이 도착했습니다.</p>
         <p>아래 버튼을 눌러 대출을 승인해주세요. (48시간 내에 승인하지 않으면 요청이 만료됩니다)</p>
         <p style="margin-top: 20px;">
           <a href="${approveUrl}" style="display:inline-block; padding:12px 20px; background-color:#6b4efc; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">
             대출 승인하기
           </a>
         </p>`
      );

    return new Response(JSON.stringify({ ok: true, message: '대출 요청이 성공적으로 전송되었습니다.' }), { 
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // 실제 응답에도 CORS 헤더 포함
        } 
    });

  } catch (e: any) {
    console.error('함수 실행 중 오류 발생:', e);
    return new Response(JSON.stringify({ message: `서버 내부 오류: ${e.message}` }), { 
        status: 500,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // 오류 응답에도 CORS 헤더 포함
        }
    });
  }
});