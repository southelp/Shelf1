export function isIsbn13(s: string) {
  const t = s.replace(/[^0-9]/g,''); if (t.length !== 13) return false;
  let sum = 0; for (let i=0;i<12;i++){ const n = Number(t[i]); sum += (i%2===0)? n : n*3; }
  const c = (10 - (sum % 10)) % 10; return c === Number(t[12]);
}
