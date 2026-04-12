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
            let config = await FreteConfig.findOne();
            if (!config) {
                config = await FreteConfig.create({
                    preco_km: 3.00,
                    taxa_fixa: 20.00,
                    endereco_origem: 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP'
                });
            }

            // --- LÓGICA DE ORIGEM---
            let loja = { lat: config.lat_origem, lon: config.lon_origem };

            if (!loja.lat || !loja.lon) {
                console.log(`[Frete] Buscando coordenadas da loja pela primeira vez: ${config.endereco_origem}`);
                const urlOrigem = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(config.endereco_origem)}&limit=1`;
                try {
                    const resOrigem = await axios.get(urlOrigem, { headers: HEADERS_OSM });
                    if (resOrigem.data && resOrigem.data.length > 0) {
                        loja = { lat: resOrigem.data[0].lat, lon: resOrigem.data[0].lon };
                        await config.update({ lat_origem: loja.lat, lon_origem: loja.lon });
                    }
                } catch (err) {
                    console.error('[Frete] Erro ao buscar coordenadas da loja:', err.message);
                }
            }

            if (!loja.lat || !loja.lon) {
                return res.status(400).json({ error: 'Endereço da LOJA não pôde ser geolocalizado. Verifique as configurações.' });
            }

            // --- LÓGICA DE DESTINO ---
            let resDestinoData = null;
            const cepRegex = /\d{5}-?\d{3}/;
            const cepMatch = endereco_destino.match(cepRegex);

            // Tenta CEP direto
            if (cepMatch) {
                const cepLimpo = cepMatch[0].replace('-', '');
                try {
                    const resCep = await axios.get(`https://cep.awesomeapi.com.br/json/${cepLimpo}`, { timeout: 3000 });
                    if (resCep.data && resCep.data.lat && resCep.data.lng) {
                        resDestinoData = [{
                            lat: resCep.data.lat,
                            lon: resCep.data.lng,
                            display_name: `${resCep.data.address}, ${resCep.data.district}, ${resCep.data.city} - ${resCep.data.state}, ${resCep.data.cep}`
                        }];
                        console.log(`[Frete] ✅ Destino resolvido via AwesomeAPI (CEP)`);
                    }
                } catch (err) {
                    console.log("[Frete] AwesomeAPI offline ou CEP não encontrado, tentando mapa...");
                }
            }

            // Fallback para Nominatim (OSM) apenas se o CEP falhar
            if (!resDestinoData) {
                // Aguarda apenas se for usar o Nominatim, para respeitar o rate limit
                await sleep(800); 

                const urlDestino = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco_destino)}&limit=1&countrycodes=br`;
                try {
                    const resDestino = await axios.get(urlDestino, { headers: HEADERS_OSM, timeout: 5000 });
                    if (resDestino.data && resDestino.data.length > 0) {
                        resDestinoData = resDestino.data;
                    }
                } catch (err) {
                    console.log(`[Frete] Erro no OSM para "${endereco_destino}":`, err.message);
                }
            }

            if (!resDestinoData) {
                return res.status(400).json({ error: 'Endereço de ENTREGA não encontrado. Tente digitar o endereço completo com CEP.' });
            }

            const cliente = { 
                lat: resDestinoData[0].lat, 
                lon: resDestinoData[0].lon,
                nome_formatado: resDestinoData[0].display_name
            };

            // --- CÁLCULO DE ROTA ---
            const start = `${loja.lon},${loja.lat}`;
            const end = `${cliente.lon},${cliente.lat}`;
            const urlRota = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start}&end=${end}`;

            const resRota = await axios.get(urlRota, {
                headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
                timeout: 5000
            });

            if (!resRota.data.features || resRota.data.features.length === 0) {
                return res.status(400).json({ error: 'Não foi possível traçar uma rota para este local.' });
            }

            const propriedades = resRota.data.features[0].properties;
            const distanciaKm = propriedades.segments[0].distance / 1000;
            const duracaoMinutos = Math.round(propriedades.segments[0].duration / 60);

            if (config.raio_maximo_km && distanciaKm > config.raio_maximo_km) {
                return res.status(400).json({
                    error: `Endereço muito distante (${distanciaKm.toFixed(1)}km). O limite é ${config.raio_maximo_km}km.`
                });
            }

            const custoKm = (distanciaKm * 2) * parseFloat(config.preco_km);
            const totalFrete = custoKm + parseFloat(config.taxa_fixa);

            res.json({
                origem: config.endereco_origem,
                destino: cliente.nome_formatado,
                distancia_km: parseFloat(distanciaKm.toFixed(2)),
                duracao_estimada: `${duracaoMinutos} min`,
                valor_total_frete: parseFloat(totalFrete.toFixed(2))
            });

        } catch (error) {
            console.error('Erro Cálculo Frete:', error.message);
            res.status(500).json({ error: 'Erro ao calcular frete. Tente novamente em instantes.' });
        }
    },

    // --- FUNÇÕES DO ADMIN ---
    configurar: async (req, res) => {
        const { preco_km, taxa_fixa, endereco_origem, raio_maximo_km } = req.body;
        try {
            let config = await FreteConfig.findOne();
            if (config) {
                // Se o endereço mudou, limpa o cache de lat/lon
                const mudouEndereco = endereco_origem !== config.endereco_origem;
                await config.update({ 
                    preco_km, 
                    taxa_fixa, 
                    endereco_origem, 
                    raio_maximo_km,
                    lat_origem: mudouEndereco ? null : config.lat_origem,
                    lon_origem: mudouEndereco ? null : config.lon_origem
                });
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