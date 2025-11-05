const { Equipamento, Categoria, Unidade, ItemReserva, OrdemDeServico, sequelize, TipoAvaria } = require('../models');
const { HorarioFuncionamento, DiasExcecoes } = require('../models');

const { Op } = require('sequelize');

const parseDateStringAsLocal = (dateString) => {
    if (!dateString) return new Date();
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const diasSemanaMap = [
    'domingo', 
    'segunda', 
    'terca',   
    'quarta',  
    'quinta',  
    'sexta',   
    'sabado'   
];

const createEquipment = async (req, res) => {
    const { nome, descricao, preco_diaria, id_categoria, status, url_imagem, quantidade_inicial, avarias } = req.body;

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

            await TipoAvaria.create({
                descricao: 'Outros',
                preco: 0,
                id_equipamento: equipamentoCriado.id,
                is_default: true
            }, { transaction: t });

            if (avarias && avarias.length > 0) {
                const avariasParaCriar = avarias.map(avaria => ({
                    ...avaria,
                    id_equipamento: equipamentoCriado.id,
                    is_default: false
                }));
                await TipoAvaria.bulkCreate(avariasParaCriar, { transaction: t });
            }

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
    try {
        const equipment = await Equipamento.findByPk(req.params.id, {
            include: [
                { model: Categoria, as: 'Categoria' },
                {
                    model: TipoAvaria,
                    as: 'TipoAvarias',
                    required: false
                }
            ]
        });

        if (equipment) {
            res.status(200).json(equipment);
        } else {
            res.status(404).json({ error: 'Equipamento não encontrado.' });
        }
    } catch (error) {
        console.error("Erro ao buscar equipamento:", error);
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

const getDailyAvailability = async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, excludeOrderId } = req.query;

    try {

        const regrasPadraoRaw = await HorarioFuncionamento.findAll();
        const regrasPadrao = regrasPadraoRaw.reduce((acc, regra) => {
            acc[regra.dia_semana] = { fechado: regra.fechado };
            return acc;
        }, {});


        const excecoesRaw = await DiasExcecoes.findAll({
            where: {
                data: { [Op.gte]: startDate, [Op.lte]: endDate }
            }
        });
        const excecoes = excecoesRaw.reduce((acc, exc) => {
            acc[exc.data] = exc;
            return acc;
        }, {});

        const totalUnits = await Unidade.count({ where: { id_equipamento: id } });

        const orderStatusWhere = {
            status: { [Op.in]: ['aprovada', 'aguardando_assinatura', 'em_andamento'] }
        };
        if (excludeOrderId) {
            orderStatusWhere.id = { [Op.not]: excludeOrderId };
        }

        const reservations = await ItemReserva.findAll({
            where: {
                [Op.and]: [
                    { data_inicio: { [Op.lte]: endDate } },
                    { data_fim: { [Op.gte]: startDate } }
                ]
            },
            include: [
                { model: Unidade, where: { id_equipamento: id }, attributes: [] },
                { model: OrdemDeServico, where: orderStatusWhere, attributes: [] }
            ]
        });

        const availabilityByDay = {};
        const start = parseDateStringAsLocal(startDate);
        const end = parseDateStringAsLocal(endDate);

        for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
            
            const dayString = day.toISOString().split('T')[0];
            const diaSemanaString = diasSemanaMap[day.getDay()];
            let empresaAberta = true;

            const excecao = excecoes[dayString];
            if (excecao) {

                empresaAberta = excecao.funcionamento;
            } else {
                const regra = regrasPadrao[diaSemanaString];
                if (regra && regra.fechado) { 
                    empresaAberta = false;
                }
            }

            if (!empresaAberta) {
                availabilityByDay[dayString] = 0; 
                continue; 
            }

            let reservedCount = 0;
            for (const res of reservations) {
                
                const resStart = new Date(res.data_inicio); resStart.setHours(0, 0, 0, 0);
                const resEnd = new Date(res.data_fim); resEnd.setHours(0, 0, 0, 0);
                
                if (day >= resStart && day <= resEnd) {
                    reservedCount++;
                }
            }
            
            availabilityByDay[dayString] = totalUnits - reservedCount;
        }
        
        res.status(200).json({ totalUnits: totalUnits, availabilityByDay });

    } catch (error) {
        console.error("Erro ao buscar disponibilidade diária:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

module.exports = {
    createEquipment,
    getEquipments,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    checkAvailability,
    getDailyAvailability
};
