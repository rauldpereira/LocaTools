'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HorariosFuncionamento', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      dia_semana: { type: Sequelize.STRING, allowNull: false, unique: true },
      horario_abertura: { type: Sequelize.TIME, allowNull: true },
      horario_fechamento: { type: Sequelize.TIME, allowNull: true },
      fechado: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('HorariosFuncionamento');
  }
};