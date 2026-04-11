import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

export interface FreightConfig {
  id?: number;
  preco_km: number;
  taxa_fixa: number;
  endereco_origem: string;
  raio_maximo_km: number;
}

export const freightService = {
  // Pega a config atual
  getConfig: async () => {
    const token = localStorage.getItem('token'); // Se seu app usa token, manda ele
    const response = await axios.get<FreightConfig>(`${API_URL}/frete/config`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Salva as mudanças
  updateConfig: async (data: FreightConfig) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/frete/config`, data, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Calcula frete (pra usar no carrinho depois)
  calculateFreight: async (endereco_destino: string) => {
    const response = await axios.post(`${API_URL}/frete/calcular`, { endereco_destino });
    return response.data;
  }
};