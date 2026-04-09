import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AdminStoreConfig: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    fidelidade_num_pedidos: 10,
    fidelidade_desconto_pct: 10.00,
  });

  const backendUrl = "http://localhost:3001/api/config";

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(backendUrl);
        if (data) {
          setConfig({
            fidelidade_num_pedidos: data.fidelidade_num_pedidos,
            fidelidade_desconto_pct: parseFloat(data.fidelidade_desconto_pct),
          });
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const authConfig = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(backendUrl, config, authConfig);
      alert("✅ Configurações atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando configurações...</div>;

  return (
    <div style={{ maxWidth: "800px" }}>
      <h2 style={{ color: "#2c3e50", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
        ⚙️ Configurações Gerais da Loja
      </h2>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#007bff", display: "flex", alignItems: "center", gap: "10px" }}>
          🎁 Programa de Fidelidade
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
          Defina as regras para o desconto automático baseado no histórico de compras do cliente.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "250px" }}>
            <label style={labelStyle}>Número de Pedidos Finalizados</label>
            <input
              type="number"
              value={config.fidelidade_num_pedidos}
              onChange={(e) => setConfig({ ...config, fidelidade_num_pedidos: parseInt(e.target.value) })}
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
              onChange={(e) => setConfig({ ...config, fidelidade_desconto_pct: parseFloat(e.target.value) })}
              style={inputStyle}
              min="0"
              max="100"
            />
            <small style={helpTextStyle}>Valor do desconto aplicado sobre o subtotal da locação.</small>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 30px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1rem",
            boxShadow: "0 4px 6px rgba(40,167,69,0.2)",
          }}
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
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