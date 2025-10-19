const { TipoAvaria } = require('../models');

const getTiposAvariaByEquipment = async (req, res) => {
    try {
        const tiposAvaria = await TipoAvaria.findAll({ where: { id_equipamento: req.params.equipmentId } });
        res.status(200).json(tiposAvaria);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tipos de avaria.' });
    }
};

const createTipoAvaria = async (req, res) => {
    try {
        const novoTipoAvaria = await TipoAvaria.create(req.body);
        res.status(201).json(novoTipoAvaria);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar tipo de avaria.' });
    }
};

const deleteTipoAvaria = async (req, res) => {
    try {
        const tipoAvaria = await TipoAvaria.findByPk(req.params.id);
        if (!tipoAvaria) {
            return res.status(404).json({ error: 'Tipo de avaria não encontrado.' });
        }
       
        if (tipoAvaria.is_default) {
            return res.status(400).json({ error: 'Não é possível remover o tipo de avaria padrão.' });
        }
        await tipoAvaria.destroy();
        res.status(200).json({ message: 'Tipo de avaria deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar tipo de avaria.' });
    }
};

const updateTipoAvaria = async (req, res) => {
    try {
        const { descricao, preco } = req.body;
        const tipoAvaria = await TipoAvaria.findByPk(req.params.id);

        if (!tipoAvaria) {
            return res.status(404).json({ error: 'Tipo de avaria não encontrado.' });
        }

        if (tipoAvaria.is_default && descricao !== tipoAvaria.descricao) {
             return res.status(400).json({ error: 'Não é possível alterar a descrição do tipo de avaria padrão.' });
        }

        tipoAvaria.descricao = descricao;
        tipoAvaria.preco = preco;
        await tipoAvaria.save();

        res.status(200).json(tipoAvaria);
    } catch (error) {
        console.error("Erro ao atualizar tipo de avaria:", error);
        res.status(500).json({ error: 'Erro ao atualizar tipo de avaria.' });
    }
};

module.exports = { 
    getTiposAvariaByEquipment, 
    createTipoAvaria, 
    deleteTipoAvaria,
    updateTipoAvaria
};