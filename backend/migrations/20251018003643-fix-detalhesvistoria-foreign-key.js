'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Tenta remover a constraint antiga. Se não existir, o catch vai ignorar o erro.
      await queryInterface.removeConstraint('DetalhesVistoria', 'detalhesvistoria_ibfk_2');
      console.log('INFO: Constraint antiga "detalhesvistoria_ibfk_2" removida com sucesso.');
    } catch (error) {
      // Se a constraint não existir, o Sequelize vai dar um erro. Nós o capturamos e o ignoramos.
      console.log('INFO: A constraint antiga "detalhesvistoria_ibfk_2" não foi encontrada, pulando a remoção. Isso é normal se a correção já foi aplicada.');
    }

    // Passo final e mais importante: Adiciona a nova constraint correta, apontando para a tabela 'Unidades'.
    await queryInterface.addConstraint('DetalhesVistoria', {
      fields: ['id_item_equipamento'],
      type: 'foreign key',
      name: 'fk_detalhesvistoria_unidades',
      references: {
        table: 'Unidades',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // A função 'down' descreve como reverter as mudanças.
    await queryInterface.removeConstraint('DetalhesVistoria', 'fk_detalhesvistoria_unidades');

    // Tenta adicionar a constraint antiga de volta (só para consistência)
    await queryInterface.addConstraint('DetalhesVistoria', {
      fields: ['id_item_equipamento'],
      type: 'foreign key',
      name: 'detalhesvistoria_ibfk_2', 
      references: {
        table: 'itensequipamento',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  }
};