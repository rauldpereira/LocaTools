'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrdensDeServico', 'tipo_entrega', {
      type: Sequelize.ENUM('retirada', 'entrega'),
      allowNull: false,
      defaultValue: 'retirada',
    });
    await queryInterface.addColumn('OrdensDeServico', 'endereco_entrega', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('OrdensDeServico', 'custo_frete', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    });
    await queryInterface.addColumn('OrdensDeServico', 'valor_sinal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrdensDeServico', 'tipo_entrega');
    await queryInterface.removeColumn('OrdensDeServico', 'endereco_entrega');
    await queryInterface.removeColumn('OrdensDeServico', 'custo_frete');
    await queryInterface.removeColumn('OrdensDeServico', 'valor_sinal');
  }
};