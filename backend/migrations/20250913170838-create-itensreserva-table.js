'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ItensReserva', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_ordem_servico: {
        type: Sequelize.INTEGER,
        references: {
          model: 'OrdensDeServico',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false
      },
      id_unidade: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Unidades',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true
      },
      data_inicio: {
        type: Sequelize.DATE,
        allowNull: false
      },
      data_fim: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ItensReserva');
  }
};