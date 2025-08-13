'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DetalhesVistoria extends Model {
    static associate(models) {
      DetalhesVistoria.belongsTo(models.Vistoria, {
        foreignKey: 'id_vistoria',
      });
      DetalhesVistoria.belongsTo(models.ItensEquipamento, {
        foreignKey: 'id_item_equipamento',
      });
    }
  }
  DetalhesVistoria.init({
    id_vistoria: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vistorias',
        key: 'id',
      },
    },
    id_item_equipamento: {
      type: DataTypes.INTEGER,
      references: {
        model: 'ItensEquipamento',
        key: 'id',
      },
    },
    condicao: {
      type: DataTypes.ENUM('ok', 'danificado'),
      allowNull: false,
    },
    foto: DataTypes.STRING,
    comentarios: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'DetalhesVistoria',
  });
  return DetalhesVistoria;
};