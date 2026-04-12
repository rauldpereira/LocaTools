import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const ENDERECO_PADRAO = 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP';

const AdminStoreConfig: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    fidelidade_num_pedidos: 10,
    fidelidade_desconto_pct: 10.00,
    fidelidade_ativo: true,
    horario_limite_hoje: '12:00',
    cnpj: '00.000.000/0001-00',
    taxa_reagendamento: 0.00,
    frete: {
        preco_km: 0,
        taxa_fixa: 0,
        endereco_origem: '',
        raio_maximo_km: 50
    }
  });

  const [address, setAddress] = useState({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  const [isCustomAddress, setIsCustomAddress] = useState(false);

  const backendUrl = `${import.meta.env.VITE_API_URL}/api/config`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(backendUrl);
        if (data) {
          setConfig({
            fidelidade_num_pedidos: data.fidelidade_num_pedidos,
            fidelidade_desconto_pct: parseFloat(data.fidelidade_desconto_pct),
            fidelidade_ativo: data.fidelidade_ativo ?? true,
            horario_limite_hoje: data.horario_limite_hoje || '12:00',
            cnpj: data.cnpj || '00.000.000/0001-00',
            taxa_reagendamento: Number(data.taxa_reagendamento || 0),
            frete: {
                preco_km: Number(data.frete?.preco_km || 0),
                taxa_fixa: Number(data.frete?.taxa_fixa || 0),
                endereco_origem: data.frete?.endereco_origem || '',
                raio_maximo_km: Number(data.frete?.raio_maximo_km || 50)
            }
          });

          if (data.frete?.endereco_origem && data.frete?.endereco_origem !== ENDERECO_PADRAO) {
            setIsCustomAddress(true);
            tentaPreencherCampos(data.frete.endereco_origem);
          } else {
            setIsCustomAddress(false);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [backendUrl]);

  const tentaPreencherCampos = (enderecoCompleto: string) => {
    try {
        if (!enderecoCompleto) return;
        const partes = enderecoCompleto.split(',').map(p => p.trim());
        const rua = partes[0] || '';
        const numero = partes[1] || '';
        const bairro = partes[2] || '';
        let cidade = '';
        let uf = '';
        const parteCidadeUf = partes.find(p => p.includes(' - '));
        if (parteCidadeUf) {
            const divisao = parteCidadeUf.split(' - ');
            cidade = divisao[0].trim();
            uf = divisao[1].trim();
        }
        let cep = '';
        const ultimaParte = partes[partes.length - 1];
        const numerosCep = ultimaParte.replace(/\D/g, '');
        if (numerosCep.length === 8) {
            cep = numerosCep.replace(/^(\d{5})(\d{3})/, "$1-$2");
        }
        setAddress({ rua, numero, bairro, cidade, uf, cep });
    } catch (error) {
        console.error('Erro ao preencher campos do endereço:', error);
     }
  };

  const buscarCepNoApi = async (cepParaBuscar: string) => {
    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cepParaBuscar}/json/`);
        if (response.data.erro) return;
        setAddress(prev => ({
            ...prev,
            rua: response.data.logradouro,
            bairro: response.data.bairro,
            cidade: response.data.localidade,
            uf: response.data.uf,
            cep: cepParaBuscar
        }));
    } catch (error) {
        console.error('Erro ViaCEP:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let enderecoFinal = config.frete.endereco_origem;
      if (address.rua && address.numero) {
          enderecoFinal = `${address.rua}, ${address.numero}, ${address.bairro}, ${address.cidade} - ${address.uf}`;
          if (address.cep) enderecoFinal += `, ${address.cep}`;
      }

      const payload = {
          ...config,
          frete: {
              ...config.frete,
              endereco_origem: enderecoFinal || ENDERECO_PADRAO
          }
      };

      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(backendUrl, payload, authConfig);
      alert("✅ Configurações atualizadas com sucesso!");
      
      if (enderecoFinal && enderecoFinal !== ENDERECO_PADRAO) {
          setIsCustomAddress(true);
          setConfig(prev => ({ ...prev, frete: { ...prev.frete, endereco_origem: enderecoFinal } }));
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  if (loading) return <div>Carregando configurações...</div>;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "50px" }}>
      <h2 style={{ color: "#2c3e50", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "30px" }}>
        ⚙️ Configurações Gerais da Loja
      </h2>

      {/* PROGRAMA DE FIDELIDADE */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#007bff", display: "flex", alignItems: "center", gap: "10px" }}>
          Programa de Fidelidade
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Defina as regras para o desconto automático baseado no histórico de compras do cliente.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              id="fidelidade_ativo"
              checked={config.fidelidade_ativo}
              onChange={(e) => setConfig({ ...config, fidelidade_ativo: e.target.checked })}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
            <label htmlFor="fidelidade_ativo" style={{ fontWeight: "bold", cursor: "pointer", color: "#333" }}>
              Ativar Programa de Fidelidade
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", opacity: config.fidelidade_ativo ? 1 : 0.5, pointerEvents: config.fidelidade_ativo ? "auto" : "none" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>Número de Pedidos Finalizados</label>
            <input
              type="number"
              value={config.fidelidade_num_pedidos}
              onChange={(e) => setConfig({ ...config, fidelidade_num_pedidos: parseInt(e.target.value) || 0 })}
              style={inputStyle}
              min="1"
            />
            <small style={helpTextStyle}>A cada X pedidos completados, o próximo ganha desconto.</small>
          </div>

          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>Porcentagem de Desconto (%)</label>
            <input
              type="number"
              step="0.1"
              value={config.fidelidade_desconto_pct}
              onChange={(e) => setConfig({ ...config, fidelidade_desconto_pct: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
              min="0"
              max="100"
            />
            <small style={helpTextStyle}>Valor do desconto aplicado sobre o subtotal da locação.</small>
          </div>
        </div>
      </div>

      {/* LOGÍSTICA E FRETE */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#28a745", display: "flex", alignItems: "center", gap: "10px" }}>
          Logística e Frete
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Configure o endereço de saída e as taxas cobradas para entregas.
        </p>

        <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #eee" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "1rem", color: "#555" }}>Endereço da Loja (Saída)</h4>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "15px", marginBottom: "15px" }}>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>CEP</label>
                    <input
                        type="text"
                        maxLength={9}
                        value={address.cep}
                        onChange={(e) => setAddress({ ...address, cep: e.target.value })}
                        onBlur={(e) => {
                            const limpo = e.target.value.replace(/\D/g, '');
                            if (limpo.length === 8) buscarCepNoApi(limpo);
                        }}
                        style={inputStyle}
                        placeholder="00000-000"
                    />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Rua / Logradouro</label>
                    <input
                        type="text"
                        value={address.rua}
                        onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                        style={{ ...inputStyle, backgroundColor: address.rua ? "#e9ecef" : "#fff" }}
                    />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Número</label>
                    <input
                        type="text"
                        value={address.numero}
                        onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                        style={inputStyle}
                        placeholder="1000"
                    />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "15px" }}>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Bairro</label>
                    <input
                        type="text"
                        value={address.bairro}
                        onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                        style={{ ...inputStyle, backgroundColor: address.bairro ? "#e9ecef" : "#fff" }}
                    />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Cidade</label>
                    <input
                        type="text"
                        value={address.cidade}
                        onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                        style={{ ...inputStyle, backgroundColor: address.cidade ? "#e9ecef" : "#fff" }}
                    />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>UF</label>
                    <input
                        type="text"
                        maxLength={2}
                        value={address.uf}
                        onChange={(e) => setAddress({ ...address, uf: e.target.value })}
                        style={{ ...inputStyle, backgroundColor: address.uf ? "#e9ecef" : "#fff" }}
                    />
                </div>
            </div>
            {isCustomAddress && (
                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "4px", fontSize: "0.85rem", color: "#856404" }}>
                    <strong>Endereço Atual:</strong> {config.frete.endereco_origem}
                </div>
            )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Preço por KM (R$)</label>
                <input
                    type="number"
                    step="0.01"
                    value={config.frete.preco_km}
                    onChange={(e) => setConfig({ ...config, frete: { ...config.frete, preco_km: parseFloat(e.target.value) || 0 } })}
                    style={inputStyle}
                />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Taxa Fixa de Saída (R$)</label>
                <input
                    type="number"
                    step="0.01"
                    value={config.frete.taxa_fixa}
                    onChange={(e) => setConfig({ ...config, frete: { ...config.frete, taxa_fixa: parseFloat(e.target.value) || 0 } })}
                    style={inputStyle}
                />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Raio Máximo (KM)</label>
                <input
                    type="number"
                    value={config.frete.raio_maximo_km}
                    onChange={(e) => setConfig({ ...config, frete: { ...config.frete, raio_maximo_km: parseInt(e.target.value) || 0 } })}
                    style={inputStyle}
                />
            </div>
        </div>
      </div>

      {/* TAXAS EXTRAS */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#6f42c1", display: "flex", alignItems: "center", gap: "10px" }}>
          Taxas Extras
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Configure taxas adicionais cobradas por alterações ou serviços especiais.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>Taxa de Reagendamento (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.taxa_reagendamento}
              onChange={(e) => setConfig({ ...config, taxa_reagendamento: parseFloat(e.target.value) || 0 })}
              style={inputStyle}
              min="0"
            />
            <small style={helpTextStyle}>
              Valor fixo cobrado a cada vez que o cliente solicita a remarcação de um pedido.
            </small>
          </div>
        </div>
      </div>

      {/* TRAVAS */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#dc3545", display: "flex", alignItems: "center", gap: "10px" }}>
          Trava de Locação (Mesmo Dia)
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Defina até que horas um cliente pode solicitar uma locação para começar no próprio dia de hoje.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>Horário Limite</label>
            <input
              type="time"
              value={config.horario_limite_hoje}
              onChange={(e) => setConfig({ ...config, horario_limite_hoje: e.target.value })}
              style={inputStyle}
            />
            <small style={helpTextStyle}>
              Exemplo: Se definido como 12:00, às 12:01 ninguém poderá alugar algo para hoje.
            </small>
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES LEGAIS */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#17a2b8", display: "flex", alignItems: "center", gap: "10px" }}>
          Informações Legais
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Dados que aparecerão nos contratos e termos de devolução.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>CNPJ da Loja</label>
            <input
              type="text"
              value={config.cnpj}
              onChange={(e) => setConfig({ ...config, cnpj: formatCNPJ(e.target.value) })}
              style={inputStyle}
              placeholder="00.000.000/0001-00"
            />
            <small style={helpTextStyle}>Este CNPJ será impresso automaticamente nos documentos em PDF.</small>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "15px 40px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1.1rem",
            boxShadow: "0 4px 6px rgba(40,167,69,0.2)",
          }}
        >
          {saving ? "Salvando..." : "Salvar Todas as Configurações"}
        </button>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  border: "1px solid #f0f0f0",
  marginTop: "20px",
};

const formGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#555",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "1rem",
  boxSizing: "border-box",
  outline: "none",
};

const helpTextStyle: React.CSSProperties = {
  display: "block",
  marginTop: "5px",
  color: "#888",
  fontSize: "0.8rem",
};

export default AdminStoreConfig;