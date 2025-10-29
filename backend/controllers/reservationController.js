const { Op } = require('sequelize');
const { OrdemDeServico, ItemReserva, Equipamento, Usuario, Unidade, Vistoria, DetalhesVistoria, Pagamento, sequelize, TipoAvaria, AvariasEncontradas } = require('../models');
const PDFDocument = require('pdfkit');
const Stripe = require('stripe');

const { parseDateStringAsLocal } = require('../utils/dateUtils');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const verificarDisponibilidade = async (item, options, excludeOrderId = null) => {
    const { id_equipamento, data_inicio, data_fim } = item;
    
    // 1. Busca TODAS as unidades, ignorando o status
    const unidadesDoEquipamento = await Unidade.findAll({ 
        where: { id_equipamento }, 
        ...options 
    });

    const orderStatusWhere = {
        status: { [Op.in]: ['aprovada', 'aguardando_assinatura', 'em_andamento'] }
    };
    if (excludeOrderId) {
        orderStatusWhere.id = { [Op.not]: excludeOrderId };
    }

    // 2. Busca reservas que conflitam com a data, IGNORANDO o pedido atual
    const unidadesReservadas = await ItemReserva.findAll({
        where: {
            data_inicio: { [Op.lte]: data_fim },
            data_fim: { [Op.gte]: data_inicio }
        },
        include: [
            { model: Unidade, where: { id_equipamento }, required: true },
            { model: OrdemDeServico, where: orderStatusWhere, required: true }
        ],
        ...options
    });

    const idDasUnidadesReservadas = unidadesReservadas.map(r => r.id_unidade);
    // Retorna unidades que NÃO ESTÃO na lista de reservadas
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
                            attributes: ['id', 'nome', 'url_imagem', 'total_quantidade'],
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
                        as: 'detalhes',
                        include: [{
                            model: AvariasEncontradas,
                            as: 'avariasEncontradas',
                            required: false,
                            include: [{
                                model: TipoAvaria,
                                as: 'TipoAvaria',
                                attributes: ['id', 'descricao', 'preco'],
                                required: false
                            }]
                        }]
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
            include: [
                { model: Usuario, as: 'Usuario', attributes: ['nome', 'email'] },
                { 
                    model: ItemReserva, 
                    as: 'ItemReservas', 
                    include: [{ 
                        model: Unidade, as: 'Unidade', 
                        include: [{ model: Equipamento, as: 'Equipamento' }] 
                    }] 
                },
                {
                    model: Vistoria,
                    as: 'Vistorias',
                    where: { tipo_vistoria: 'entrega' },
                    required: false,
                    include: [{
                        model: DetalhesVistoria,
                        as: 'detalhes',
                        include: [{
                            model: AvariasEncontradas,
                            as: 'avariasEncontradas',
                            required: false,
                            include: [{ model: TipoAvaria, as: 'TipoAvaria' }]
                        }]
                    }]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
        }
        if (order.id_usuario !== userId && tipoUsuario !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado.' });
        }
        if (!order.ItemReservas || order.ItemReservas.length === 0) {
            return res.status(500).json({ error: 'Pedido sem itens.' });
        }
        
        const vistoriaSaida = (order.Vistorias && order.Vistorias.length > 0) ? order.Vistorias[0] : null;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=contrato_locacao_${id}.pdf`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);


        doc.fontSize(18).font('Helvetica-Bold').text('CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS', { align: 'center' });
        doc.fontSize(14).text(`Contrato Nº: ${order.id}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text('1. AS PARTES');
        doc.font('Helvetica').text(`LOCADORA: LOCATOOLS LTDA, CNPJ 00.000.000/0001-00`);
        doc.text(`LOCATÁRIO(A): ${order.Usuario.nome}, Email: ${order.Usuario.email}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('2. OBJETO DO CONTRATO');
        doc.font('Helvetica').text('O presente contrato tem como objeto a locação do(s) equipamento(s) descrito(s) abaixo:');
        doc.moveDown();

        order.ItemReservas.forEach((item, index) => {
            doc.font('Helvetica-Bold').text(`Item ${index + 1}: ${item.Unidade.Equipamento.nome} (Unidade ID: ${item.id_unidade})`);
            doc.font('Helvetica').text(`Descrição: ${item.Unidade.Equipamento.descricao.substring(0, 150)}...`);
            doc.moveDown(0.5);
        });

        doc.font('Helvetica-Bold').text('3. PERÍODO DE LOCAÇÃO');
        const dataInicio = new Date(order.data_inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        const dataFim = new Date(order.data_fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        doc.font('Helvetica').text(`Início: ${dataInicio} (Horário de retirada conforme funcionamento).`);
        doc.text(`Fim: ${dataFim} (Horário de devolução conforme funcionamento).`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('4. VISTORIA DE SAÍDA (ESTADO DO EQUIPAMENTO)');
        if (vistoriaSaida) {
            doc.font('Helvetica').text('O(A) LOCATÁRIO(A) declara receber o(s) equipamento(s) no estado descrito pela vistoria de saída:');
            vistoriaSaida.detalhes.forEach(detalhe => {
                doc.font('Helvetica-Bold').text(`- Unidade ID #${detalhe.id_unidade}:`);
                doc.font('Helvetica').text(`  Condição Geral: ${detalhe.condicao}`);
                doc.text(`  Comentários: ${detalhe.comentarios || 'Nenhum.'}`);
                if (detalhe.avariasEncontradas && detalhe.avariasEncontradas.length > 0) {
                    doc.text('  Avarias pré-existentes (check):');
                    detalhe.avariasEncontradas.forEach(avaria => {
                        doc.text(`    - ${avaria.TipoAvaria.descricao}`);
                    });
                }
            });
        } else {
            doc.font('Helvetica').text('Vistoria de saída pendente de realização.');
        }
        doc.moveDown();

        doc.font('Helvetica-Bold').text('5. VALORES E PAGAMENTO');
        doc.font('Helvetica').text(`Valor Total do Aluguel: R$ ${Number(order.valor_total).toFixed(2)}`);
        doc.text(`Sinal (50%) Pago: R$ ${Number(order.valor_sinal).toFixed(2)}`);
        doc.text(`Valor Restante: R$ ${(Number(order.valor_total) - Number(order.valor_sinal)).toFixed(2)} (a ser pago na devolução).`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('6. TERMOS E CONDIÇÕES');
        doc.font('Helvetica').fontSize(10);
        doc.text('6.1. OBRIGAÇÕES DA LOCATÁRIA (Cliente):');
        doc.list([
            'Utilizar o equipamento conforme as instruções de uso.',
            'Zelar pela guarda e conservação do equipamento.',
            'Devolver o equipamento na data estipulada. A não devolução implicará em multa diária no valor de 10% do total do contrato.',
            'Responsabilizar-se por qualquer dano, quebra ou perda do equipamento durante o período de locação.'
        ], { indent: 20 });
        doc.moveDown(0.5);


        doc.text('6.2. DEVOLUÇÃO E AVARIAS:');
        doc.text('Na devolução, uma nova vistoria será realizada. Avarias que não constam na Vistoria de Saída (Cláusula 4) serão de responsabilidade do(a) LOCATÁRIO(A), sendo os custos de reparo (baseados no catálogo de avarias) adicionados ao valor final do pagamento.');      
        doc.moveDown(0.5);


        doc.font('Helvetica-Bold').text('6.3. POLÍTICA DE CANCELAMENTO:');
        doc.font('Helvetica').text(
            'O(A) LOCATÁRIO(A) pode solicitar o cancelamento desta reserva, sujeito às seguintes regras:',
            { continued: true }
        ).text(' '); 
        doc.list([
            'Direito de Arrependimento (Art. 49, CDC): O(A) LOCATÁRIO(A) pode cancelar esta reserva em até 7 (sete) dias corridos após a data do pagamento do sinal, recebendo o reembolso integral do valor pago.',
            'Política da Loja (Após 7 dias): Se o prazo legal de 7 dias já passou, valerá a seguinte regra:',
            '  - Cancelamento com mais de 2 dias de antecedência do início do aluguel: Reembolso integral do sinal.',
            '  - Cancelamento com 2 dias ou menos de antecedência do início do aluguel: Será retida uma taxa de 5% sobre o VALOR TOTAL do contrato, e o restante do sinal pago será reembolsado.'
        ], { indent: 20 });
        
        doc.moveDown(2);

        doc.fontSize(12);
        doc.text('________________________________________', { align: 'center' });
        doc.text(order.Usuario.nome, { align: 'center' });
        doc.text('(Assinado digitalmente ao aceitar os termos na plataforma)', { align: 'center', fontSize: 9 });

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

        const pagamentoOriginal = await Pagamento.findOne({ 
            where: { 
                id_ordem_servico: order.id, 
                status_pagamento: 'aprovado' 
            } 
        });
        if (!pagamentoOriginal) {
            return res.status(500).json({ error: 'Registro do pagamento original não encontrado.' });
        }

        const hoje = new Date();
        const dataDoPagamento = new Date(pagamentoOriginal.createdAt);
        const dataInicioAluguel = new Date(order.data_inicio);

        const diffPagamento = hoje.getTime() - dataDoPagamento.getTime();
        const diasDesdePagamento = Math.ceil(diffPagamento / (1000 * 60 * 60 * 24));

        const diffAluguel = dataInicioAluguel.getTime() - hoje.getTime();
        const diasParaAluguel = Math.ceil(diffAluguel / (1000 * 60 * 60 * 24));

        let taxa_cancelamento = 0;
        let valor_reembolsado = 0;
        let mensagem = "";

        if (diasDesdePagamento <= 7) {
            taxa_cancelamento = 0;
            valor_reembolsado = Number(order.valor_sinal);
            mensagem = `Reserva cancelada dentro do prazo de 7 dias (Art. 49 CDC). Reembolso total de R$ ${valor_reembolsado.toFixed(2)} processado.`;
        
        } else {
            
            if (diasParaAluguel <= 2) {
                // Cancelamento em cima da hora
                taxa_cancelamento = Number(order.valor_total) * 0.05;
                valor_reembolsado = Number(order.valor_sinal) - taxa_cancelamento;
                mensagem = `Cancelamento fora do prazo legal e a menos de 2 dias do aluguel. Taxa de R$ ${taxa_cancelamento.toFixed(2)} aplicada. Reembolso de R$ ${valor_reembolsado.toFixed(2)} processado.`;
            } else {
                // Cancelamento com antecedência
                taxa_cancelamento = 0;
                valor_reembolsado = Number(order.valor_sinal);
                mensagem = `Reserva cancelada com antecedência. Reembolso total do sinal de R$ ${valor_reembolsado.toFixed(2)} processado.`;
            }
        }
        
        if (valor_reembolsado < 0) valor_reembolsado = 0;

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

        res.status(200).json({ message: mensagem });

    } catch (error) {
        console.error('Erro ao cancelar a ordem de serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao cancelar.' });
    }
};

