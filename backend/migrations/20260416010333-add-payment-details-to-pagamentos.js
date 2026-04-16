'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pagamentos', 'metodo_detalhe', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Pagamentos', 'cartao_final', {
      type: Sequelize.STRING(4),
      allowNull: true,
    });
    await queryInterface.addColumn('Pagamentos', 'parcelas', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Pagamentos', 'metodo_detalhe');
    await queryInterface.removeColumn('Pagamentos', 'cartao_final');
    await queryInterface.removeColumn('Pagamentos', 'parcelas');
  }
};