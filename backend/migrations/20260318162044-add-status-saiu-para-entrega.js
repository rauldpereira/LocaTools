'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_OrdensDeServico_status" ADD VALUE 'saiu_para_entrega';`
    );
  },

  down: async (queryInterface, Sequelize) => {
  }
};