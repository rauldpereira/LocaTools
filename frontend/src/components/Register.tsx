import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [tipoPessoa, setTipoPessoa] = useState<'fisica' | 'juridica'>('fisica');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');

  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');

  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');

  const [mensagem, setMensagem] = useState('');

  const isCPFValido = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  };

  const isCNPJValido = (cnpj: string) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
  };

  const formatarTelefone = (v: string) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    return v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatarCPF = (v: string) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatarCNPJ = (v: string) => {
    v = v.replace(/\D/g, '').slice(0, 14);
    return v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatarRG = (v: string) => {
    return v.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 12);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setTelefone(formatarTelefone(e.target.value));
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => setCpf(formatarCPF(e.target.value));
  const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => setRg(formatarRG(e.target.value));
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => setCnpj(formatarCNPJ(e.target.value));

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem('');

    if (senha !== confirmarSenha) {
      setMensagem('Erro: As senhas não coincidem.');
      return;
    }

    if (senha.length < 6) {
      setMensagem('Erro: A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (tipoPessoa === 'fisica') {
      if (!isCPFValido(cpf)) {
        setMensagem('Erro: CPF inválido! Verifique os números.');
        return;
      }
    }

    if (tipoPessoa === 'juridica') {
      if (!isCNPJValido(cnpj)) {
        setMensagem('Erro: CNPJ inválido! Verifique os números.');
        return;
      }
    }

    try {
      await axios.post('http://localhost:3001/api/register', {
        tipo_pessoa: tipoPessoa,
        nome,
        email,
        senha,
        telefone,
        cpf: tipoPessoa === 'fisica' ? cpf.replace(/\D/g, '') : null,
        rg: tipoPessoa === 'fisica' ? rg : null,
        cnpj: tipoPessoa === 'juridica' ? cnpj.replace(/\D/g, '') : null,
        razao_social: tipoPessoa === 'juridica' ? razaoSocial : null
      });

      // MENSAGEM NOVA AQUI
      setMensagem('Credenciais criadas com sucesso! Redirecionando...');

      // Aguarda 1.5s e faz o redirecionamento
      setTimeout(() => {
        navigate('/auth?mode=login');
        
        // Limpamos os campos AQUI DENTRO para a tela não piscar vazia antes de trocar
        setNome(''); setEmail(''); setSenha(''); setConfirmarSenha('');
        setTelefone(''); setCpf(''); setRg(''); setCnpj(''); setRazaoSocial('');
      }, 1500);

    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        setMensagem('Erro: ' + error.response.data.error);
      } else {
        setMensagem('Erro desconhecido.');
      }
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', backgroundColor: '#f0f2f5', padding: '20px'
    }}>
      <div style={{
        padding: '2.5rem',
        width: '100%',
        maxWidth: '900px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
          Criar Conta
        </h2>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', justifyContent: 'center', maxWidth: '500px', margin: '0 auto 25px' }}>
          <button
            type="button"
            onClick={() => { setTipoPessoa('fisica'); setMensagem(''); }}
            style={{
              flex: 1, padding: '12px', border: '1px solid',
              borderColor: tipoPessoa === 'fisica' ? '#007bff' : '#ddd',
              backgroundColor: tipoPessoa === 'fisica' ? '#007bff' : '#f8f9fa',
              color: tipoPessoa === 'fisica' ? '#fff' : '#555',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            Pessoa Física
          </button>
          <button
            type="button"
            onClick={() => { setTipoPessoa('juridica'); setMensagem(''); }}
            style={{
              flex: 1, padding: '12px', border: '1px solid',
              borderColor: tipoPessoa === 'juridica' ? '#007bff' : '#ddd',
              backgroundColor: tipoPessoa === 'juridica' ? '#007bff' : '#f8f9fa',
              color: tipoPessoa === 'juridica' ? '#fff' : '#555',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            Empresa
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px'
        }}>

          <div style={gridFullWidth}>
            <label style={labelStyle}>{tipoPessoa === 'fisica' ? 'Nome Completo' : 'Nome do Responsável'}</label>
            <input
              type="text" value={nome} onChange={e => setNome(e.target.value)}
              required style={inputStyle} placeholder="Digite o nome"
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required style={inputStyle} placeholder="seu@email.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={handleTelefoneChange}
              required
              style={inputStyle}
              placeholder="(00) 00000-0000"
            />
          </div>

          {tipoPessoa === 'fisica' && (
            <>
              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>RG</label>
                <input
                  type="text"
                  value={rg}
                  onChange={handleRgChange}
                  required
                  style={inputStyle}
                  placeholder="Número do RG"
                />
              </div>
            </>
          )}

          {tipoPessoa === 'juridica' && (
            <>
              <div>
                <label style={labelStyle}>CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Razão Social</label>
                <input
                  type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)}
                  placeholder="Nome oficial da empresa" style={inputStyle}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              required style={inputStyle} placeholder="********"
            />
          </div>

          <div>
            <label style={labelStyle}>Confirmar Senha</label>
            <input
              type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
              required style={inputStyle} placeholder="********"
            />
          </div>

          <div style={gridFullWidth}>
            <button
              type="submit"
              style={{
                width: '100%', marginTop: '15px', padding: '15px', backgroundColor: '#28a745',
                color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(40, 167, 69, 0.2)',
                transition: 'background-color 0.2s'
              }}
            >
              Registrar
            </button>
          </div>
        </form>

        {mensagem && (
          <div style={{
            marginTop: '1.5rem', padding: '15px', borderRadius: '6px',
            backgroundColor: mensagem.includes('Erro') ? '#ffebee' : '#e8f5e9',
            color: mensagem.includes('Erro') ? '#c62828' : '#2e7d32',
            textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem'
          }}>
            {mensagem}
          </div>
        )}
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600', fontSize: '1rem'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
};

const gridFullWidth: React.CSSProperties = {
  gridColumn: '1 / -1'
};

export default Register;