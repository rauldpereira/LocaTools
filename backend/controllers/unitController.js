const { Unidade, Equipamento, ItemReserva, OrdemDeServico } = require('../models');
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
                }
            ]
        });
        res.status(200).json(units);
    } catch (error) {
        console.error('Erro getUnits:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
};

const createMaintenance = async (req, res) => {
    const { id_unidade } = req.params; 
    const { data_inicio, data_fim, forceReallocation } = req.body;

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
            id_ordem_servico: null
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
    const { status, avarias_atuais, codigo_serial } = req.body;
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });
        await unit.update({
            status: status !== undefined ? status : unit.status,
            avarias_atuais: avarias_atuais !== undefined ? avarias_atuais : unit.avarias_atuais,
            codigo_serial: codigo_serial !== undefined ? codigo_serial : unit.codigo_serial
        });
        res.status(200).json(unit);
    } catch (error) { res.status(500).json({ error: 'Erro interno.' }); }
};

const deleteUnit = async (req, res) => {
    try {
        const unit = await Unidade.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ error: 'Unidade não encontrada.' });
        const equipment = await Equipamento.findByPk(unit.id_equipamento);
        await unit.destroy();
        if (equipment) await equipment.decrement('total_quantidade', { by: 1 });
        res.status(200).json({ message: 'Deletado.' });
    } catch (error) { res.status(500).json({ error: 'Erro interno.' }); }
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

module.exports = { 
    addUnitsToEquipment, 
    getUnitsByEquipment, 
    deleteUnit, 
    updateUnitDetails,
    createMaintenance, 
    deleteMaintenance,
    getAllMaintenances
};