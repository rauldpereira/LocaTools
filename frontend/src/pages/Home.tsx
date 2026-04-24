import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';

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
  const location = useLocation();

  // Filtros Locais
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("asc");

  // Busca Global da Navbar
  const { searchTerm, setSearchTerm } = useSearch();

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
        const [eqRes, catRes] = await Promise.all([
          axios.get<any[]>(`${import.meta.env.VITE_API_URL}/api/equipment`),
          axios.get<Categoria[]>(`${import.meta.env.VITE_API_URL}/api/categories`)
        ]);

        const formattedEquipment: Equipment[] = eqRes.data.map(item => ({
          ...item,
          preco_diaria: parseFloat(item.preco_diaria)
        }));

        setEquipment(formattedEquipment);
        setCategories(catRes.data);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processarImagemParaExibicao = (urlImagem: string | null) => {
    if (!urlImagem) return 'https://via.placeholder.com/150';
    try {
      const parsed = JSON.parse(urlImagem);
      if (Array.isArray(parsed) && parsed.length > 0) return `${import.meta.env.VITE_API_URL}${parsed[0]}`;
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

  if (loading) return <div className="home-container" style={{ textAlign: 'center' }}>Carregando equipamentos...</div>;

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Nossos Equipamentos</h1>
        <p>Soluções profissionais para sua obra ou projeto</p>
      </header>

      {/* BARRA DE FILTROS REFINADA */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Filtrar por Categoria</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Ordenar por Preço</label>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="filter-select"
          >
            <option value="asc">Menor Preço</option>
            <option value="desc">Maior Preço</option>
          </select>
        </div>
      </div>

      <div className="equipment-grid">
        {filteredEquipment.length > 0 ? (
          filteredEquipment.map((item) => (
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
    </div>
  );
};

export default Home;