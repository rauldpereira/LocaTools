'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 🔨 Comando SQL puro para obrigar o Postgres a aceitar o novo status
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_OrdensDeServico_status" ADD VALUE 'aguardando_assinatura_devolucao';`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // O Postgres não deixa remover valor de ENUM facilmente, então deixamos vazio.
  }
};