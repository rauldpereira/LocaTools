'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Pagamentos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_reserva: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Reservas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status_pagamento: {
        type: Sequelize.ENUM('aprovado', 'recusado', 'pendente'),
        allowNull: false
      },
      data_pagamento: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      id_transacao_externa: {
        type: Sequelize.STRING(255)
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Pagamentos');
  }
};