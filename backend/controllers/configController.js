const { ConfigLoja, FreteConfig } = require('../models');

const getConfig = async (req, res) => {
    try {
        let configLoja = await ConfigLoja.findOne();
        if (!configLoja) {
            configLoja = await ConfigLoja.create({
                fidelidade_num_pedidos: 10,
                fidelidade_desconto_pct: 10.00,
                fidelidade_ativo: true,
                horario_limite_hoje: '12:00',
                cnpj: '00.000.000/0001-00',
                taxa_reagendamento: 0.00
            });
        }

        let configFrete = await FreteConfig.findOne();
        if (!configFrete) {
            configFrete = await FreteConfig.create({
                preco_km: 3.00,
                taxa_fixa: 20.00,
                endereco_origem: 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP',
                raio_maximo_km: 50
            });
        }
        
        res.status(200).json({
            ...configLoja.toJSON(),
            frete: configFrete.toJSON()
        });
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateConfig = async (req, res) => {
    const { 
        fidelidade_num_pedidos, 
        fidelidade_desconto_pct, 
        fidelidade_ativo, 
        horario_limite_hoje, 
        cnpj,
        taxa_reagendamento,
        frete
    } = req.body;
    
    try {
        let configLoja = await ConfigLoja.findOne();
        if (!configLoja) {
            configLoja = await ConfigLoja.create({
                fidelidade_num_pedidos,
                fidelidade_desconto_pct,
                fidelidade_ativo,
                horario_limite_hoje,
                cnpj,
                taxa_reagendamento
            });
        } else {
            await configLoja.update({
                fidelidade_num_pedidos,
                fidelidade_desconto_pct,
                fidelidade_ativo,
                horario_limite_hoje,
                cnpj,
                taxa_reagendamento
            });
        }

        if (frete) {
            let configFrete = await FreteConfig.findOne();
            if (!configFrete) {
                await FreteConfig.create({
                    preco_km: frete.preco_km,
                    taxa_fixa: frete.taxa_fixa,
                    endereco_origem: frete.endereco_origem,
                    raio_maximo_km: frete.raio_maximo_km
                });
            } else {
                await configFrete.update({
                    preco_km: frete.preco_km,
                    taxa_fixa: frete.taxa_fixa,
                    endereco_origem: frete.endereco_origem,
                    raio_maximo_km: frete.raio_maximo_km
                });
            }
        }
        
        res.status(200).json({ message: 'Configurações atualizadas!' });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getConfig,
    updateConfig
};