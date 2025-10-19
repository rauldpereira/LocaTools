const { HorarioFuncionamento } = require('../models');

const getHorarios = async (req, res) => {
    try {
        const horarios = await HorarioFuncionamento.findAll({ order: [['id', 'ASC']] });
        res.status(200).json(horarios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar horários.' });
    }
};

const updateHorarios = async (req, res) => {
    const horariosData = req.body;
    try {
        for (const horario of horariosData) {
            await HorarioFuncionamento.upsert(horario);
        }
        res.status(200).json({ message: 'Horários atualizados com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar horários:", error);
        res.status(500).json({ error: 'Erro ao atualizar horários.' });
    }
};

module.exports = { getHorarios, updateHorarios };