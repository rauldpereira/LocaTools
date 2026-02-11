'use strict';
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('ItensReserva', 'id_ordem_servico', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  async down (queryInterface, Sequelize) {
  }
};