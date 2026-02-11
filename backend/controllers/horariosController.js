const { HorarioFuncionamento } = require('../models');

const getHorarios = async (req, res) => {
    try {
        const horarios = await HorarioFuncionamento.findAll({ order: [['id', 'ASC']] });
        res.status(200).json(horarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar horários.' });
    }
};

const updateHorarios = async (req, res) => {
    const { horarios } = req.body;

    try {
        if (!horarios || !Array.isArray(horarios)) {
            return res.status(400).json({ error: 'Formato inválido.' });
        }

        for (const item of horarios) {
            
            const registroExistente = await HorarioFuncionamento.findOne({ 
                where: { dia_semana: item.dia_semana } 
            });

            if (registroExistente) {
                await registroExistente.update({
                    horario_abertura: item.horario_abertura,
                    horario_fechamento: item.horario_fechamento,
                    fechado: item.fechado
                });
            } else {
                await HorarioFuncionamento.create({
                    dia_semana: item.dia_semana,
                    horario_abertura: item.horario_abertura,
                    horario_fechamento: item.horario_fechamento,
                    fechado: item.fechado
                });
            }
        }

        res.status(200).json({ message: 'Horários atualizados com sucesso.' });

    } catch (error) {
        console.error("Erro ao atualizar horários:", error);
        res.status(500).json({ error: 'Erro interno ao atualizar horários.' });
    }
};

module.exports = { getHorarios, updateHorarios };