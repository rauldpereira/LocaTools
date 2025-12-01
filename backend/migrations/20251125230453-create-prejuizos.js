'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Prejuizos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      item_reserva_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ItensReserva',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tipo: {
        type: Sequelize.ENUM('ROUBO', 'CALOTE', 'AVARIA', 'EXTRAVIO', 'OUTRO'),
        allowNull: false
      },
      valor_prejuizo: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolvido: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      data_resolucao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      forma_recuperacao: {
        type: Sequelize.STRING,
        allowNull: true
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Prejuizos');
  }
};