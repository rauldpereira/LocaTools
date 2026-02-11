const { Unidade, Equipamento, ItemReserva, OrdemDeServico, Manutencao } = require('../models');
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
        const units = await Unidade.findAll({
            where: { id_equipamento: req.params.id },
            order: [['id', 'ASC']],
            include: [
                {
                    model: ItemReserva,
                    as: 'ItensReserva',
                    required: false,
                    where: { 
                        data_fim: { [Op.gte]: new Date() },
                        
                        status: { [Op.in]: ['ativo', 'manutencao'] } 
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
    const { data_inicio, data_fim, descricao } = req.body;


    try {
        const todasReservas = await ItemReserva.findAll({
            where: { id_unidade },
            include: [{ model: OrdemDeServico, as: 'OrdemDeServico', required: false }]
        });

        const bInicio = new Date(data_inicio);
        bInicio.setUTCHours(0, 0, 0, 0); // Começa no primeiro segundo do dia

        const bFim = new Date(data_fim);
        bFim.setUTCHours(23, 59, 59, 999); // Vai até o último segundo do dia

        console.log(`📅 Seu Bloqueio (Normalizado): ${bInicio.toISOString()} até ${bFim.toISOString()}`);

        const conflito = todasReservas.find(reserva => {
            // Normaliza data da reserva (Ignora hora quebrada, considera dia cheio)
            const rInicio = new Date(reserva.data_inicio);
            rInicio.setUTCHours(0, 0, 0, 0);

            const rFim = new Date(reserva.data_fim);
            //Se a data for igual, esticamos até o final do dia
            rFim.setUTCHours(23, 59, 59, 999); 

            // Lógica de Colisão: (InicioA <= FimB) E (FimA >= InicioB)
            const bateuData = (bInicio.getTime() <= rFim.getTime()) && 
                              (bFim.getTime() >= rInicio.getTime());

            if (!bateuData) return false;

            if (reserva.status === 'manutencao') return true;

            // Se for Cliente -> Verifica se o pedido está ativo
            if (reserva.OrdemDeServico) {
                const statusOS = reserva.OrdemDeServico.status;
                const statusIntocaveis = [
                    'pendente', 'aprovada', 'aguardando_assinatura', 
                    'em_andamento', 'aguardando_pagamento_final'
                ];
                
                if (statusIntocaveis.includes(statusOS)) {
                    console.log(`Bloqueio impedido pelo Pedido #${reserva.OrdemDeServico.id} (${statusOS})`);
                    return true;
                }
            }
            return false;
        });

        if (conflito) {
            return res.status(400).json({ 
                error: `Impossível bloquear! Unidade já ocupada na data selecionada.` 
            });
        }

        console.log('✅ Caminho livre (Dia Inteiro). Criando...');
        
        await ItemReserva.create({
            id_unidade,
            data_inicio,
            data_fim,
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
        const manutencoes = await ItemReserva.findAll({
            where: {
                status: 'manutencao',
                data_fim: { [Op.gte]: new Date() }
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