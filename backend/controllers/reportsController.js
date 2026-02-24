const { Op } = require('sequelize');
const { OrdemDeServico, Prejuizo, ItemReserva, Unidade, Equipamento, Pagamento, Usuario, sequelize } = require('../models');


const getDatesInRange = (startStr, endStr) => {
    const arr = [];
    const dt = new Date(startStr + "T12:00:00");
    const final = new Date(endStr + "T12:00:00");

    while (dt <= final) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        
        arr.push(`${y}-${m}-${d}`);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
}

const getFinancialReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const dateFilter = (campoData) => ({
            [campoData]: {
                [Op.between]: [startDate, endDate]
            }
        });

        const metrics = await OrdemDeServico.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalPedidos'],
                [sequelize.fn('SUM', sequelize.col('valor_total')), 'faturamentoTotal'],
                [sequelize.fn('SUM', sequelize.col('taxa_avaria')), 'totalTaxaAvaria'],
                [sequelize.fn('SUM', sequelize.col('taxa_remarcacao')), 'totalTaxaRemarcacao']
            ],
            where: { status: 'finalizada', ...dateFilter('createdAt') },
            raw: true
        });

        const data = metrics[0] || {};
        const faturamentoBase = Number(data.faturamentoTotal) || 0;
        const totalPedidos = Number(data.totalPedidos) || 0;

        const totalPrejuizoAberto = await Prejuizo.sum('valor_prejuizo', {
            where: { resolvido: false, ...dateFilter('createdAt') }
        }) || 0;

        const totalPrejuizoRecuperado = await Prejuizo.sum('valor_prejuizo', {
            where: { resolvido: true, ...dateFilter('data_resolucao') }
        }) || 0;

        const totalAbandonos = await OrdemDeServico.count({
            where: { status: 'cancelada', ...dateFilter('createdAt') }
        });

        const valorPerdidoAbandono = await OrdemDeServico.sum('valor_total', {
            where: { status: 'cancelada', ...dateFilter('createdAt') }
        }) || 0;

        const totalPedidosGeral = await OrdemDeServico.count({
            where: { ...dateFilter('createdAt') }
        });
        const taxaAbandono = totalPedidosGeral > 0 ? ((totalAbandonos / totalPedidosGeral) * 100) : 0;

        const faturamentoTotal = faturamentoBase + totalPrejuizoRecuperado;
        const lucroLiquido = faturamentoTotal - totalPrejuizoAberto;

        const totalMaquinas = await Unidade.count();

        const dataAtual = new Date();
        const hojeDataIso = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;

        const ocupacoesHoje = await ItemReserva.findAll({
            where: {
                data_inicio: { [Op.lte]: hojeDataIso },
                data_fim: { [Op.gte]: hojeDataIso }
            },
            include: [{
                model: OrdemDeServico,
                as: 'OrdemDeServico',
                required: false,
                attributes: ['status']
            }]
        });

        const statusRealMap = {};

        let setManutencao = new Set();
        let setAlugadas = new Set();

        ocupacoesHoje.forEach(ocup => {
            const idUnidade = ocup.id_unidade;

            if (ocup.status === 'manutencao') {
                statusRealMap[idUnidade] = 'manutencao';
                setManutencao.add(idUnidade);
            }
            else if (ocup.OrdemDeServico && ocup.OrdemDeServico.status) {
                const osStatus = ocup.OrdemDeServico.status;

                if (['em_andamento', 'aprovada', 'aguardando_assinatura'].includes(osStatus)) {
                    statusRealMap[idUnidade] = 'alugado';
                    setAlugadas.add(idUnidade);
                }
                else if (osStatus === 'pendente') {
                    statusRealMap[idUnidade] = 'reservado';
                    setAlugadas.add(idUnidade);
                }
            }
        });

        const maquinasManutencao = setManutencao.size;
        const maquinasAlugadas = setAlugadas.size;
        const maquinasDisponiveis = Math.max(0, totalMaquinas - maquinasAlugadas - maquinasManutencao);

        const pgDateFormat = 'YYYY-MM-DD';

        const receitasRaw = await OrdemDeServico.findAll({
            attributes: [
                [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), pgDateFormat), 'data'],
                [sequelize.fn('SUM', sequelize.col('valor_total')), 'total']
            ],
            where: { status: 'finalizada', ...dateFilter('createdAt') },
            group: [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), pgDateFormat)],
            raw: true
        });

        const prejuizosRaw = await Prejuizo.findAll({
            attributes: [
                [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), pgDateFormat), 'data'],
                [sequelize.fn('SUM', sequelize.col('valor_prejuizo')), 'total']
            ],
            where: { ...dateFilter('createdAt') },
            group: [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), pgDateFormat)],
            raw: true
        });

        const receitasMap = {};
        const prejuizosMap = {};
        receitasRaw.forEach(r => receitasMap[r.data] = Number(r.total));
        prejuizosRaw.forEach(p => prejuizosMap[p.data] = Number(p.total));

        const allDateStrings = getDatesInRange(startDate, endDate);
        const receitasFinal = [];
        const prejuizosFinal = [];

        allDateStrings.forEach(dateStr => {
            receitasFinal.push({ mes: dateStr, total: receitasMap[dateStr] || 0 });
            prejuizosFinal.push({ mes: dateStr, total: prejuizosMap[dateStr] || 0 });
        });

        const pagamentosDetalhados = await Pagamento.findAll({
            where: { status_pagamento: 'aprovado', ...dateFilter('createdAt') },
            include: [{
                model: OrdemDeServico, as: 'OrdemDeServico', attributes: ['id'],
                include: [{ model: Usuario, as: 'Usuario', attributes: ['nome'] }]
            }],
            order: [['createdAt', 'DESC']]
        });

        const extrato = pagamentosDetalhados.map(p => {
            let desc = `Pagamento Pedido #${p.id_ordem_servico}`;
            let tipoRecuperacao = false;
            if (p.id_transacao_externa && p.id_transacao_externa.includes('recuperacao')) {
                desc = `RECUPERAÇÃO DE DÍVIDA - Pedido #${p.id_ordem_servico}`;
                tipoRecuperacao = true;
            } else {
                desc += ` - ${p.OrdemDeServico?.Usuario?.nome || 'Cliente'}`;
            }
            return {
                id: p.id,
                data: p.createdAt,
                descricao: desc,
                valor: parseFloat(p.valor),
                tipo: 'RECEITA',
                isRecuperacao: tipoRecuperacao
            };
        });

        const prejuizosDetalhados = await Prejuizo.findAll({
            where: { resolvido: false, ...dateFilter('createdAt') },
            include: [{
                model: ItemReserva, as: 'itemReserva',
                include: [{ model: Unidade, as: 'Unidade', include: [{ model: Equipamento, as: 'Equipamento', attributes: ['nome'] }] }]
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

        const itensAlugadosRaw = await ItemReserva.findAll({
            where: { ...dateFilter('createdAt') },
            include: [
                {
                    model: OrdemDeServico,
                    as: 'OrdemDeServico',
                    where: { status: 'finalizada' },
                    attributes: []
                },
                {
                    model: Unidade, as: 'Unidade',
                    include: [{ model: Equipamento, as: 'Equipamento', attributes: ['nome', 'preco_diaria'] }]
                }
            ]
        });

        const equipamentosMap = {};
        itensAlugadosRaw.forEach(item => {
            const equip = item.Unidade?.Equipamento;
            if (!equip) return;
            const nome = equip.nome;
            const preco = Number(equip.preco_diaria);
            const dias = Math.ceil(Math.abs(new Date(item.data_fim) - new Date(item.data_inicio)) / (86400000));
            const diasCobrados = dias === 0 ? 1 : dias;

            if (!equipamentosMap[nome]) equipamentosMap[nome] = { nome, alugueis: 0, receita: 0 };
            equipamentosMap[nome].alugueis += 1;
            equipamentosMap[nome].receita += (diasCobrados * preco);
        });
        const topEquipamentos = Object.values(equipamentosMap).sort((a, b) => b.receita - a.receita);

        const itensAbandonadosRaw = await ItemReserva.findAll({
            where: { ...dateFilter('createdAt') },
            include: [
                {
                    model: OrdemDeServico,
                    as: 'OrdemDeServico',
                    where: { status: 'cancelada' },
                    attributes: []
                },
                {
                    model: Unidade, as: 'Unidade',
                    include: [{ model: Equipamento, as: 'Equipamento', attributes: ['nome'] }]
                }
            ]
        });

        const abandonosMap = {};
        itensAbandonadosRaw.forEach(item => {
            const equip = item.Unidade?.Equipamento;
            if (!equip) return;
            const nome = equip.nome;

            if (!abandonosMap[nome]) abandonosMap[nome] = { nome, quantidade: 0 };
            abandonosMap[nome].quantidade += 1;
        });
        const topAbandonados = Object.values(abandonosMap).sort((a, b) => b.quantidade - a.quantidade);

        res.json({
            kpis: {
                faturamentoTotal,
                lucroLiquido,
                totalPedidos,
                ticketMedio: totalPedidos > 0 ? (faturamentoTotal / totalPedidos) : 0,
                totalPrejuizoAberto,
                totalPrejuizoRecuperado,
                totalAbandonos,
                valorPerdidoAbandono,
                taxaAbandono
            },
            inventory: { total: totalMaquinas, alugadas: maquinasAlugadas, disponiveis: maquinasDisponiveis, manutencao: maquinasManutencao },
            history: {
                receitas: receitasFinal,
                prejuizos: prejuizosFinal
            },
            topEquipamentos,
            topAbandonados,
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

        const dataAtual = new Date();
        const hojeDataIso = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;

        const ocupacoesHoje = await ItemReserva.findAll({
            where: {
                data_inicio: { [Op.lte]: hojeDataIso },
                data_fim: { [Op.gte]: hojeDataIso }
            },
            include: [{
                model: OrdemDeServico,
                as: 'OrdemDeServico',
                required: false,
                attributes: ['status']
            }]
        });

        const statusRealMap = {};

        let setManutencao = new Set();
        let setAlugadas = new Set();

        ocupacoesHoje.forEach(ocup => {
            const idUnidade = ocup.id_unidade;

            if (ocup.status === 'manutencao') {
                statusRealMap[idUnidade] = 'manutencao';
                setManutencao.add(idUnidade);
            }
            else if (ocup.OrdemDeServico && ocup.OrdemDeServico.status) {
                const osStatus = ocup.OrdemDeServico.status;

                if (['em_andamento', 'aprovada', 'aguardando_assinatura'].includes(osStatus)) {
                    statusRealMap[idUnidade] = 'alugado';
                    setAlugadas.add(idUnidade);
                }
                else if (osStatus === 'pendente') {
                    statusRealMap[idUnidade] = 'reservado';
                    setAlugadas.add(idUnidade);
                }
            }
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

        const listaInventario = inventario.map(uni => {
            const statusVerdadeiro = statusRealMap[uni.id] || 'disponivel';

            return {
                id: uni.id,
                equipamento: uni.Equipamento?.nome,
                status: statusVerdadeiro,
                observacao: uni.observacao
            };
        });

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