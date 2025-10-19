const { Op } = require('sequelize');
const { OrdemDeServico, ItemReserva, Equipamento, Usuario, Unidade, Vistoria, DetalhesVistoria, Pagamento, sequelize, TipoAvaria } = require('../models');
const PDFDocument = require('pdfkit');
const Stripe = require('stripe');


const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const verificarDisponibilidade = async (item, options) => {
    const { id_equipamento, data_inicio, data_fim } = item;
    const unidadesDoEquipamento = await Unidade.findAll({ where: { id_equipamento }, ...options });

    const unidadesReservadas = await ItemReserva.findAll({
        where: {
            [Op.or]: [
                { data_inicio: { [Op.between]: [data_inicio, data_fim] } },
                { data_fim: { [Op.between]: [data_inicio, data_fim] } },
                { data_inicio: { [Op.lte]: data_inicio }, data_fim: { [Op.gte]: data_fim } },
            ],
        },
        include: [
            { model: Unidade, where: { id_equipamento }, required: true },
            { model: OrdemDeServico, where: { status: { [Op.in]: ['pendente', 'aprovada'] } }, required: true }
        ],
        ...options
    });

    const idDasUnidadesReservadas = unidadesReservadas.map(r => r.id_unidade);
    return unidadesDoEquipamento.filter(u => !idDasUnidadesReservadas.includes(u.id));
};

