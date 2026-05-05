const express = require('express');
const { Categoria, Equipamento } = require('../models');
const { protect, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();

// Público
router.get('/', async (req, res) => {
    try {
        const categorias = await Categoria.findAll();
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Protegido
router.post('/', protect, checkPermissao('gerenciar_estoque'), async (req, res) => {
    const { nome } = req.body;
    try {
        if (!nome) {
            return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
        }
        const novaCategoria = await Categoria.create({ nome });
        res.status(201).json(novaCategoria);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.put('/:id', protect, checkPermissao('gerenciar_estoque'), async (req, res) => {
    const { nome } = req.body;
    try {
        if (!nome) {
            return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
        }
        const categoria = await Categoria.findByPk(req.params.id);
        if (!categoria) {
            return res.status(404).json({ error: 'Categoria não encontrada.' });
        }
        categoria.nome = nome;
        await categoria.save();
        res.status(200).json(categoria);
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

router.delete('/:id', protect, checkPermissao('gerenciar_estoque'), async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id);
        if (!categoria) {
            return res.status(404).json({ error: 'Categoria não encontrada.' });
        }
        
        // Verifica se existem equipamentos vinculados
        const equipamentosVinculados = await Equipamento.count({ where: { id_categoria: req.params.id } });
        if (equipamentosVinculados > 0) {
            return res.status(400).json({ error: 'Não é possível excluir esta categoria porque existem equipamentos vinculados a ela.' });
        }

        await categoria.destroy();
        res.status(200).json({ message: 'Categoria excluída com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir categoria:', error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
             return res.status(400).json({ error: 'Não é possível excluir esta categoria porque existem equipamentos vinculados a ela.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

module.exports = router;