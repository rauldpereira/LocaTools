const { ConfigLoja } = require('../models');

const getConfig = async (req, res) => {
    try {
        let config = await ConfigLoja.findOne();
        
        if (!config) {
            config = await ConfigLoja.create({
                fidelidade_num_pedidos: 10,
                fidelidade_desconto_pct: 10.00,
                fidelidade_ativo: true,
                horario_limite_hoje: '12:00'
            });
        }
        
        res.status(200).json(config);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateConfig = async (req, res) => {
    const { fidelidade_num_pedidos, fidelidade_desconto_pct, fidelidade_ativo, horario_limite_hoje } = req.body;
    
    try {
        let config = await ConfigLoja.findOne();
        
        if (!config) {
            config = await ConfigLoja.create({
                fidelidade_num_pedidos,
                fidelidade_desconto_pct,
                fidelidade_ativo,
                horario_limite_hoje
            });
        } else {
            await config.update({
                fidelidade_num_pedidos,
                fidelidade_desconto_pct,
                fidelidade_ativo,
                horario_limite_hoje
            });
        }
        
        res.status(200).json({ message: 'Configurações atualizadas!', config });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

module.exports = {
    getConfig,
    updateConfig
};