const { Op } = require('sequelize');
const { OrdemDeServico, Prejuizo, ItemReserva, Unidade, Equipamento, Usuario, Pagamento, sequelize } = require('../models');

const getFinancialReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const metrics = await OrdemDeServico.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalPedidos'],
                [sequelize.fn('SUM', sequelize.col('valor_total')), 'faturamentoTotal'],
                [sequelize.fn('SUM', sequelize.col('taxa_avaria')), 'totalTaxaAvaria'],
                [sequelize.fn('SUM', sequelize.col('taxa_remarcacao')), 'totalTaxaRemarcacao']
            ],
            where: {
                status: 'finalizada',
                createdAt: { [Op.between]: [startDate, endDate] }
            },
            raw: true
        });

        const data = metrics[0] || {};
        const faturamentoBase = Number(data.faturamentoTotal) || 0;
        const totalPedidos = Number(data.totalPedidos) || 0;
        
        const totalPrejuizoAberto = await Prejuizo.sum('valor_prejuizo', {
            where: { resolvido: false, createdAt: { [Op.between]: [startDate, endDate] } }
        }) || 0;

        const totalPrejuizoRecuperado = await Prejuizo.sum('valor_prejuizo', {
            where: { resolvido: true, data_resolucao: { [Op.between]: [startDate, endDate] } }
        }) || 0;

        const faturamentoTotal = faturamentoBase + totalPrejuizoRecuperado;
        const lucroLiquido = faturamentoTotal - totalPrejuizoAberto;

        const totalMaquinas = await Unidade.count();
        const maquinasAlugadas = await Unidade.count({ where: { status: 'alugado' } });
        const maquinasManutencao = await Unidade.count({ where: { status: { [Op.in]: ['manutencao', 'MANUTENCAO'] } } });
        const maquinasDisponiveis = totalMaquinas - maquinasAlugadas - maquinasManutencao;

        const receitasPorMes = await OrdemDeServico.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'mes'],
                [sequelize.fn('SUM', sequelize.col('valor_total')), 'total']
            ],
            where: { status: 'finalizada', createdAt: { [Op.between]: [startDate, endDate] } },
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
            raw: true
        });

        const prejuizosPorMes = await Prejuizo.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'mes'],
                [sequelize.fn('SUM', sequelize.col('valor_prejuizo')), 'total']
            ],
            where: { createdAt: { [Op.between]: [startDate, endDate] } },
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
            raw: true
        });

        const itensAlugados = await ItemReserva.findAll({
            where: { createdAt: { [Op.between]: [startDate, endDate] } },
            include: [{
                model: Unidade, as: 'Unidade',
                include: [{ model: Equipamento, as: 'Equipamento', attributes: ['nome', 'preco_diaria'] }]
            }]
        });

        const equipamentosMap = {};
        itensAlugados.forEach(item => {
            const equip = item.Unidade?.Equipamento;
            if (!equip) return;
            const nome = equip.nome;
            const preco = Number(equip.preco_diaria);
            const dias = Math.ceil(Math.abs(new Date(item.data_fim) - new Date(item.data_inicio)) / (86400000)) + 1;
            
            if (!equipamentosMap[nome]) equipamentosMap[nome] = { nome, alugueis: 0, receita: 0 };
            equipamentosMap[nome].alugueis += 1;
            equipamentosMap[nome].receita += (dias * preco);
        });
        const topEquipamentos = Object.values(equipamentosMap).sort((a, b) => b.receita - a.receita).slice(0, 5);

        const pagamentosDetalhados = await Pagamento.findAll({
            where: { 
                createdAt: { [Op.between]: [startDate, endDate] },
                status_pagamento: 'aprovado'
            },
            include: [{ 
                model: OrdemDeServico, 
                as: 'OrdemDeServico',
                attributes: ['id'],
                include: [{ model: Usuario, as: 'Usuario', attributes: ['nome'] }]
            }],
            order: [['createdAt', 'DESC']]
        });

        const extrato = pagamentosDetalhados.map(p => ({
            id: p.id,
            data: p.createdAt,
            descricao: `Pagamento Pedido #${p.id_ordem_servico} - ${p.OrdemDeServico?.Usuario?.nome || 'Cliente'}`,
            valor: parseFloat(p.valor),
            tipo: 'RECEITA'
        }));

        const prejuizosDetalhados = await Prejuizo.findAll({
            where: { 
                createdAt: { [Op.between]: [startDate, endDate] },
                resolvido: false
            },
            include: [{
                model: ItemReserva, as: 'itemReserva',
                include: [{ model: Unidade, as: 'Unidade', include: [{model: Equipamento, as: 'Equipamento', attributes: ['nome']}] }]
            }]
        });

        prejuizosDetalhados.forEach(p => {
            extrato.push({
                id: `BO-${p.id}`,
                data: p.createdAt,
                descricao: `Prejuízo (${p.tipo}) - ${p.itemReserva?.Unidade?.Equipamento?.nome}`,
                valor: parseFloat(p.valor_prejuizo) * -1,
                tipo: 'DESPESA'
            });
        });

        extrato.sort((a, b) => new Date(b.data) - new Date(a.data));

        res.json({
            kpis: {
                faturamentoTotal,
                lucroLiquido,
                totalPedidos,
                ticketMedio: totalPedidos > 0 ? (faturamentoTotal / totalPedidos) : 0,
                totalPrejuizoAberto,
                totalPrejuizoRecuperado
            },
            inventory: {
                total: totalMaquinas,
                alugadas: maquinasAlugadas,
                disponiveis: maquinasDisponiveis,
                manutencao: maquinasManutencao
            },
            history: { receitas: receitasPorMes, prejuizos: prejuizosPorMes },
            topEquipamentos,
            extrato
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro interno ao gerar relatório.' });
    }
};

