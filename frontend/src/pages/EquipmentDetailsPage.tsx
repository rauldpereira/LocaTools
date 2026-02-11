import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import AvailabilityCalendarModal from '../components/AvailabilityCalendarModal';

interface Categoria {
  id: number;
  nome: string;
}

interface EquipmentDetails {
  id: number;
  nome: string;
  descricao: string;
  preco_diaria: number;
  status: string;
  url_imagem?: string;
  total_quantidade: number;
  Categoria: Categoria;
}

const EquipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mainImage, setMainImage] = useState<string>('https://via.placeholder.com/400?text=Sem+Foto');
  const [gallery, setGallery] = useState<string[]>([]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!id) {
      setError('ID do equipamento não fornecido.');
      setLoading(false);
      return;
    }
    const fetchEquipment = async () => {
      try {
        const response = await axios.get<any>(`http://localhost:3001/api/equipment/${id}`);
        const data = response.data;

        setEquipment({
          ...data,
          preco_diaria: parseFloat(data.preco_diaria),
          total_quantidade: parseInt(data.total_quantidade)
        });

        // --- Lógica para processar as imagens ---
        if (data.url_imagem) {
          try {
            const parsed = JSON.parse(data.url_imagem);
            
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Adiciona o domínio do backend em cada URL
              const fullUrls = parsed.map((url: string) => `http://localhost:3001${url}`);
              setGallery(fullUrls);
              setMainImage(fullUrls[0]); // Define a primeira como capa
            }
          } catch (e) {
            const singleUrl = data.url_imagem.startsWith('http') 
              ? data.url_imagem 
              : `http://localhost:3001${data.url_imagem}`;
            
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
      <div style={{ padding: '2rem', marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <h1 style={{ marginBottom: '2rem' }}>{equipment.nome}</h1>
          
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            
            {/* --- COLUNA DA ESQUERDA: GALERIA --- */}
            <div style={{ flex: '1 1 400px', maxWidth: '600px' }}>
              
              {/* Foto Grande Principal */}
              <div style={{ 
                width: '100%', 
                height: '400px', 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #ddd',
                borderRadius: '8px', 
                overflow: 'hidden', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <img
                  src={mainImage}
                  alt={equipment.nome}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Tira de Miniaturas (Só vai aparecer se tiver + de 1 foto) */}
              {gallery.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                  {gallery.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Miniatura ${index}`}
                      onClick={() => setMainImage(img)} // Ao clicar, troca a foto principal
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'cover', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        border: mainImage === img ? '2px solid #007bff' : '1px solid #ddd', // Destaca a selecionada
                        opacity: mainImage === img ? 1 : 0.7
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* --- COLUNA DA DIREITA: DETALHES --- */}
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#555', marginBottom: '1.5rem' }}>
                  {equipment.descricao}
                </p>
                
                <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '1.5rem 0' }} />

                <p style={{ marginBottom: '10px', color: "#000" }}><strong>Categoria:</strong> {equipment.Categoria?.nome}</p>
                <p style={{ marginBottom: '10px', color: "#000" }}><strong>Total em Estoque:</strong> {equipment.total_quantidade}</p>
                
                <p style={{ marginTop: '1.5rem', fontSize: '1.5rem', color: '#28a745', fontWeight: 'bold' }}>
                  R$ {equipment.preco_diaria.toFixed(2)} <span style={{ fontSize: '1rem', color: '#666', fontWeight: 'normal' }}>/ dia</span>
                </p>

                <button
                  onClick={handleOpenModal}
                  style={{ 
                    marginTop: '2rem', 
                    padding: '1rem', 
                    fontSize: '1.1rem', 
                    width: '100%',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  Ver Agendamento e Disponibilidade
                </button>
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