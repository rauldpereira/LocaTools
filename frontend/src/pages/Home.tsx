import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { HelpCircle, X, ShoppingCart, CalendarSearch, FileSignature } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';

interface Categoria {
  id: number;
  nome: string;
}

interface Equipment {
  id: number;
  nome: string;
  descricao: string;
  preco_diaria: number;
  url_imagem?: string;
  Categoria: Categoria;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const Home: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const location = useLocation();

  // Filtros Locais
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("asc");

  // Busca Global da Navbar
  const { searchTerm, setSearchTerm } = useSearch();

  const [showManual, setShowManual] = useState(false);

  //  Scroll Infinito (Client-side)
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const catId = queryParams.get('category');
    if (catId) {
      setSelectedCategory(catId);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eqRes, catRes, configRes] = await Promise.all([
          axios.get<any[]>(`${import.meta.env.VITE_API_URL}/api/equipment`),
          axios.get<Categoria[]>(`${import.meta.env.VITE_API_URL}/api/categories`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/config`).catch(() => ({ data: null }))
        ]);

        const formattedEquipment: Equipment[] = eqRes.data.map(item => ({
          ...item,
          preco_diaria: parseFloat(item.preco_diaria)
        }));

        setEquipment(formattedEquipment);
        setCategories(catRes.data);
        if (configRes.data) setStoreConfig(configRes.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Reseta a quantidade visível sempre que os filtros mudarem
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, selectedCategory, sortOrder]);

  const processarImagemParaExibicao = (urlImagem: string | null) => {
    if (!urlImagem) return 'https://via.placeholder.com/150';
    try {
      const parsed = JSON.parse(urlImagem);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstImage = parsed[0];
        return firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_URL}${firstImage}`;
      }
    } catch (e) {
      if (urlImagem.startsWith('http')) return urlImagem;
      return `${import.meta.env.VITE_API_URL}${urlImagem}`;
    }
    return 'https://via.placeholder.com/150';
  };

  // Filtragem e Ordenação
  const filteredEquipment = equipment
    .filter(item => {
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || item.Categoria?.id === Number(selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") return a.preco_diaria - b.preco_diaria;
      if (sortOrder === "desc") return b.preco_diaria - a.preco_diaria;
      return 0;
    });

  const displayedEquipment = filteredEquipment.slice(0, visibleCount);

  // Lógica do Scroll Infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loading, displayedEquipment.length]);

  if (loading) return <div className="home-container" style={{ textAlign: 'center' }}>Carregando equipamentos...</div>;

  return (
    <div className="home-container" style={{ position: 'relative' }}>
      <header className="home-header" style={{ position: 'relative' }}>
        <h1>Nossos Equipamentos</h1>
        <p>Soluções profissionais para sua obra ou projeto</p>
        <button
            onClick={() => setShowManual(true)}
            title="Como Alugar?"
            style={{ 
                position: 'absolute', top: '10px', right: '10px',
                display: "flex", alignItems: "center", justifyContent: "center", gap: '8px',
                padding: "8px 15px", borderRadius: "20px", border: "1px solid #e2e8f0", 
                backgroundColor: "#fff", color: "#2563eb", cursor: "pointer", 
                transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                fontWeight: 'bold', fontSize: '0.9rem'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
          >
            <HelpCircle size={20} /> Como Alugar?
        </button>
      </header>

      {/* BARRA DE FILTROS */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Filtrar por Categoria</label>
          <CustomDropdown 
            value={selectedCategory} 
            onChange={(val) => setSelectedCategory(val)}
            options={[
              { value: "all", label: "Todas as Categorias" },
              ...categories.map(cat => ({ value: cat.id, label: cat.nome }))
            ]}
            searchable={true}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Ordenar por Preço</label>
          <CustomDropdown 
            value={sortOrder} 
            onChange={(val) => setSortOrder(val as "asc" | "desc")}
            options={[
              { value: "asc", label: "Menor Preço" },
              { value: "desc", label: "Maior Preço" }
            ]}
          />
        </div>
      </div>

      <div className="equipment-grid">
        {displayedEquipment.length > 0 ? (
          displayedEquipment.map((item) => (
            <Link key={item.id} to={`/equipment/${item.id}`} className="equipment-card">
              <div className="card-image">
                <img src={processarImagemParaExibicao(item.url_imagem || null)} alt={item.nome} />
                <span className="category-badge">{item.Categoria?.nome || 'Geral'}</span>
              </div>
              <div className="card-content">
                <h3>{item.nome}</h3>
                <p className="description">{truncateText(item.descricao, 80)}</p>
                <div className="card-footer">
                  <div className="price-tag">
                    <span className="currency">R$</span>
                    <span className="value">{item.preco_diaria.toFixed(2)}</span>
                    <span className="period">/dia</span>
                  </div>
                  <span className="btn-details">Alugar</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="no-results">
            <p>Nenhum equipamento encontrado para esta busca.</p>
            <button onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }} className="btn-clear">Limpar Filtros</button>
          </div>
        )}
      </div>

      {displayedEquipment.length < filteredEquipment.length && (
        <div ref={loaderRef} style={{ height: "40px", margin: "20px 0", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <span style={{ color: "#64748b" }}>Carregando mais equipamentos...</span>
        </div>
      )}

      {/* MODAL MANUAL */}
      {showManual && (() => {
        const pctSinal = storeConfig?.sinal_porcentagem ? Number(storeConfig.sinal_porcentagem) : 50;
        const isCemPorcento = pctSinal >= 100;

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" }} onClick={() => setShowManual(false)}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                  <HelpCircle size={22} color="#2563eb" /> Como Alugar na LocaTools
                </h3>
                <button onClick={() => setShowManual(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}><X size={22} /></button>
              </div>

              <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1 }}>
                <div style={{ color: "#475569", lineHeight: "1.6" }}>
                  <p style={{ marginBottom: "25px", fontSize: "1rem" }}>
                    Alugar seus equipamentos conosco é rápido e fácil. Siga os passos abaixo:
                  </p>

                  <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>1</div>
                    <div>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><ShoppingCart size={16} color="#3b82f6"/> Escolha seus Equipamentos:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>Navegue pela nossa vitrine (ou use os filtros disponíveis) e clique no equipamento desejado.</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>2</div>
                    <div>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><CalendarSearch size={16} color="#3b82f6"/> Defina o Plano e as Datas:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>Na página do equipamento, escolha o plano de locação (diária, semanal, quinzenal ou mensal), selecione as datas desejadas e a quantidade de unidades disponíveis para esse período. Em seguida, adicione ao carrinho.</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>3</div>
                    <div>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FileSignature size={16} color="#3b82f6"/> Frete e Pagamento:</strong>
                      <p style={{ margin: "5px 0 0 0" }}>
                        Acesse o seu carrinho, escolha entre entrega na sua obra ou retirada na loja e prossiga para o pagamento. 
                        {isCemPorcento 
                          ? " Realize o pagamento integral para reservar a máquina. " 
                          : ` Realize o pagamento do Sinal (${pctSinal}%) para reservar a máquina. `
                        } 
                        Após o pagamento, é só aguardar o dia da entrega ou retirada!
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Home;