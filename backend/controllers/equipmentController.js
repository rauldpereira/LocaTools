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
    const { nome, descricao, preco_diaria, id_categoria, status, quantidade_inicial, avarias } = req.body;

    let urls_imagens = [];

    if (req.files && req.files.length > 0) {
        urls_imagens = req.files.map(file => {
            return file.path.replace(/\\/g, '/').replace('public', '');
        });
    } else if (req.body.url_imagem) {
        urls_imagens.push(req.body.url_imagem);
    }

    const urlImagemParaSalvar = JSON.stringify(urls_imagens);
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
                preco_diaria: parseFloat(preco_diaria),
                id_categoria: parseInt(id_categoria),
                status: status || 'disponivel',
                url_imagem: urlImagemParaSalvar,
                total_quantidade: parseInt(quantidade_inicial)
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

const getEquipment = async (req, res) => {
    try {
        const equipments = await Equipamento.findAll({
            include: [
                {
                    model: Categoria,
                    as: 'Categoria',
                    attributes: ['id', 'nome']
                },
                {
                    model: Unidade,
                    as: 'Unidades',
                    attributes: ['id', 'status']
                }
            ],
            order: [['nome', 'ASC']]
        });

        const response = equipments.map(equip => {
            const json = equip.toJSON();
            return {
                ...json,
                total_quantidade: json.Unidades ? json.Unidades.length : 0,

                disponiveis: json.Unidades ? json.Unidades.filter(u => u.status === 'disponivel').length : 0
            };
        });

        res.status(200).json(response);
    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar equipamentos.' });
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
    const { nome, descricao, preco_diaria, id_categoria, existing_images } = req.body;

    try {
        const equipamento = await Equipamento.findByPk(id);
        if (!equipamento) return res.status(404).json({ error: 'Equipamento não encontrado.' });

        let listaFinalImagens = [];

        if (existing_images) {
            listaFinalImagens = JSON.parse(existing_images);
        }

        if (req.files && req.files.length > 0) {
            const novosCaminhos = req.files.map(file => {
                return file.path.replace(/\\/g, '/').replace('public', '');
            });
            listaFinalImagens = [...listaFinalImagens, ...novosCaminhos];
        }

        let urlImagemParaSalvar = equipamento.url_imagem;

        if (existing_images !== undefined) {
            urlImagemParaSalvar = JSON.stringify(listaFinalImagens);
        }

        await equipamento.update({
            nome,
            descricao,
            preco_diaria: parseFloat(preco_diaria),
            id_categoria: id_categoria ? parseInt(id_categoria) : null,
            url_imagem: urlImagemParaSalvar
        });

        res.status(200).json({ message: 'Atualizado com sucesso!', equipamento });

    } catch (error) {
        console.error('Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro interno.' });
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
    const { start, end } = req.query;

    try {
        const totalUnits = await Unidade.count({ where: { id_equipamento: id } });

        if (totalUnits === 0) return res.json({ unavailableDates: [], total: 0 });

        const bookings = await ItemReserva.findAll({
            where: {
                data_inicio: { [Op.lte]: end },
                data_fim: { [Op.gte]: start },
            },
            include: [
                {
                    model: Unidade,
                    where: { id_equipamento: id },
                    required: true,
                    attributes: ['id']
                },
                {
                    model: OrdemDeServico,
                    required: false,
                    attributes: ['status']
                }
            ]
        });

        const occupancyMap = {};

        bookings.forEach(booking => {
            // Ignora o que foi cancelado. Finalizado, Devolvido etc.. não ocupa mais espaço futuro.
            if (booking.OrdemDeServico && ['cancelada', 'finalizada'].includes(booking.OrdemDeServico.status)) {
                return;
            }

            let current = new Date(booking.data_inicio);
            const last = new Date(booking.data_fim);

            while (current <= last) {
                const dateStr = current.toISOString().split('T')[0];

                if (!occupancyMap[dateStr]) occupancyMap[dateStr] = 0;
                occupancyMap[dateStr]++;

                current.setDate(current.getDate() + 1);
            }
        });

        const unavailableDates = [];
        const availabilityByDate = {};

        let loopDate = new Date(start);
        const finalDate = new Date(end);

        while (loopDate <= finalDate) {
            const dateStr = loopDate.toISOString().split('T')[0];
            const occupied = occupancyMap[dateStr] || 0;
            const available = totalUnits - occupied;

            availabilityByDate[dateStr] = available > 0 ? available : 0;

            if (available <= 0) {
                unavailableDates.push(dateStr);
            }

            loopDate.setDate(loopDate.getDate() + 1);
        }

        res.json({
            totalUnits,
            unavailableDates,
            availabilityByDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao calcular disponibilidade' });
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
            where: { data: { [Op.gte]: startDate, [Op.lte]: endDate } }
        });
        const excecoes = excecoesRaw.reduce((acc, exc) => {
            acc[exc.data] = exc;
            return acc;
        }, {});

        const totalUnits = await Unidade.count({ where: { id_equipamento: id } });

        const reservations = await ItemReserva.findAll({
            where: {
                data_inicio: { [Op.lte]: endDate },
                data_fim: { [Op.gte]: startDate }
            },
            include: [
                {
                    model: Unidade,
                    where: { id_equipamento: id },
                    required: true,
                    attributes: ['id']
                },
                {
                    model: OrdemDeServico,
                    required: false,
                    attributes: ['id', 'status']
                }
            ]
        });

        const occupancyMap = {};

        reservations.forEach(reserva => {
            let deveContar = false;

            // Se for manutenção, a máquina tá ocupada
            if (reserva.status === 'manutencao') {
                deveContar = true;
            }
            // Se for pedido de cliente
            else if (reserva.OrdemDeServico) {
                if (excludeOrderId && reserva.OrdemDeServico.id == excludeOrderId) return;

                // CONTA as máquinas se o pedido for: pendente, aprovada, aguardando assinatura ou andamento.
                const statusAtivos = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento'];
                if (statusAtivos.includes(reserva.OrdemDeServico.status)) {
                    deveContar = true;
                }
            }

            if (deveContar) {
                let rStart = new Date(reserva.data_inicio);
                let rEnd = new Date(reserva.data_fim);

                const currentDayStart = new Date(startDate);
                const currentDayEnd = new Date(endDate);

                if (rStart < currentDayStart) rStart = new Date(currentDayStart);
                if (rEnd > currentDayEnd) rEnd = new Date(currentDayEnd);

                for (let d = new Date(rStart); d <= rEnd; d.setDate(d.getDate() + 1)) {
                    const dStr = d.toISOString().split('T')[0];
                    occupancyMap[dStr] = (occupancyMap[dStr] || 0) + 1;
                }
            }


        });

        const availabilityByDay = {};
        let currentDay = new Date(startDate);
        const endDay = new Date(endDate);

        while (currentDay <= endDay) {
            const dayString = currentDay.toISOString().split('T')[0];
            const diaSemana = diasSemanaMap[currentDay.getDay()];

            let empresaAberta = true;
            if (excecoes[dayString]) {
                if (!excecoes[dayString].funcionamento) empresaAberta = false;
            } else if (regrasPadrao[diaSemana]?.fechado) {
                empresaAberta = false;
            }

            if (!empresaAberta) {
                availabilityByDay[dayString] = 0;
            } else {
                const ocupados = occupancyMap[dayString] || 0;
                availabilityByDay[dayString] = Math.max(0, totalUnits - ocupados);
            }

            currentDay.setDate(currentDay.getDate() + 1);
        }

        res.status(200).json({ totalUnits, availabilityByDay });

    } catch (error) {
        console.error("Erro ao buscar disponibilidade diária:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

module.exports = {
    createEquipment,
    getEquipment,
    getEquipmentById,
    updateEquipment,
    deleteEquipment,
    checkAvailability,
    getDailyAvailability
};
