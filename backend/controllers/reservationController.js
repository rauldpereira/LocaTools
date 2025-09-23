// backend/controllers/reservationController.js
const { Op } = require('sequelize');
const { OrdemDeServico, ItemReserva, Equipamento, Usuario, Unidade, sequelize } = require('../models');
const PDFDocument = require('pdfkit');

// @desc    Criar uma nova Ordem de Serviço com múltiplos itens
// @route   POST /api/reservations
// @access  Privado/Cliente
// Em ../controllers/reservationController.js

const createOrder = async (req, res) => {
    const { itens } = req.body;
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
                if (!equipamento) {
                    throw new Error(`Equipamento com ID ${item.id_equipamento} não encontrado.`);
                }

                const precoDoEquipamento = parseFloat(equipamento.preco_diaria);

                if (isNaN(precoDoEquipamento) || precoDoEquipamento < 0) {
                    throw new Error(`Preço para o equipamento ${equipamento.nome} ('${equipamento.preco_diaria}') é inválido ou não foi definido no banco de dados.`);
                }

                const unidadesDisponiveis = await verificarDisponibilidade(item, { transaction: t });
                if (unidadesDisponiveis.length < item.quantidade) {
                    throw new Error(`Conflito: Apenas ${unidadesDisponiveis.length} unidades do equipamento ${equipamento.nome} estão disponíveis.`);
                }

                const startDate = new Date(item.data_inicio);
                const endDate = new Date(item.data_fim);
                const oneDay = 24 * 60 * 60 * 1000;
                const diffDays = Math.round(Math.abs((endDate - startDate) / oneDay)) + 1;
                valor_total += precoDoEquipamento * item.quantidade * diffDays;
                if (startDate < data_inicio_geral) data_inicio_geral = startDate;
                if (endDate > data_fim_geral) data_fim_geral = endDate;
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

            // ETAPA 3: CRIAR OS ITENS DA RESERVA
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
        // Se o erro for de conflito (que nós criamos), retorna 409. Senão, 500.
        if (error.message.startsWith('Conflito:')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro interno do servidor.', details: error.message });
    }
};

// FUNÇÃO AUXILIAR: Para não repetir o código de verificação
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

// @desc    Buscar todas as Ordens de Serviço do usuário logado
// @route   GET /api/reservations/my
// @access  Privado
const getMyOrders = async (req, res) => {
    try {
        const orders = await OrdemDeServico.findAll({
            where: { id_usuario: req.user.id },
            include: [{
                model: ItemReserva,
                as: 'ItensReserva',
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

// @desc    Buscar todas as Ordens de Serviço do sistema
// @route   GET /api/reservations/all
// @access  Privado/Admin
const getAllOrders = async (req, res) => {
    try {
        if (req.user.tipo_usuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem ver todas as ordens de serviço.' });
        }

        const orders = await OrdemDeServico.findAll({
            include: [{
                model: ItemReserva,
                as: 'ItensReserva',
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
            }],
            order: [['data_criacao', 'DESC']]
        });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Erro ao buscar todas as ordens de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Atualizar uma Ordem de Serviço (somente admin)
// @route   PUT /api/reservations/:id
// @access  Privado/Admin
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

// @desc    Deletar uma Ordem de Serviço (próprio usuário ou admin)
// @route   DELETE /api/reservations/:id
// @access  Privado
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

// @desc    Gerar contrato de aluguel em PDF
// @route   GET /api/reservations/contract/:id
// @access  Privado (dono da reserva ou admin)
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
                as: 'ItensReserva',
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
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este contrato.' });
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
        order.ItensReserva.forEach((item, index) => {
            doc.fontSize(12).text(`Item #${index + 1}: ${item.Unidade.Equipamento.nome}`);
            doc.fontSize(10).text(`  - Unidade ID: ${item.id_unidade}`);
            doc.fontSize(10).text(`  - Período: ${item.data_inicio.toISOString().split('T')[0]} a ${item.data_fim.toISOString().split('T')[0]}`);
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
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

// @desc    Buscar todas as reservas de uma unidade específica
// @route   GET /api/units/:id/reservations
// @access  Privado/Admin
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
        const order = await OrdemDeServico.findByPk(req.params.id);
       
        if (order && order.id_usuario !== req.user.id) {
             return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        res.status(200).json(order);
    } catch (error) {
         res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
    generateContract,
    getReservationsByUnit,
    getOrderById
};