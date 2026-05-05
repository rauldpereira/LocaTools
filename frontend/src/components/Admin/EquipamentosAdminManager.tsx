import React, { useState, useEffect } from "react";
import MaintenanceDashboard from "../MaintenanceDashboard";
import EquipamentosEmLocacao from "./EquipamentosEmLocacao";
import EquipmentForm from "./EquipmentForm";
import EquipmentList from "./EquipmentList";
import { Settings, Wrench, PlusCircle, List } from "lucide-react";

type EquipSubTab = "locacao" | "manutencao" | "inventario" | "cadastro";

const EquipamentosAdminManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EquipSubTab>(() => (sessionStorage.getItem("adminEquipTab") as EquipSubTab) || "locacao");

  useEffect(() => {
    sessionStorage.setItem("adminEquipTab", activeTab);
  }, [activeTab]);

  const getTabStyle = (isActive: boolean) => ({
    padding: "14px 24px",
    border: "none",
    background: isActive ? "#2563eb" : "transparent",
    color: isActive ? "#fff" : "#64748b",
    fontWeight: "bold" as const,
    cursor: "pointer",
    borderRadius: "10px",
    transition: "all 0.2s",
    fontSize: "0.95rem",
    whiteSpace: "nowrap" as const,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.6rem", fontWeight: 800 }}>
          Gestão de Equipamentos
        </h2>
      </div>

      {/* MENUS DAS ABAS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "30px", overflowX: "auto", paddingBottom: "10px" }}>
        <button onClick={() => setActiveTab("locacao")} style={getTabStyle(activeTab === "locacao")}>
          <Wrench size={18} /> Equipamentos em Locação
        </button>
        <button onClick={() => setActiveTab("manutencao")} style={getTabStyle(activeTab === "manutencao")}>
          <Settings size={18} /> Manutenções
        </button>
        <button onClick={() => setActiveTab("inventario")} style={getTabStyle(activeTab === "inventario")}>
          <List size={18} /> Inventário Completo
        </button>
        <button onClick={() => setActiveTab("cadastro")} style={getTabStyle(activeTab === "cadastro")}>
          <PlusCircle size={18} /> Cadastrar Equipamento
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        {activeTab === "locacao" && <EquipamentosEmLocacao />}
        {activeTab === "manutencao" && <MaintenanceDashboard />}
        {activeTab === "inventario" && <EquipmentList />}
        {activeTab === "cadastro" && <EquipmentForm />}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default EquipamentosAdminManager;