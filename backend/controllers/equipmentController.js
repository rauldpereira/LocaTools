const { Equipamento, Categoria, Unidade, ItemReserva, OrdemDeServico }= require('../models');
const { Op } = require('sequelize');
const createEquipment = async (req, res) => {
    const { nome, descricao, preco_diaria, id_categoria, status, url_imagem, quantidade_inicial } = req.body;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar equipamentos.' });
        }

        const qtdInicialNum = parseInt(quantidade_inicial);
        if (!nome || !preco_diaria || !id_categoria || isNaN(qtdInicialNum) || qtdInicialNum < 0) {
            return res.status(400).json({ error: 'Nome, preço diário, categoria e uma quantidade inicial válida (0 ou mais) são campos obrigatórios.' });
        }

        const newEquipment = await sequelize.transaction(async (t) => {
            
            const equipamentoCriado = await Equipamento.create({
                nome,
                descricao,
                preco_diaria,
                id_categoria,
                status: status || 'disponivel',
                url_imagem,
                total_quantidade: qtdInicialNum 
            }, { transaction: t });

            if (qtdInicialNum > 0) {
                const unidadesParaCriar = [];
                for (let i = 0; i < qtdInicialNum; i++) {
                    unidadesParaCriar.push({
                        id_equipamento: equipamentoCriado.id,
                        status: 'disponivel'
                    });
                }
                await Unidade.bulkCreate(unidadesParaCriar, { transaction: t });
            }

            return equipamentoCriado;
        });

        res.status(201).json(newEquipment);

    } catch (error) {
        console.error('Erro ao criar equipamento e suas unidades:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao criar equipamento.' });
    }
};

const getEquipments = async (req, res) => {
    try {
        const equipamentos = await Equipamento.findAll({
            include: [{
                model: Categoria,
                as: 'Categoria',
                attributes: ['id', 'nome']
            }]
        });

        res.status(200).json(equipamentos);

    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getEquipmentById = async (req, res) => {
    const { id } = req.params;

    try {
        const equipamento = await Equipamento.findByPk(id, {
            include: [{
                model: Categoria,
                as: 'Categoria',
                attributes: ['id', 'nome']
            }]
        });

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        res.status(200).json(equipamento);

    } catch (error) {
        console.error('Erro ao buscar equipamento por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar equipamentos.' });
        }

        const equipamento = await Equipamento.findByPk(id);

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        await equipamento.update(req.body);

        res.status(200).json({ message: 'Equipamento atualizado com sucesso.', equipamento });

    } catch (error) {
        console.error('Erro ao atualizar equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteEquipment = async (req, res) => {
    const { id } = req.params;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar equipamentos.' });
        }

        const equipamento = await Equipamento.findByPk(id);

        if (!equipamento) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        await equipamento.destroy();

        res.status(200).json({ message: 'Equipamento deletado com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar equipamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


const checkAvailability = async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'As datas de início e fim são obrigatórias.' });
    }

    try {
        const unidadesDoEquipamento = await Unidade.findAll({ where: { id_equipamento: id } });

        const unidadesReservadas = await ItemReserva.findAll({
            where: {
                [Op.or]: [
                    { data_inicio: { [Op.between]: [startDate, endDate] } },
                    { data_fim: { [Op.between]: [startDate, endDate] } },
                    { data_inicio: { [Op.lte]: startDate }, data_fim: { [Op.gte]: endDate } },
                ],
            },
            include: [
                { model: Unidade, where: { id_equipamento: id }, required: true },
                { model: OrdemDeServico, where: { status: ['pendente', 'aprovada'] }, required: true }
            ],
        });

        const idDasUnidadesReservadas = unidadesReservadas.map(r => r.id_unidade);
        const unidadesDisponiveis = unidadesDoEquipamento.filter(u => !idDasUnidadesReservadas.includes(u.id));

        res.status(200).json({ availableQuantity: unidadesDisponiveis.length });

    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


module.exports = {
    createEquipment,
    getEquipments,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    checkAvailability
};
