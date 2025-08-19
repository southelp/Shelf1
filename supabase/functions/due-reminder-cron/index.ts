import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const client = createClient(supabaseUrl, service);

  const today = new Date();
  const day = (d:number)=> new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()+d)).toISOString().slice(0,10);

  const targets = [ { label:'due_minus_2', date: day(2) }, { label:'due_minus_1', date: day(1) }, { label:'due_day', date: day(0) } ];

  for (const t of targets){
    const { data: loans } = await client.rpc('get_due_loans_on', { ymd: t.date });
    for (const l of loans || []){
      const { data: exists } = await client.from('notifications').select('id').eq('loan_id', l.id).eq('kind', t.label).maybeSingle();
      if (exists) continue;

      const { data: book } = await client.from('books').select('title').eq('id', l.book_id).single();
      const { data: borrower } = await client.from('profiles').select('email').eq('id', l.borrower_id).single();
      if (book && borrower) {
        // ✨ 여기서 불필요한 \ 문자 제거
        await sendEmail(borrower.email, `[반납 알림] ${book.title}`,
          `<p>도서 <b>${book.title}</b> 반납 예정일이 임박했습니다.</p>
           <p>반납 예정일: ${l.due_at?.slice(0,10)}</p>`);
        await client.from('notifications').insert({ loan_id: l.id, kind: t.label });
      }
    }
  }

  return new Response('ok')
})