import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM') || 'Taejae Open Shelf <noreply@taejae.life>';
  if (!apiKey) throw new Error('Email environment variable RESEND_API_KEY is not set.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Email API request failed:', errorBody);
    throw new Error(`Failed to send email. Status: ${res.status}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { book_id } = await req.json();
    
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user: authUser } } = await client.auth.getUser(token);
    
    const borrowerId = authUser?.id;
    if (!borrowerId) throw new Error('Authentication required.');

    // ✨ 1. 요청자(borrower)의 프로필 정보를 조회합니다.
    const { data: borrowerProfile } = await client.from('profiles').select('full_name').eq('id', borrowerId).single();
    if (!borrowerProfile) throw new Error('Could not find the profile of the requester.');
    
    const borrowerName = borrowerProfile.full_name || 'A user';

    const { data: book } = await client.from('books').select('id, title, owner_id').eq('id', book_id).single();
    if (!book) throw new Error('Book not found.');
    
    const { data: owner } = await client.from('profiles').select('email').eq('id', book.owner_id).single();
    if (!owner || !owner.email) throw new Error("Book owner's email not found.");

    const { data: activeLoan } = await client.from('loans').select('id').eq('book_id', book_id).in('status', ['reserved', 'loaned']).limit(1);
    if (activeLoan && activeLoan.length > 0) throw new Error('This book is already reserved or on loan.');

    const { error: loanError } = await client.from('loans').insert({
      book_id, owner_id: book.owner_id, borrower_id: borrowerId, status: 'reserved'
    }).select('id').single();
    if (loanError) throw loanError;

    const myLibraryUrl = `${Deno.env.get('APP_BASE_URL')}/my`;

    // ✨ 2. 이메일 제목과 본문에 책 제목과 요청자 이름을 추가합니다.
    await sendEmail(owner.email, `[Taejae Open Shelf] Loan Request: "${book.title}" from ${borrowerName}`,
        `
        <p>Hi there,</p>
        <p>You have received a new loan request for your book, <strong>"${book.title}"</strong>, from <strong>${borrowerName}</strong>.</p>
        <p>Please visit the "My Library" page on Taejae Open Shelf to approve or reject this request.</p>
        <p><a href="${myLibraryUrl}">Go to My Library</a></p>
        <br>
        <p>Thank you,</p>
        <p><strong>Taejae Open Shelf</strong></p>
        `
    );

    return new Response(JSON.stringify({ ok: true, message: 'Loan request sent successfully.' }), { 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });

  } catch (e: any) {
    console.error('Error in request-loan function:', e.message);
    return new Response(JSON.stringify({ message: e.message }), { 
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
});