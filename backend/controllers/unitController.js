const { sequelize, Unidade, Equipamento, ItemReserva, OrdemDeServico, DetalhesVistoria } = require('../models');
const { Op } = require('sequelize');

const addUnitsToEquipment = async (req, res) => {
    const equipmentId = req.params.id || req.body.id_equipamento;
    const { codigo_serial } = req.body;

    try {
        if (!equipmentId) return res.status(400).json({ error: 'ID do equipamento inválido.' });
        if (!codigo_serial || codigo_serial.trim() === '') return res.status(400).json({ error: 'O S/N é obrigatório.' });

        const equipment = await Equipamento.findByPk(equipmentId);
        if (!equipment) return res.status(404).json({ error: 'Equipamento não encontrado.' });

        const exists = await Unidade.findOne({ where: { codigo_serial, id_equipamento: equipmentId } });
        if (exists) return res.status(400).json({ error: `O S/N "${codigo_serial}" já existe.` });

        await Unidade.create({
            id_equipamento: equipmentId,
            status: 'disponivel',
            avarias_atuais: [],
            codigo_serial: codigo_serial
        });

        await equipment.increment('total_quantidade', { by: 1 });
        res.status(201).json({ message: 'Unidade adicionada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

const getUnitsByEquipment = async (req, res) => {
    try {
        const localDate = new Date();
        localDate.setHours(localDate.getHours() - 3);
        const hojeIso = localDate.toISOString().substring(0, 10);

        const units = await Unidade.findAll({
            where: { id_equipamento: req.params.id },
            order: [['id', 'ASC']],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "ItensReserva" AS "ItemReserva"
                            WHERE "ItemReserva"."id_unidade" = "Unidade"."id"
                            AND "ItemReserva"."status" = 'manutencao'
                        )`),
                        'total_manutencoes'
                    ]
                ]
            },
            include: [
                {
                    model: ItemReserva,
                    as: 'ItensReserva',
                    required: false,
                    where: {
                        data_fim: { [Op.gte]: hojeIso },
                        status: { [Op.in]: ['ATIVO', 'ativo', 'manutencao'] }
                    },
                    include: [
                        { model: OrdemDeServico, as: 'OrdemDeServico', required: false, attributes: ['id', 'status'] }
                    ]
                },
                {
                    model: DetalhesVistoria,
                    as: 'Vistorias',
                    required: false,
                    attributes: ['comentarios', 'createdAt'],
                    order: [['createdAt', 'DESC']],
                    limit: 1
                }
            ]
        });

        const unitsLimpo = units.map(u => {
            const jsonUnit = u.toJSON();
            let ultimaObservacao = null;
            if (jsonUnit.Vistorias && jsonUnit.Vistorias.length > 0) {
                if(jsonUnit.Vistorias[0].comentarios && jsonUnit.Vistorias[0].comentarios.trim() !== '') {
                    ultimaObservacao = jsonUnit.Vistorias[0].comentarios;
                }
            }
            jsonUnit.ultima_observacao_vistoria = ultimaObservacao;
            return jsonUnit;
        });

        res.status(200).json(unitsLimpo);
    } catch (error) {
        console.error('Erro getUnits:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

const createMaintenance = async (req, res) => {
    const { id_unidade } = req.params;
    const { data_inicio, data_fim, forceReallocation, motivo } = req.body;

    try {
        const inicioLimpo = data_inicio.split('T')[0];
        const fimLimpo = data_fim.split('T')[0];

        const todasReservas = await ItemReserva.findAll({
            where: { id_unidade },
            include: [{ model: OrdemDeServico, as: 'OrdemDeServico', required: false }]
        });

        const bInicio = new Date(inicioLimpo + "T12:00:00").getTime();
        const bFim = new Date(fimLimpo + "T12:00:00").getTime();

        let conflitoCliente = null;
        let overlapManutencao = false;

        for (const reserva of todasReservas) {
            const rInicio = new Date(reserva.data_inicio + "T12:00:00").getTime();
            const rFim = new Date(reserva.data_fim + "T12:00:00").getTime();

            const bateuData = (bInicio <= rFim) && (bFim >= rInicio);
            if (bateuData) {
                if (reserva.status === 'manutencao') {
                    overlapManutencao = true;
                    break;
                }
                if (reserva.OrdemDeServico) {
                    const statusIntocaveis = ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'];
                    if (statusIntocaveis.includes(reserva.OrdemDeServico.status)) {
                        conflitoCliente = reserva;
                        break;
                    }
                }
            }
        }

        if (overlapManutencao) {
            return res.status(400).json({ error: 'Unidade já possui manutenção nesta data.' });
        }

        if (conflitoCliente) {
            const unidadeAtual = await Unidade.findByPk(id_unidade);

            const outrasUnidades = await Unidade.findAll({
                where: { id_equipamento: unidadeAtual.id_equipamento, id: { [Op.ne]: id_unidade } }
            });

            let unidadeSubstituta = null;
            const cInicio = new Date(conflitoCliente.data_inicio + "T12:00:00").getTime();
            const cFim = new Date(conflitoCliente.data_fim + "T12:00:00").getTime();

            for (const outra of outrasUnidades) {
                const reservasOutra = await ItemReserva.findAll({
                    where: { id_unidade: outra.id },
                    include: [{ model: OrdemDeServico, as: 'OrdemDeServico', required: false }]
                });

                let livre = true;
                for (const ro of reservasOutra) {
                    const roInicio = new Date(ro.data_inicio + "T12:00:00").getTime();
                    const roFim = new Date(ro.data_fim + "T12:00:00").getTime();

                    if ((cInicio <= roFim) && (cFim >= roInicio)) {
                        if (ro.status === 'manutencao') livre = false;
                        else if (ro.OrdemDeServico && ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'].includes(ro.OrdemDeServico.status)) {
                            livre = false;
                        }
                    }
                }
                if (livre) {
                    unidadeSubstituta = outra;
                    break;
                }
            }

            if (!unidadeSubstituta) {
                return res.status(400).json({ error: `Impossível colocar em manutenção! A máquina está alugada no Pedido #${conflitoCliente.OrdemDeServico.id} e NÃO HÁ outras unidades disponíveis para transferir o cliente.` });
            }

            if (!forceReallocation) {
                return res.status(409).json({
                    requiresConfirmation: true,
                    message: `Atenção: Máquina alugada (Pedido #${conflitoCliente.OrdemDeServico.id}).\n\nDeseja transferir o aluguel do cliente para a Unidade #${unidadeSubstituta.id} (Disponível) e continuar com a manutenção?`
                });
            } else {
                await conflitoCliente.update({ id_unidade: unidadeSubstituta.id });
            }
        }

        await ItemReserva.create({
            id_unidade,
            data_inicio: inicioLimpo,
            data_fim: fimLimpo,
            status: 'manutencao',
            id_ordem_servico: null,
            observacao: motivo || 'Manutenção preventiva padrão'
        });

        res.status(201).json({ message: 'Bloqueio criado com sucesso.' });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

const deleteMaintenance = async (req, res) => {
    try {
        const item = await ItemReserva.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Agendamento não encontrado.' });

        if (item.status !== 'manutencao') {
            return res.status(403).json({ error: 'Este item é um aluguel de cliente, não pode excluir por aqui.' });
        }

        await item.destroy();
        res.status(200).json({ message: 'Desbloqueado.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover.' });
    }
};

const updateUnitDetails = async (req, res) => {
    try {
        const { id } = req.params;
        let { codigo_serial, avarias_atuais } = req.body;

        const unidade = await Unidade.findByPk(id);

        if (!unidade) {
            return res.status(404).json({ error: 'Unidade não encontrada' });
        }

        if (codigo_serial === "" || (typeof codigo_serial === 'string' && codigo_serial.trim() === "")) {
            codigo_serial = null;
        }

        await unidade.update({
            codigo_serial,
            avarias_atuais
        });

        res.status(200).json({ message: 'Unidade atualizada com sucesso', unidade });
    } catch (error) {
        console.error('Erro no updateUnitDetails:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ error: 'Este código serial já está em uso por outra unidade deste equipamento.' });
        }

        res.status(500).json({ error: 'Erro interno ao atualizar a unidade.' });
    }
};

const deleteUnit = async (req, res) => {
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

        const historicoCount = await ItemReserva.count({
            where: { id_unidade: unit.id }
        });

        if (historicoCount > 0) {
            return res.status(400).json({
                error: 'Bloqueado: Esta máquina já possui histórico de aluguéis ou manutenções. Para não corromper os dados da empresa, ela não pode ser apagada. Se ela foi vendida ou virou sucata, mude o status para "Inativo".'
            });
        }

        const equipment = await Equipamento.findByPk(unit.id_equipamento);
        await unit.destroy();

        if (equipment) await equipment.decrement('total_quantidade', { by: 1 });

        res.status(200).json({ message: 'Unidade excluída com sucesso (sem histórico vinculado).' });

    } catch (error) {
        console.error('Erro deleteUnit:', error);
        res.status(500).json({ error: 'Erro interno ao excluir a unidade.' });
    }
};

const getAllMaintenances = async (req, res) => {
    try {
        const hojeIso = new Date().toISOString().split('T')[0];

        const manutencoes = await ItemReserva.findAll({
            where: {
                status: 'manutencao',
                data_fim: { [Op.gte]: hojeIso }
            },
            include: [
                {
                    model: Unidade,
                    as: 'Unidade',
                    include: [
                        { model: Equipamento, as: 'Equipamento', attributes: ['nome', 'url_imagem'] }
                    ]
                }
            ],
            order: [['data_inicio', 'ASC']]
        });

        res.status(200).json(manutencoes);
    } catch (error) {
        console.error('Erro ao buscar painel de manutenções:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

const getUnitMaintenanceHistory = async (req, res) => {
    const { id } = req.params;

    try {
        const historico = await ItemReserva.findAll({
            where: {
                id_unidade: id,
                status: 'manutencao'
            },
            include: [
                {
                    model: Unidade,
                    as: 'Unidade',
                    include: [
                        { model: Equipamento, as: 'Equipamento', attributes: ['nome'] }
                    ]
                }
            ],
            order: [['data_inicio', 'DESC']]
        });

        res.status(200).json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico de manutenção:', error);
        res.status(500).json({ error: 'Erro interno ao buscar o histórico.' });
    }
};


const getConflictsAndAlternatives = async (req, res) => {
    const { id } = req.params;
    const { data_inicio, data_fim } = req.query;

    try {
        const unit = await Unidade.findByPk(id);
        if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });

        const hojeIso = new Date().toISOString().substring(0, 10);
        
        const start = data_inicio ? new Date(data_inicio + "T12:00:00").getTime() : new Date(hojeIso + "T12:00:00").getTime();
        const end = data_fim ? new Date(data_fim + "T12:00:00").getTime() : new Date("2099-12-31T12:00:00").getTime();

        const conflitos = await ItemReserva.findAll({
            where: {
                id_unidade: id,
                status: { [Op.not]: 'manutencao' } 
            },
            include: [{
                model: OrdemDeServico,
                as: 'OrdemDeServico',
                where: { status: ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'] },
                required: true
            }],
            order: [['data_inicio', 'ASC']]
        });

        const conflitosReais = conflitos.filter(reserva => {
            const rStart = new Date(reserva.data_inicio + "T12:00:00").getTime();
            const rEnd = new Date(reserva.data_fim + "T12:00:00").getTime();
            return (start <= rEnd) && (end >= rStart);
        });

        if (conflitosReais.length === 0) {
            return res.json({ conflicts: [] });
        }

        const outrasUnidades = await Unidade.findAll({
            where: {
                id_equipamento: unit.id_equipamento,
                id: { [Op.ne]: id },
                status: { [Op.ne]: 'inativo' }
            }
        });

        const result = [];

        for (const reserva of conflitosReais) {
            const resStart = new Date(reserva.data_inicio + "T12:00:00").getTime();
            const resEnd = new Date(reserva.data_fim + "T12:00:00").getTime();

            const alternativas = [];

            for (const outra of outrasUnidades) {
                const reservasOutra = await ItemReserva.findAll({
                    where: { id_unidade: outra.id },
                    include: [{ model: OrdemDeServico, as: 'OrdemDeServico', required: false }]
                });

                let isFree = true;
                for (const ro of reservasOutra) {
                    const roStart = new Date(ro.data_inicio + "T12:00:00").getTime();
                    const roEnd = new Date(ro.data_fim + "T12:00:00").getTime();

                    if ((resStart <= roEnd) && (resEnd >= roStart)) {
                        if (ro.status === 'manutencao') isFree = false;
                        else if (ro.OrdemDeServico && ['pendente', 'aprovada', 'aguardando_assinatura', 'em_andamento', 'aguardando_pagamento_final'].includes(ro.OrdemDeServico.status)) {
                            isFree = false;
                        }
                    }
                }
                
                if (isFree) alternativas.push({ id: outra.id, codigo_serial: outra.codigo_serial });
            }

            result.push({
                reserva: {
                    id: reserva.id,
                    pedido_id: reserva.OrdemDeServico.id,
                    data_inicio: reserva.data_inicio,
                    data_fim: reserva.data_fim
                },
                alternativas
            });
        }

        res.json({ conflicts: result });

    } catch (error) {
        console.error("Erro no Olheiro de Transplante:", error);
        res.status(500).json({ error: 'Erro ao verificar conflitos.' });
    }
};

const executeTransplant = async (req, res) => {
    const { reallocations } = req.body;

    if (!reallocations || reallocations.length === 0) {
        return res.status(400).json({ error: 'Nenhum transplante enviado.' });
    }

    const transaction = await sequelize.transaction();
    try {
        for (const realloc of reallocations) {
            await ItemReserva.update(
                { id_unidade: realloc.id_nova_unidade },
                { where: { id: realloc.id_reserva }, transaction }
            );
        }
        await transaction.commit();
        res.json({ message: 'Transplantes realizados com sucesso! Contratos atualizados invisivelmente.' });
    } catch (error) {
        await transaction.rollback();
        console.error("Erro no Cirurgião:", error);
        res.status(500).json({ error: 'Erro ao executar o transplante de máquinas.' });
    }
};

module.exports = {
    addUnitsToEquipment,
    getUnitsByEquipment,
    deleteUnit,
    updateUnitDetails,
    createMaintenance,
    deleteMaintenance,
    getAllMaintenances,
    getUnitMaintenanceHistory,
    getConflictsAndAlternatives,
    executeTransplant
};