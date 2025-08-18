// supabase/functions/request-loan/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { sendEmail } from "../_shared/email.ts";

serve(async (req) => {
  try {
    const { book_id } = await req.json();
    
    // 1. Supabase 클라이언트 생성 (서비스 롤 키 사용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // 2. 요청 보낸 사용자(대여자) 정보 확인
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);
    
    const borrowerId = authUser?.id;
    if (!borrowerId) {
      return new Response(JSON.stringify({ message: '인증되지 않은 사용자입니다. 로그인이 필요합니다.' }), { status: 401 });
    }

    // 3. 책 정보 및 소유자 ID 조회
    const { data: book } = await client.from('books').select('id, title, owner_id').eq('id', book_id).single();
    if (!book) {
      return new Response(JSON.stringify({ message: '요청한 책을 찾을 수 없습니다.' }), { status: 404 });
    }
    
    // ✨ 안정성 강화: 책 소유자의 프로필과 이메일이 유효한지 확인
    const { data: owner } = await client.from('profiles').select('email').eq('id', book.owner_id).single();
    if (!owner || !owner.email) {
      console.error(`[ERROR] 책 소유자(id: ${book.owner_id})의 프로필 또는 이메일이 profiles 테이블에 없습니다.`);
      return new Response(JSON.stringify({ message: '책 소유자의 이메일 정보가 없어 요청을 보낼 수 없습니다. 관리자에게 문의하세요.' }), { status: 500 });
    }

    // 4. 이미 대출/예약 중인지 확인
    const { data: activeLoan } = await client.from('loans').select('id').eq('book_id', book_id).in('status', ['reserved', 'loaned']).limit(1);
    if (activeLoan && activeLoan.length > 0) {
      return new Response(JSON.stringify({ message: '이미 다른 사람이 예약 또는 대여 중인 책입니다.' }), { status: 400 });
    }

    // 5. 대출(상태: reserved) 데이터 생성
    const { data: loan, error: loanError } = await client.from('loans').insert({
      book_id, owner_id: book.owner_id, borrower_id: borrowerId, status: 'reserved'
    }).select('id').single();
    if (loanError) throw loanError;

    // 6. 승인용 토큰 생성
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
    const { data: tokenRow, error: tokenError } = await client.from('action_tokens').insert({ action: 'approve_loan', loan_id: loan.id, expires_at: expires }).select('token').single();
    if (tokenError) throw tokenError;
    
    const approveUrl = `${Deno.env.get('APP_BASE_URL')}/functions/v1/approve-loan?token=${tokenRow.token}`;

    // ✨ 7. 이메일 발송 (별도 오류 처리)
    try {
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
    } catch (emailError) {
      console.error('이메일 발송 실패:', emailError);
      // 이메일 발송이 실패해도 일단 대출 요청은 생성되었으므로, 사용자에게는 다른 메시지를 보여줌
      return new Response(JSON.stringify({ 
        message: '대출 요청은 생성되었지만, 소유자에게 승인 이메일을 보내는 데 실패했습니다. RESEND_API_KEY 등 환경 변수 설정을 확인하세요.' 
      }), { status: 200 }); // 에러가 아닌 성공으로 처리하되, 메시지로 상태를 알림
    }

    return new Response(JSON.stringify({ ok: true, message: '대출 요청이 성공적으로 전송되었습니다.' }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('함수 실행 중 심각한 오류 발생:', e);
    return new Response(JSON.stringify({ message: `서버 내부 오류: ${e.message}` }), { status: 500 });
  }
});