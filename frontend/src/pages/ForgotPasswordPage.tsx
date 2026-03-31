import React, { useState } from 'react';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/forgot-password', { email });
      setMsg("✅ Se o e-mail estiver cadastrado, enviamos um link de recuperação para ele!");
    } catch (err) {
      setMsg("❌ Ocorreu um erro ao enviar. Tente novamente.");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Esqueci minha senha</h2>
      <p>Digite seu e-mail para receber o link de recuperação.</p>
      <form onSubmit={handleSend}>
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
          placeholder="seu@email.com"
          style={{ padding: '10px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', marginLeft: '10px' }}>Enviar Link</button>
      </form>
      {msg && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{msg}</p>}
    </div>
  );
};
export default ForgotPasswordPage;