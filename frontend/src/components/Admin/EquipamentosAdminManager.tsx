import React, { useState, useEffect } from "react";
import MaintenanceDashboard from "../MaintenanceDashboard";
import EquipamentosEmLocacao from "./EquipamentosEmLocacao";
import EquipmentForm from "./EquipmentForm";
import EquipmentList from "./EquipmentList";
import { Settings, Wrench, PlusCircle, List, HelpCircle, X } from "lucide-react";

type EquipSubTab = "locacao" | "manutencao" | "inventario" | "cadastro";

const EquipamentosAdminManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EquipSubTab>(() => (sessionStorage.getItem("adminEquipTab") as EquipSubTab) || "locacao");
  const [showManual, setShowManual] = useState(false);

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
      <div style={{ marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.6rem", fontWeight: 800 }}>
            Gestão de Equipamentos
          </h2>
          <p style={{ color: "#64748b", margin: "5px 0 0 0", fontSize: "0.95rem" }}>
            Acompanhe o estoque, cadastre novos itens e gerencie manutenções.
          </p>
        </div>
        <button 
          onClick={() => setShowManual(true)}
          title="Manual do Usuário"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
        >
          <HelpCircle size={24} />
        </button>
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

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={modalOverlayStyle} onClick={() => setShowManual(false)}>
          <div style={{ ...modalContentStyle, maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={manualHeaderStyle}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Gestão de Equipamentos
              </h3>
              <button onClick={() => setShowManual(false)} style={manualCloseBtnStyle}><X size={22} /></button>
            </div>
            
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Aqui você gerencia todo o ciclo de vida do maquinário e ferramentas.</p>
                
                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>1</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Equipamentos em Locação:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Visualize rapidamente quais itens estão em locação no momento. Essencial para controle rápido do inventário.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>2</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Manutenções:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Controle os equipamentos quebrados ou em revisão. Finalize as manutenções aqui para que as unidades voltem a ficar disponíveis para aluguel.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>3</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Inventário Completo:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>A listagem geral do seu estoque. Você pode adicionar unidades (patrimônios individuais) e configurar categorias. Excluir um modelo aqui apagará todas as unidades dele. Você pode editar todos os dados do equipamento clicando no ícone de lápis. Também pode gerenciar cada unidade do equipamento clicando no ícone de caixa, podendo ver suas avarias, agendar uma manutenção e fazer uma locação de balcão para algum client. Você também pode excluir a unidade. Caso uma unidade seja excluída ou entre em manutenção, as locações que estavam agendadas para ela no período serão transferidas para outra unidade do mesmo modelo, desde que esteja livre.</p>
                  </div>
                </div>

                <div style={manualStepStyle}>
                  <div style={stepNumStyle}>4</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Cadastrar Equipamento:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Formulário para adicionar novos modelos ao catálogo da loja. Preencha descrição, foto e valores cobrados.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// Estilos do Modal Manual
const modalOverlayStyle: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: "#fff", borderRadius: "16px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column" };
const manualHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" };
const manualCloseBtnStyle: React.CSSProperties = { background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" };
const manualStepStyle: React.CSSProperties = { display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" };
const stepNumStyle: React.CSSProperties = { width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 };

export default EquipamentosAdminManager;