'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Adiciona o 'funcionario' nas opções aceitas pelo banco (se já não existir)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_Usuarios_tipo_usuario" ADD VALUE IF NOT EXISTS 'funcionario';`);
    
    // 2. Transforma todo mundo que era 'motorista' em 'funcionario' (e já dá a permissão de vistoria pra eles não perderem acesso)
    await queryInterface.sequelize.query(`
      UPDATE "Usuarios" 
      SET tipo_usuario = 'funcionario', permissoes = '["fazer_vistoria", "gerenciar_entregas"]' 
      WHERE tipo_usuario = 'motorista';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Opcional: reverter caso dê merda
    await queryInterface.sequelize.query(`UPDATE "Usuarios" SET tipo_usuario = 'motorista' WHERE tipo_usuario = 'funcionario';`);
  }
};