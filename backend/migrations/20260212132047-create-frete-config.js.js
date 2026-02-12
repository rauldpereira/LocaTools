'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('frete_config', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      preco_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 3.00
      },
      taxa_fixa: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 20.00
      },
      endereco_origem: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Av. Nossa Senhora do Bom Sucesso, 1000, Pindamonhangaba - SP'
      },
      raio_maximo_km: {
        type: Sequelize.INTEGER,
        defaultValue: 50
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
    await queryInterface.dropTable('frete_config');
  }
};