const createOrder = async (req, res) => {
    const { itens, tipo_entrega, endereco_entrega } = req.body;
    const id_usuario = req.user.id;
    const CUSTO_FRETE_PADRAO = 15.00;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ error: 'Nenhum item fornecido para a ordem de serviço.' });
    }

    try {
        const resultado = await sequelize.transaction(async (t) => {
            let data_inicio_geral = new Date(itens[0].data_inicio);
            let data_fim_geral = new Date(itens[0].data_fim);
            let subtotal_itens = 0;


            for (const item of itens) {
                const equipamento = await Equipamento.findByPk(item.id_equipamento, { transaction: t });
                if (!equipamento) throw new Error(`Equipamento com ID ${item.id_equipamento} não encontrado.`);

                const precoDoEquipamento = parseFloat(equipamento.preco_diaria);
                if (isNaN(precoDoEquipamento)) throw new Error(`Preço para o equipamento ${equipamento.nome} é inválido.`);

                const startDate = new Date(item.data_inicio);
                const endDate = new Date(item.data_fim);
                const oneDay = 24 * 60 * 60 * 1000;
                const diffDays = Math.round(Math.abs((endDate - startDate) / oneDay)) + 1;
                subtotal_itens += precoDoEquipamento * item.quantidade * diffDays;

                if (startDate < data_inicio_geral) data_inicio_geral = startDate;
                if (endDate > data_fim_geral) data_fim_geral = endDate;

                const unidadesDisponiveis = await verificarDisponibilidade(item, { transaction: t });
                if (unidadesDisponiveis.length < item.quantidade) {
                    throw new Error(`Conflito: Apenas ${unidadesDisponiveis.length} unidades do equipamento ${equipamento.nome} estão disponíveis.`);
                }
            }


            const custo_frete = tipo_entrega === 'entrega' ? CUSTO_FRETE_PADRAO : 0;
            const valor_total = subtotal_itens + custo_frete;
            const valor_sinal = valor_total * 0.5;


            const ordemDeServico = await OrdemDeServico.create({
                id_usuario,
                status: 'pendente',
                data_inicio: data_inicio_geral,
                data_fim: data_fim_geral,
                valor_total,
                tipo_entrega,
                endereco_entrega: tipo_entrega === 'entrega' ? endereco_entrega : null,
                custo_frete,
                valor_sinal
            }, { transaction: t });



            for (const item of itens) {
                const unidadesDisponiveis = await verificarDisponibilidade(item, { transaction: t });
                for (let i = 0; i < item.quantidade; i++) {
                    await ItemReserva.create({
                        id_ordem_servico: ordemDeServico.id,
                        id_unidade: unidadesDisponiveis[i].id,
                        data_inicio: item.data_inicio,
                        data_fim: item.data_fim,
                    }, { transaction: t });
                }
            }

            return ordemDeServico;
        });

        res.status(201).json({ message: 'Ordem de serviço criada com sucesso.', id: resultado.id });

    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error.message);
        if (error.message.startsWith('Conflito:')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await OrdemDeServico.findAll({
            where: { id_usuario: req.user.id },
            include: [{
                model: ItemReserva,
                as: 'ItemReservas',
                include: [{
                    model: Unidade,
                    as: 'Unidade',
                    include: [{
                        model: Equipamento,
                        as: 'Equipamento',
                    }]
                }]
            }],
            order: [['data_criacao', 'DESC']]
        });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao buscar minhas ordens de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getAllOrders = async (req, res) => {
    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        const orders = await OrdemDeServico.findAll({
            include: [{
                model: ItemReserva,
                as: 'ItemReservas',
                include: [{
                    model: Unidade,
                    as: 'Unidade',
                    include: [{
                        model: Equipamento,
                        as: 'Equipamento',
                    }]
                }]
            }, {
                model: Usuario,
                as: 'Usuario',
                attributes: ['id', 'nome', 'email']
            }],
            order: [['data_criacao', 'DESC']]
        });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao buscar todas as ordens de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar o status de ordens de serviço.' });
        }

        const order = await OrdemDeServico.findByPk(id);

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }

        await order.update({ status });

        res.status(200).json({ message: 'Status da ordem de serviço atualizado com sucesso.', order });

    } catch (error) {
        console.error('Erro ao atualizar ordem de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteOrder = async (req, res) => {
    const { id } = req.params;
    const id_usuario = req.user.id;
    const tipo_usuario = req.user.tipo_usuario;

    try {
        const order = await OrdemDeServico.findByPk(id);

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }

        if (order.id_usuario !== id_usuario && tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Você só pode deletar suas próprias ordens de serviço.' });
        }

        await order.destroy();

        res.status(200).json({ message: 'Ordem de serviço deletada com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar ordem de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getReservationsByUnit = async (req, res) => {
    try {
        const reservations = await ItemReserva.findAll({
            where: { id_unidade: req.params.id },
            include: [{
                model: OrdemDeServico,
                where: { status: ['pendente', 'aprovada'] }
            }]
        });
        res.status(200).json(reservations);
    } catch (error) {
        console.error('Erro ao buscar reservas da unidade:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await OrdemDeServico.findByPk(req.params.id, {
            include: [
                {
                    model: ItemReserva,
                    as: 'ItemReservas',
                    include: [{
                        model: Unidade,
                        as: 'Unidade',
                        include: [{
                            model: Equipamento,
                            as: 'Equipamento',
                            attributes: ['nome', 'url_imagem'],
                            include: [{
                                model: TipoAvaria,
                                as: 'TipoAvarias',
                                required: false
                            }]
                        }]
                    }]
                },
                {
                    model: Vistoria,
                    as: 'Vistorias',
                    required: false,
                    include: [{
                        model: DetalhesVistoria,
                        as: 'detalhes'
                    }]
                }
            ]
        });

        if (order && order.id_usuario !== req.user.id && req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error("Erro ao buscar detalhes da ordem:", error)
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const generateContract = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const tipoUsuario = req.user.tipo_usuario;

    try {
        const order = await OrdemDeServico.findByPk(id, {
            include: [{
                model: Usuario,
                as: 'Usuario',
            }, {
                model: ItemReserva,
                as: 'ItemReservas',
                include: [{
                    model: Unidade,
                    as: 'Unidade',
                    include: [{
                        model: Equipamento,
                        as: 'Equipamento',
                    }]
                }]
            }]
        });

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }

        if (order.id_usuario !== userId && tipoUsuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }

        if (!order.ItemReservas || order.ItemReservas.length === 0) {
            return res.status(500).json({ error: 'Não foi possível gerar o contrato: nenhum item encontrado na reserva.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contrato_ordem_servico_${id}.pdf`);

        const doc = new PDFDocument();
        doc.pipe(res);

        doc.fontSize(25).text('Contrato de Aluguel de Equipamento', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text(`Ordem de Serviço ID: ${order.id}`);
        doc.moveDown();
        doc.fontSize(14).text('Detalhes do Cliente:');
        doc.fontSize(12).text(`Nome: ${order.Usuario.nome}`);
        doc.fontSize(12).text(`Email: ${order.Usuario.email}`);
        doc.moveDown();
        doc.fontSize(14).text('Itens de Aluguel:');

        order.ItemReservas.forEach((item, index) => {
            doc.fontSize(12).text(`Item #${index + 1}: ${item.Unidade.Equipamento.nome}`);
            doc.fontSize(10).text(`  - Unidade ID: ${item.id_unidade}`);
            doc.fontSize(10).text(`  - Período: ${new Date(item.data_inicio).toLocaleDateString()} a ${new Date(item.data_fim).toLocaleDateString()}`);
            doc.moveDown(0.5);
        });

        doc.moveDown();
        doc.text('Termos e Condições...');
        doc.moveDown();
        doc.text('_________________________');
        doc.text(`Assinatura do Cliente: ${order.Usuario.nome}`);

        doc.end();

    } catch (error) {
        console.error('Erro ao gerar contrato:', error);

        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro interno do servidor ao gerar contrato.' });
        }
    }
};

const signContract = async (req, res) => {
    try {
        const order = await OrdemDeServico.findByPk(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        if (order.id_usuario !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (order.status !== 'aguardando_assinatura') {
            return res.status(400).json({ error: 'Esta reserva não está na etapa de assinatura.' });
        }

        await order.update({ status: 'em_andamento' });

        res.status(200).json({ message: 'Contrato assinado e reserva confirmada com sucesso.', order });

    } catch (error) {
        console.error('Erro ao assinar contrato:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const confirmManualPayment = async (req, res) => {

    const { damageFee } = req.body;

    try {
        const order = await OrdemDeServico.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        if (order.status !== 'aguardando_pagamento_final') {
            return res.status(400).json({ error: 'Esta ordem não está na etapa de pagamento final.' });
        }

        await order.update({ status: 'finalizada' });

        const taxaPorAvaria = Number(damageFee) || 0;


        await order.update({ status: 'finalizada', taxa_avaria: taxaPorAvaria });

        const valorRestante = Number(order.valor_total) - Number(order.valor_sinal);

        await Pagamento.create({
            id_ordem_servico: order.id,
            valor: valorRestante + taxaPorAvaria,
            status_pagamento: 'aprovado',
            id_transacao_externa: `manual_${req.user.id}_${Date.now()}`
        });

        res.status(200).json({ message: 'Pagamento manual confirmado e ordem finalizada.' });
    } catch (error) {
        console.error('Erro ao confirmar pagamento manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const order = await OrdemDeServico.findByPk(req.params.id);

        if (!order) { return res.status(404).json({ error: 'Ordem de serviço não encontrada.' }); }
        if (order.id_usuario !== req.user.id) { return res.status(403).json({ error: 'Acesso negado.' }); }

        if (!['aprovada', 'aguardando_assinatura'].includes(order.status)) {
            return res.status(400).json({ error: `Não é possível cancelar uma reserva com status '${order.status}'.` });
        }

        const dataInicio = new Date(order.data_inicio);
        const hoje = new Date();
        const diffTime = dataInicio.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let taxa_cancelamento = 0;
        let valor_reembolsado = 0;

        if (diffDays <= 2) {
            taxa_cancelamento = Number(order.valor_total) * 0.05;
            valor_reembolsado = Number(order.valor_sinal) - taxa_cancelamento;
        } else {
            taxa_cancelamento = 0;
            valor_reembolsado = Number(order.valor_sinal);
        }

        if (valor_reembolsado < 0) valor_reembolsado = 0;

        const pagamentoOriginal = await Pagamento.findOne({ where: { id_ordem_servico: order.id } });
        if (!pagamentoOriginal || !pagamentoOriginal.id_transacao_externa) {
            return res.status(500).json({ error: 'Não foi possível encontrar o registro do pagamento original.' });
        }

        if (valor_reembolsado > 0) {
            await stripe.refunds.create({
                charge: pagamentoOriginal.id_transacao_externa,
                amount: Math.round(valor_reembolsado * 100),
            });
        }

        await order.update({
            status: 'cancelada',
            taxa_cancelamento,
            valor_reembolsado
        });

        res.status(200).json({ message: `Reserva cancelada. Reembolso de R$ ${valor_reembolsado.toFixed(2)} processado.` });

    } catch (error) {
        console.error('Erro ao cancelar a ordem de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao cancelar.' });
    }
};

const checkRescheduleAvailability = async (req, res) => {
    const { startDate, endDate } = req.body;
    try {
        const order = await OrdemDeServico.findByPk(req.params.id, {
            include: [{
                model: ItemReserva,
                as: 'ItemReservas'
            }]
        });

        if (!order) return res.status(404).json({ error: 'Ordem não encontrada.' });

        let allItemsAvailable = true;

        for (const item of order.ItemReservas) {

            const unidade = await Unidade.findByPk(item.id_unidade, {
                include: [{
                    model: Equipamento,
                    as: 'Equipamento'
                }]
            });
            if (!unidade) continue;

            const itemRequest = {
                id_equipamento: unidade.Equipamento.id,
                quantidade: 1,
                data_inicio: startDate,
                data_fim: endDate,
            };

            const unidadesDisponiveis = await verificarDisponibilidade(itemRequest, {});

            const isThisUnitStillAvailable = unidadesDisponiveis.some(u => u.id === item.id_unidade && u.status === 'disponivel');

            if (!isThisUnitStillAvailable) {
                allItemsAvailable = false;
                break;
            }
        }

        res.status(200).json({ available: allItemsAvailable });
    } catch (error) {
        console.error("Erro ao checar remarcação:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};


const rescheduleOrder = async (req, res) => {
    const { newStartDate, newEndDate } = req.body;
    const orderId = req.params.id;

    try {
        await sequelize.transaction(async (t) => {
            const order = await OrdemDeServico.findByPk(orderId, { include: [{ model: ItemReserva, as: 'ItemReservas' }], transaction: t });

            if (!order || order.id_usuario !== req.user.id) {
                throw new Error('Ordem não encontrada ou acesso negado.');
            }
            if (!['aprovada', 'aguardando_assinatura'].includes(order.status)) {
                throw new Error('Este pedido não pode mais ser remarcado.');
            }

            const oneDay = 1000 * 60 * 60 * 24;
            const originalDuration = (new Date(order.data_fim) - new Date(order.data_inicio)) / oneDay;
            const newDuration = (new Date(newEndDate) - new Date(newStartDate)) / oneDay;

            if (originalDuration !== newDuration) {
                throw new Error('A duração da remarcação deve ser a mesma da reserva original.');
            }
            
            for (const item of order.ItemReservas) {
                const unidade = await Unidade.findByPk(item.id_unidade, { include: [{ model: Equipamento, as: 'Equipamento' }], transaction: t });
                const itemRequest = { id_equipamento: unidade.Equipamento.id, quantidade: 1, data_inicio: newStartDate, data_fim: newEndDate };
                const unidadesDisponiveis = await verificarDisponibilidade(itemRequest, { transaction: t });
                if (!unidadesDisponiveis.some(u => u.id === item.id_unidade)) {
                    throw new Error(`Conflito: A unidade #${item.id_unidade} não está disponível nas novas datas.`);
                }
            }

            await order.update({
                data_inicio: newStartDate,
                data_fim: newEndDate,
                taxa_remarcacao: 0
            }, { transaction: t });

            await ItemReserva.update(
                { data_inicio: newStartDate, data_fim: newEndDate },
                { where: { id_ordem_servico: order.id }, transaction: t }
            );
        });

        res.status(200).json({ message: 'Reserva remarcada com sucesso!' });

    } catch (error) {
        console.error("Erro ao remarcar:", error);
        res.status(400).json({ error: error.message });
    }
};


module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
    generateContract,
    getReservationsByUnit,
    getOrderById,
    signContract,
    confirmManualPayment,
    cancelOrder,
    checkRescheduleAvailability,
    rescheduleOrder
};