const checkRescheduleAvailability = async (req, res) => {
    const { startDate, endDate } = req.body;
    const orderId = req.params.id;

    try {
        const order = await OrdemDeServico.findByPk(orderId, { include: [{ model: ItemReserva, as: 'ItemReservas' }] });
        if (!order) return res.status(404).json({ error: 'Ordem não encontrada.' });

        let allItemsAvailable = true;
        for (const item of order.ItemReservas) {
            const unidade = await Unidade.findByPk(item.id_unidade, { include: [{ model: Equipamento, as: 'Equipamento' }] });
            if (!unidade) { allItemsAvailable = false; break; }

            const itemRequest = {
                id_equipamento: unidade.Equipamento.id,
                quantidade: 1,
                data_inicio: startDate,
                data_fim: endDate,
            };

            const unidadesDisponiveis = await verificarDisponibilidade(itemRequest, {}, orderId);
            const isThisUnitStillAvailable = unidadesDisponiveis.some(u => u.id === item.id_unidade);
            
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
            const order = await OrdemDeServico.findByPk(orderId, { 
                include: [{ model: ItemReserva, as: 'ItemReservas' }], 
                transaction: t 
            });

            if (!order || order.id_usuario !== req.user.id) {
                throw new Error('Ordem não encontrada ou acesso negado.');
            }
            if (!['aprovada', 'aguardando_assinatura', 'em_andamento'].includes(order.status)) {
                throw new Error('Este pedido não pode mais ser remarcado.');
            }

            const dataInicioOriginal = parseDateStringAsLocal(order.data_inicio);
            const hoje = new Date();
            const diffTime = dataInicioOriginal.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const taxa_remarcacao = (diffDays <= 2) 
                ? (Number(order.valor_total) * 0.05) 
                : (order.taxa_remarcacao || 0);

            const oneDay = 1000 * 60 * 60 * 24;
            const originalDuration = (parseDateStringAsLocal(order.data_fim) - parseDateStringAsLocal(order.data_inicio)) / oneDay;
            const newDuration = (new Date(newEndDate) - new Date(newStartDate)) / oneDay;

            if (originalDuration !== newDuration) {
                throw new Error('A duração da remarcação deve ser a mesma da reserva original.');
            }

            for (const item of order.ItemReservas) {
                const unidade = await Unidade.findByPk(item.id_unidade, { include: [{ model: Equipamento, as: 'Equipamento' }], transaction: t });
                const itemRequest = { id_equipamento: unidade.Equipamento.id, quantidade: 1, data_inicio: newStartDate, data_fim: newEndDate };
                
                const unidadesDisponiveis = await verificarDisponibilidade(itemRequest, { transaction: t }, orderId);
                
                if (!unidadesDisponiveis.some(u => u.id === item.id_unidade)) {
                    throw new Error(`Conflito: A unidade #${item.id_unidade} não está disponível.`);
                }
            }

            await order.update({
                data_inicio: newStartDate,
                data_fim: newEndDate,
                taxa_remarcacao: taxa_remarcacao 
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

const skipReturnInspection = async (req, res) => {
    try {
        await sequelize.transaction(async (t) => {
            const order = await OrdemDeServico.findByPk(req.params.id, {
                include: [{ model: ItemReserva, as: 'ItemReservas' }],
                transaction: t
            });

            if (!order) {
                throw new Error('Ordem de serviço não encontrada.');
            }
            if (order.status !== 'em_andamento') {
                throw new Error('Este pedido não está na etapa de devolução.');
            }

            await order.update({
                status: 'aguardando_pagamento_final',
                taxa_avaria: 0
            }, { transaction: t });

            for (const item of order.ItemReservas) {
                const unidade = await Unidade.findByPk(item.id_unidade, { transaction: t });
                if (unidade && unidade.status === 'alugado') {
                    await unidade.update({ status: 'disponivel' }, { transaction: t });
                }
            }
        });

        res.status(200).json({ message: 'Devolução rápida registrada com sucesso.' });
    } catch (error) {
        console.error('Erro na devolução rápida:', error);
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
    rescheduleOrder,
    skipReturnInspection
};