const getOperationalReport = async (req, res) => {
    try {
        const ocorrencias = await Prejuizo.findAll({
            include: [{
                model: ItemReserva,
                as: 'itemReserva',
                include: [
                    { 
                        model: Unidade, as: 'Unidade',
                        include: [{ model: Equipamento, as: 'Equipamento', attributes: ['nome'] }]
                    },
                    {
                        model: OrdemDeServico,
                        include: [{ model: Usuario, as: 'Usuario', attributes: ['nome', 'email', 'telefone'] }]
                    }
                ]
            }],
            order: [['createdAt', 'DESC']]
        });

        const inventario = await Unidade.findAll({
            include: [
                { model: Equipamento, as: 'Equipamento', attributes: ['nome'] }
            ],
            order: [['id', 'ASC']]
        });

        const listaOcorrencias = ocorrencias.map(bo => ({
            id: bo.id,
            data: bo.createdAt,
            tipo: bo.tipo,
            equipamento: bo.itemReserva?.Unidade?.Equipamento?.nome || 'Desc. excluído',
            unidadeId: bo.itemReserva?.id_unidade,
            cliente: bo.itemReserva?.OrdemDeServico?.Usuario?.nome || 'Desc. excluído',
            contato: bo.itemReserva?.OrdemDeServico?.Usuario?.telefone || bo.itemReserva?.OrdemDeServico?.Usuario?.email || 'S/N',
            valor: bo.valor_prejuizo,
            resolvido: bo.resolvido,
            obs: bo.observacao
        }));

        const listaInventario = inventario.map(uni => ({
            id: uni.id,
            equipamento: uni.Equipamento?.nome,
            status: uni.status,
            observacao: uni.observacao
        }));

        res.json({
            ocorrencias: listaOcorrencias,
            inventario: listaInventario
        });

    } catch (error) {
        console.error("Erro no relatório operacional:", error);
        res.status(500).json({ error: 'Erro ao buscar dados operacionais.' });
    }
};

module.exports = { getFinancialReport, getOperationalReport };