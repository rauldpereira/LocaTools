'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Entregas', {
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
      id_motorista: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      id_endereco_entrega: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Enderecos',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status_entrega: {
        type: Sequelize.ENUM('em_preparacao', 'em_transito', 'entregue', 'devolvido'),
        allowNull: false
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
    await queryInterface.dropTable('Entregas');
  }
};