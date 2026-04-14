'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ConfigLoja', 'telefone_contato', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: '12 98837-6000'
    });
    await queryInterface.addColumn('ConfigLoja', 'email_contato', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'exemplo@exemplo.com'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ConfigLoja', 'telefone_contato');
    await queryInterface.removeColumn('ConfigLoja', 'email_contato');
  }
};
