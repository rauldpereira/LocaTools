'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Equipamentos', 'preco_semanal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('Equipamentos', 'preco_quinzenal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('Equipamentos', 'preco_mensal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Equipamentos', 'preco_semanal');
    await queryInterface.removeColumn('Equipamentos', 'preco_quinzenal');
    await queryInterface.removeColumn('Equipamentos', 'preco_mensal');
  }
};
