'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // use caminho relativo

export default function AuthBar() {
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.log('AuthBar montou');
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (user) return (
    <div style={{display:'flex',gap:8}}>
      <span>{user.email}</span>
      <button onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  );

  return (
    <form onSubmit={async (e)=>{e.preventDefault();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }} style={{display:'flex',gap:8}}>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Entrar</button>
    </form>
  );
}