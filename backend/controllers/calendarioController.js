
const { HorarioFuncionamento, DiasExcecoes } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

const diasSemanaMap = [
    'domingo', 
    'segunda', 
    'terca',   
    'quarta',  
    'quinta',  
    'sexta',   
    'sabado'   
];

exports.getStatusMensal = async (req, res) => {

    const { ano, mes } = req.query;

    if (!ano || !mes) {
        return res.status(400).json({ error: 'Ano e mês são obrigatórios.' });
    }

    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;

    try {
        const regrasPadraoRaw = await HorarioFuncionamento.findAll();
        const regrasPadrao = regrasPadraoRaw.reduce((acc, regra) => {
            acc[regra.dia_semana] = { fechado: regra.fechado };
            return acc;
        }, {});

        const primeiroDia = new Date(anoNum, mesNum, 1);
        const ultimoDia = new Date(anoNum, mesNum + 1, 0);

        const excecoesRaw = await DiasExcecoes.findAll({
            where: {
                data: {
                    [Op.gte]: primeiroDia.toISOString().split('T')[0],
                    [Op.lte]: ultimoDia.toISOString().split('T')[0]
                }
            }
        });

        const excecoes = excecoesRaw.reduce((acc, exc) => {
            acc[exc.data] = exc;
            return acc;
        }, {});

        const calendarioFinal = [];
        const ultimoDiaNum = ultimoDia.getDate();

        for (let dia = 1; dia <= ultimoDiaNum; dia++) {
            const dataAtual = new Date(anoNum, mesNum, dia);
            const dataString = dataAtual.toISOString().split('T')[0];
            const diaSemanaString = diasSemanaMap[dataAtual.getDay()];

            let statusFinal = '';
            let fonte = '';
            let descricao = null;

            let tipo = null;

            if (excecoes[dataString]) {
                const excecao = excecoes[dataString];
                statusFinal = excecao.funcionamento ? 'ABERTO' : 'FECHADO';
                fonte = 'excecao';
                descricao = excecao.descricao;
                tipo = excecao.tipo;

            } else {
                const regra = regrasPadrao[diaSemanaString];
                statusFinal = (regra && !regra.fechado) ? 'ABERTO' : 'FECHADO';
                fonte = 'padrao';
            }

            calendarioFinal.push({
                data: dataString,
                status: statusFinal,
                fonte: fonte,
                descricao: descricao,
                tipo: tipo
            });
        }
        res.status(200).json(calendarioFinal);

    } catch (error) {
        console.error("Erro ao buscar status mensal do calendário:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};


exports.criarOuAtualizarExcecao = async (req, res) => {

    const { data, tipo, funcionamento, descricao } = req.body;

    if (!data || !tipo || funcionamento === undefined) {
        return res.status(400).json({ error: 'Data, tipo e funcionamento são obrigatórios.' });
    }

    const boolFuncionamento = !!funcionamento;

    try {

        const [excecao, foiCriado] = await DiasExcecoes.findOrCreate({
            where: { data: data },
            defaults: {
                data: data,
                tipo: tipo,
                funcionamento: boolFuncionamento,
                descricao: descricao
            }
        });

        if (foiCriado) {
            return res.status(201).json(excecao);
        }

        excecao.tipo = tipo;
        excecao.funcionamento = boolFuncionamento;
        excecao.descricao = descricao;

        await excecao.save();

        res.status(200).json(excecao);

    } catch (error) {
        console.error("Erro ao criar/atualizar exceção:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

exports.deletarExcecao = async (req, res) => {

    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ error: 'A data é obrigatória.' });
    }

    try {
        const resultado = await DiasExcecoes.destroy({
            where: { data: data }
        });

        if (resultado === 0) {

            return res.status(404).json({ error: 'Nenhuma exceção encontrada para esta data.' });
        }

        res.status(204).send();

    } catch (error) {
        console.error("Erro ao deletar exceção:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

exports.importarFeriados = async (req, res) => {
    const { ano } = req.body;

    if (!ano) {
        return res.status(400).json({ error: 'O ano é obrigatório.' });
    }

    try {
        const urlApi = `https://brasilapi.com.br/api/feriados/v1/${ano}`;
        let feriadosExternos;

        try {
            const response = await axios.get(urlApi);
            feriadosExternos = response.data;
        } catch (apiError) {
            console.error("Erro ao buscar dados da BrasilAPI:", apiError.message);
            return res.status(502).json({ error: "Falha ao buscar feriados na API externa." });
        }

        if (!feriadosExternos || feriadosExternos.length === 0) {
            return res.status(404).json({ error: "Nenhum feriado encontrado para este ano na API." });
        }

        const feriadosParaNossoDB = feriadosExternos.map(feriado => ({
            data: feriado.date,
            tipo: 'feriado',
            funcionamento: false,
            descricao: feriado.name
        }));

        const resultado = await DiasExcecoes.bulkCreate(feriadosParaNossoDB, {
            updateOnDuplicate: ["tipo", "funcionamento", "descricao"]
        });

        res.status(200).json({
            message: `${resultado.length} feriados nacionais foram importados ou atualizados com sucesso.`,
            feriados: resultado
        });

    } catch (error) {
        console.error("Erro ao importar feriados:", error);
        res.status(500).json({ error: "Erro interno do servidor ao processar feriados." });
    }
};