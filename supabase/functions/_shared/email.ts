// supabase/functions/_shared/email.ts

export async function sendEmail(to: string, subject: string, html: string) {
  // 1. 환경 변수가 제대로 설정되었는지 확인합니다.
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');

  if (!apiKey || !from) {
    console.error('Missing RESEND_API_KEY or MAIL_FROM environment variables');
    throw new Error('Email environment variables are not set.');
  }

  // 2. Resend API를 호출하여 이메일을 발송합니다.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  // 3. API 호출이 실패하면, 더 상세한 오류 메시지를 출력합니다.
  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Email API request failed:', errorBody);
    throw new Error(`Failed to send email. Status: ${res.status}`);
  }
}