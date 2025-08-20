'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ItensEquipamento extends Model {
    static associate(models) {
      ItensEquipamento.belongsTo(models.Equipamento, {
        foreignKey: 'id_equipamento',
      });
      
      ItensEquipamento.hasMany(models.DetalhesVistoria, {
        foreignKey: 'id_item_equipamento',
      });
    }
  }
  ItensEquipamento.init({
    id_equipamento: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Equipamentos',
        key: 'id',
      },
    },
    nome_item: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'ItensEquipamento',
  });
  return ItensEquipamento;
};