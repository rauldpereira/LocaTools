'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dias_excecoes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      data: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true
      },
      tipo: {
        type: Sequelize.ENUM('feriado', 'parada', 'extra', 'outro'),
        allowNull: false,
        defaultValue: 'outro'
      },
      funcionamento: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: '1 (true) = ABERTO, 0 (false) = FECHADO'
      },
      descricao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') 
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dias_excecoes');
  }
};