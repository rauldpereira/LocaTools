const axios = require('axios');
const { FreteConfig } = require('../models');

const ORS_API_KEY = process.env.ORS_API_KEY;

const HEADERS_OSM = { 'User-Agent': 'LocaToolsApp/1.0' };

// Função pra esperar pra API do OSM não bloquear por excesso de requisições 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const freightController = {

    calcular: async (req, res) => {
        const { endereco_destino } = req.body; 

        if (!ORS_API_KEY) {
            console.error('ERRO: Chave da API OpenRouteService não configurada no .env');
            return res.status(500).json({ error: 'Erro de configuração no servidor (API Key).' });
        }

        try {
            // Pega Configuração do Admin posta sobre a loja, se nn tiver, cria com valores padrão 
            let config = await FreteConfig.findOne();
            if (!config) {
                config = await FreteConfig.create({
                    preco_km: 3.00,
                    taxa_fixa: 20.00,
                    endereco_origem: 'Pindamonhangaba, SP'
                });
            }

            // GEOCODIFICAÇÃO (Endereço -> Lat/Lon)
            
            // Acha a Loja
            const urlOrigem = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(config.endereco_origem)}&limit=1`;
            const resOrigem = await axios.get(urlOrigem, { headers: HEADERS_OSM });
            
            if (!resOrigem.data || resOrigem.data.length === 0) {
                return res.status(400).json({ error: 'Endereço da LOJA inválido ou não encontrado no mapa.' });
            }
            const loja = { 
                lat: resOrigem.data[0].lat, 
                lon: resOrigem.data[0].lon 
            };

            await sleep(1000);

            // Localiza o Cliente
            const urlDestino = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco_destino)}&limit=1`;
            const resDestino = await axios.get(urlDestino, { headers: HEADERS_OSM });

            if (!resDestino.data || resDestino.data.length === 0) {
                return res.status(400).json({ error: 'Endereço de ENTREGA não encontrado. Tente ser mais específico (Rua, Número, Cidade).' });
            }
            const cliente = { 
                lat: resDestino.data[0].lat, 
                lon: resDestino.data[0].lon,
                nome_formatado: resDestino.data[0].display_name
            };


            // Monta a URL da API de Rotas
            const start = `${loja.lon},${loja.lat}`;
            const end = `${cliente.lon},${cliente.lat}`;
            
            const urlRota = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start}&end=${end}`;

            const resRota = await axios.get(urlRota, {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const dadosRota = resRota.data;

            if (!dadosRota.features || dadosRota.features.length === 0) {
                return res.status(400).json({ error: 'Não foi possível traçar uma rota de carro para este local.' });
            }

            // Extrai dados (A API devolve em Metros e Segundos)
            const propriedades = dadosRota.features[0].properties;
            const distanciaMetros = propriedades.segments[0].distance;
            const duracaoSegundos = propriedades.segments[0].duration;

            const distanciaKm = distanciaMetros / 1000;
            const duracaoMinutos = Math.round(duracaoSegundos / 60);

            // Verifica Raio Máximo
            if (config.raio_maximo_km && distanciaKm > config.raio_maximo_km) {
                return res.status(400).json({ 
                    error: `Endereço muito distante (${distanciaKm.toFixed(1)}km). O limite é ${config.raio_maximo_km}km.` 
                });
            }

            // A CONTA: (Ida + Volta) * Preço + Taxa
            const custoKm = (distanciaKm * 2) * parseFloat(config.preco_km);
            const totalFrete = custoKm + parseFloat(config.taxa_fixa);

            res.json({
                origem: config.endereco_origem,
                destino: cliente.nome_formatado,
                
                // Dados da Viagem
                distancia_km: parseFloat(distanciaKm.toFixed(2)),
                duracao_estimada: `${duracaoMinutos} min`,
                
                // Valores
                preco_km_admin: config.preco_km,
                taxa_fixa_admin: config.taxa_fixa,
                valor_total_frete: parseFloat(totalFrete.toFixed(2))
            });

        } catch (error) {
            console.error('Erro API Rota:', error.response?.data || error.message);
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                return res.status(500).json({ error: 'Erro de Autenticação na API de Mapas. Verifique a chave no .env' });
            }
            
            res.status(500).json({ error: 'Erro ao calcular rota de entrega.' });
        }
    },

    // --- FUNÇÕES DO ADMIN ---

    configurar: async (req, res) => {
        const { preco_km, taxa_fixa, endereco_origem, raio_maximo_km } = req.body;
        try {
            let config = await FreteConfig.findOne();
            if (config) {
                await config.update({ preco_km, taxa_fixa, endereco_origem, raio_maximo_km });
            } else {
                config = await FreteConfig.create({ preco_km, taxa_fixa, endereco_origem, raio_maximo_km });
            }
            res.json({ message: 'Regras de frete atualizadas!', config });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao salvar configurações.' });
        }
    },

    obterConfig: async (req, res) => {
        const config = await FreteConfig.findOne();
        res.json(config || {});
    }
};

module.exports = freightController;