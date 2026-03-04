'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // No Postgres, o Sequelize nomeia os ENUMs no padrão: enum_NomeDaTabela_nomeDaColuna
    // IF NOT EXISTS garante que não vai dar erro se você rodar a migration duas vezes
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Unidades_status" ADD VALUE IF NOT EXISTS 'inativo';
    `);
  },

  async down (queryInterface, Sequelize) {
    // O Postgres não deixa "deletar" um valor de ENUM facilmente. 
    // Então no rollback a gente não faz nada, pois não quebra o sistema manter a palavra lá.
    console.log("Aviso: O PostgreSQL não suporta remover valores de ENUM nativamente.");
  }
};