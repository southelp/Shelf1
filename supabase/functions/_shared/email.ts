// deno-lint-ignore-file no-explicit-any
export async function sendEmail(to: string, subject: string, html: string){
  const apiKey = Deno.env.get('RESEND_API_KEY')!;
  const from = Deno.env.get('MAIL_FROM')!;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer ${apiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  })
  if (!res.ok) { const j = await res.text(); console.error('Email failed', j); throw new Error('Email send failed') }
}
