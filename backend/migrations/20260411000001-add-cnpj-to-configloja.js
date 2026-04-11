module.exports = { 
  up: async (queryInterface, Sequelize) => { 
    await queryInterface.addColumn('ConfigLoja', 'cnpj', { 
      type: Sequelize.STRING, 
      defaultValue: '00.000.000/0001-00', 
      allowNull: true 
    }); 
  }, 
  down: async (queryInterface, Sequelize) => { 
    await queryInterface.removeColumn('ConfigLoja', 'cnpj'); 
  } 
};