import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import AvailabilityCalendarModal from '../components/AvailabilityCalendarModal';
import '../styles/EquipmentDetailsPage.css';

interface Categoria {
  id: number;
  nome: string;
}

interface EquipmentDetails {
  id: number;
  nome: string;
  descricao: string;
  preco_diaria: number;
  preco_semanal?: number;
  preco_quinzenal?: number;
  preco_mensal?: number;
  status: string;
  url_imagem?: string;
  total_quantidade: number;
  Categoria: Categoria;
}

const EquipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mainImage, setMainImage] = useState<string>('https://via.placeholder.com/400?text=Sem+Foto');
  const [gallery, setGallery] = useState<string[]>([]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCategoryClick = () => {
    if (equipment?.Categoria) {
      navigate(`/?category=${equipment.Categoria.id}`);
    }
  };

  const handleNextImage = () => {
    if (gallery.length <= 1) return;
    const currentIndex = gallery.indexOf(mainImage);
    const nextIndex = (currentIndex + 1) % gallery.length;
    setMainImage(gallery[nextIndex]);
  };

  const handlePrevImage = () => {
    if (gallery.length <= 1) return;
    const currentIndex = gallery.indexOf(mainImage);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setMainImage(gallery[prevIndex]);
  };

  useEffect(() => {
    if (!id) {
      setError('ID do equipamento não fornecido.');
      setLoading(false);
      return;
    }
    const fetchEquipment = async () => {
      try {
        const response = await axios.get<any>(`${import.meta.env.VITE_API_URL}/api/equipment/${id}`);
        const data = response.data;

        setEquipment({
          ...data,
          preco_diaria: parseFloat(data.preco_diaria),
          preco_semanal: data.preco_semanal ? parseFloat(data.preco_semanal) : undefined,
          preco_quinzenal: data.preco_quinzenal ? parseFloat(data.preco_quinzenal) : undefined,
          preco_mensal: data.preco_mensal ? parseFloat(data.preco_mensal) : undefined,
          total_quantidade: parseInt(data.total_quantidade)
        });

        if (data.url_imagem) {
          try {
            const parsed = JSON.parse(data.url_imagem);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const fullUrls = parsed.map((url: string) => `${import.meta.env.VITE_API_URL}${url}`);
              setGallery(fullUrls);
              setMainImage(fullUrls[0]);
            }
          } catch (e) {
            const singleUrl = data.url_imagem.startsWith('http') 
              ? data.url_imagem 
              : `${import.meta.env.VITE_API_URL}${data.url_imagem}`;
            setGallery([singleUrl]);
            setMainImage(singleUrl);
          }
        }
      } catch (err) {
        setError('Falha ao carregar os detalhes do equipamento.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [id]);

  if (loading) { return <div style={{ paddingTop: '80px', textAlign: 'center' }}>Carregando...</div>; }
  if (error) { return <div style={{ paddingTop: '80px', textAlign: 'center', color: 'red' }}>{error}</div>; }
  if (!equipment) { return <div style={{ paddingTop: '80px', textAlign: 'center' }}>Equipamento não encontrado.</div>; }

  return (
    <>
      <div className="equipment-details-container">
        <div className="equipment-details-content">
          
          {/* Breadcrumb: Equipamentos > Categoria */}
          <div className="breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate('/')}>Equipamentos</span>
            {' > '}
            <span className="breadcrumb-link" onClick={handleCategoryClick}>{equipment.Categoria?.nome}</span>
          </div>

          <div className="details-main-grid">
            
            {/* --- COLUNA DA ESQUERDA: GALERIA (THUMBS + MAIN) --- */}
            <div className="gallery-column">
              
              {gallery.length > 1 && (
                <div className="thumbnails-container">
                  {gallery.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Miniatura ${index}`}
                      onClick={() => setMainImage(img)}
                      className={`thumbnail-img ${mainImage === img ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}

              <div className="main-image-container">
                {gallery.length > 1 && (
                  <button className="nav-arrow prev" onClick={handlePrevImage}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                  </button>
                )}
                
                <img
                  src={mainImage}
                  alt={equipment.nome}
                  className="main-image"
                />

                {gallery.length > 1 && (
                  <button className="nav-arrow next" onClick={handleNextImage}>
                    <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* --- COLUNA DA DIREITA: DETALHES E PREÇOS --- */}
            <div className="details-column">
              <div className="price-card-container">
                <div>
                  <h1 className="equipment-title">{equipment.nome}</h1>
                  
                  <div className="badge-container">
                    <span className="info-badge">
                      {equipment.Categoria?.nome}
                    </span>
                    <span className="info-badge">
                      Estoque: {equipment.total_quantidade} unidades
                    </span>
                  </div>
                  
                  <h3 className="section-subtitle">Planos de Locação</h3>
                  
                  <div className="price-grid">
                    <div className="price-item">
                      <span className="price-label">Diária</span>
                      <span className="price-value">R$ {equipment.preco_diaria.toFixed(2)}</span>
                    </div>

                    {equipment.preco_semanal && (
                      <div className="price-item promo">
                        <span className="price-label">
                          Semanal <span className="discount">-{Math.round((1 - (equipment.preco_semanal / 7 / equipment.preco_diaria)) * 100)}%</span>
                        </span>
                        <span className="price-value">R$ {equipment.preco_semanal.toFixed(2)}</span>
                        <span className="daily-equivalent">R$ {(equipment.preco_semanal / 7).toFixed(2)} / dia</span>
                      </div>
                    )}

                    {equipment.preco_quinzenal && (
                      <div className="price-item promo">
                        <span className="price-label">
                          15 Dias <span className="discount">-{Math.round((1 - (equipment.preco_quinzenal / 15 / equipment.preco_diaria)) * 100)}%</span>
                        </span>
                        <span className="price-value">R$ {equipment.preco_quinzenal.toFixed(2)}</span>
                        <span className="daily-equivalent">R$ {(equipment.preco_quinzenal / 15).toFixed(2)} / dia</span>
                      </div>
                    )}

                    {equipment.preco_mensal && (
                      <div className="price-item promo">
                        <span className="price-label">
                          Mensal <span className="discount">-{Math.round((1 - (equipment.preco_mensal / 30 / equipment.preco_diaria)) * 100)}%</span>
                        </span>
                        <span className="price-value">R$ {equipment.preco_mensal.toFixed(2)}</span>
                        <span className="daily-equivalent">R$ {(equipment.preco_mensal / 30).toFixed(2)} / dia</span>
                      </div>
                    )}
                  </div>
                </div>

                <button className="btn-schedule" onClick={handleOpenModal}>
                  Ver Disponibilidade e Agendar
                </button>
              </div>
            </div>

            {/* --- DESCRIÇÃO ABAIXO --- */}
            <div className="full-description-section">
              <h3 className="description-title">Descrição Completa</h3>
              <div className="description-card">
                <p className="description-text">
                  {equipment.descricao}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {isModalOpen && (
        <AvailabilityCalendarModal
          equipment={equipment}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default EquipmentDetailsPage;