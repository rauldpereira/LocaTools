import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">("fisica");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "#e2e8f0" });

  useEffect(() => {
    if (!senha) {
      setPasswordStrength({ score: 0, label: "", color: "#e2e8f0" });
      return;
    }
    let score = 0;
    if (senha.length >= 8) score++;
    if (/[A-Z]/.test(senha)) score++;
    if (/[0-9]/.test(senha)) score++;
    if (/[^A-Za-z0-9]/.test(senha)) score++;

    const labels = ["Fraca", "Razoável", "Boa", "Forte"];
    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    
    setPasswordStrength({ 
      score: (score / 4) * 100, 
      label: labels[score - 1] || labels[0],
      color: colors[score - 1] || colors[0]
    });
  }, [senha]);

  useEffect(() => {
    if (confirmarSenha && senha !== confirmarSenha) {
        setErrors(prev => ({ ...prev, match: "Senhas não coincidem, por favor" }));
    } else {
        setErrors(prev => {
            const { match, ...rest } = prev;
            return rest;
        });
    }
  }, [confirmarSenha, senha]);

  const formatarTelefone = (v: string) => {
    v = v.replace(/\D/g, "").slice(0, 11);
    return v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatarCPF = (v: string) => {
    v = v.replace(/\D/g, "").slice(0, 11);
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatarCNPJ = (v: string) => {
    v = v.replace(/\D/g, "").slice(0, 14);
    return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    // Regra: Mínimo 8 caracteres, pelo menos uma letra e um número. Aceita símbolos.
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(senha)) {
      setMensagem("A senha deve ter no mínimo 8 caracteres e conter letras e números.");
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não coincidem, por favor verifique.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/register`, {
        tipo_pessoa: tipoPessoa,
        nome,
        email,
        senha,
        telefone,
        cpf: tipoPessoa === "fisica" ? cpf.replace(/\D/g, "") : null,
        cnpj: tipoPessoa === "juridica" ? cnpj.replace(/\D/g, "") : null,
        razao_social: tipoPessoa === "juridica" ? razaoSocial : null,
      });

      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, { email, senha });
      login(data.token); 
      navigate('/'); 
    } catch (error: any) {
      setMensagem(error.response?.data?.error || "Falha ao criar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="segmented-control">
        <button 
          type="button" 
          className={`segment-option ${tipoPessoa === 'fisica' ? 'active' : ''}`} 
          onClick={() => setTipoPessoa("fisica")}
        >
          Pessoa Física
        </button>
        <button 
          type="button" 
          className={`segment-option ${tipoPessoa === 'juridica' ? 'active' : ''}`} 
          onClick={() => setTipoPessoa("juridica")}
        >
          Empresa (PJ)
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nome Completo</label>
          <input type="text" className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Seu nome" />
        </div>

        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
        </div>

        {tipoPessoa === "fisica" ? (
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input type="text" className="form-input" value={cpf} onChange={(e) => setCpf(formatarCPF(e.target.value))} placeholder="000.000.000-00" required />
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">CNPJ</label>
              <input type="text" className="form-input" value={cnpj} onChange={(e) => setCnpj(formatarCNPJ(e.target.value))} placeholder="00.000.000/0000-00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Razão Social</label>
              <input type="text" className="form-input" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome da empresa" required />
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">Telefone</label>
          <input type="text" className="form-input" value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} required placeholder="(11) 91234-5678" />
        </div>

        <div className="form-group">
          <label className="form-label">Senha</label>
          <input type="password" className="form-input" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="Mínimo 8 caracteres" />
          <div className="password-meter">
            <div className="meter-fill" style={{ width: `${passwordStrength.score}%`, backgroundColor: passwordStrength.color }}></div>
          </div>
          {senha && <span className="meter-text" style={{ color: passwordStrength.color }}>Senha {passwordStrength.label}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirmar Senha</label>
          <input type="password" className={`form-input ${errors.match ? 'error' : ''}`} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required placeholder="Repita a senha" />
          {errors.match && <span className="error-msg">{errors.match}</span>}
        </div>

        <button type="submit" className="btn-primary-auth" disabled={loading || !!errors.match}>
          {loading ? "Processando..." : "Concluir Cadastro"}
        </button>

        {mensagem && <div className="auth-message-box error">{mensagem}</div>}
      </form>

      <div className="security-tag">
        🛡️ Seus dados estão protegidos
      </div>

      <div className="auth-footer">
        <p>Já possui uma conta? <Link to="/auth?mode=login">Acessar agora</Link></p>
      </div>
    </>
  );
};

export default Register;