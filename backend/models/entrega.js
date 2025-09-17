'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Entrega extends Model {
    static associate(models) {
      // Uma Entrega pertence a uma OrdemDeServico
      Entrega.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_ordem_servico',
      });
      // Uma Entrega pertence a um Motorista (Usuario)
      Entrega.belongsTo(models.Usuario, {
        foreignKey: 'id_motorista',
      });
      // Uma Entrega pertence a um Endereco
      Entrega.belongsTo(models.Endereco, {
        foreignKey: 'id_endereco_entrega',
      });
    }
  }
  Entrega.init({
    id_ordem_servico: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdensDeServico',
        key: 'id',
      },
    },
    id_motorista: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
    },
    id_endereco_entrega: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Enderecos',
        key: 'id',
      },
    },
    status_entrega: {
      type: DataTypes.ENUM('em_preparacao', 'em_transito', 'entregue', 'devolvido'),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Entrega',
  });
  return Entrega;
};