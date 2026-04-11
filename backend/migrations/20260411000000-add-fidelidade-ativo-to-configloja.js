module.exports = { 
  up: async (queryInterface, Sequelize) => { 
    await queryInterface.addColumn('ConfigLoja', 'fidelidade_ativo', { 
      type: Sequelize.BOOLEAN, 
      defaultValue: true, 
      allowNull: false 
    }); 
  }, 
  down: async (queryInterface, Sequelize) => { 
    await queryInterface.removeColumn('ConfigLoja', 'fidelidade_ativo'); 
  } 
};