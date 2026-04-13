'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'tipo_locacao', {
      type: Sequelize.ENUM('diaria', 'semanal', 'quinzenal', 'mensal'),
      allowNull: false,
      defaultValue: 'diaria'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'tipo_locacao');
  }
};
