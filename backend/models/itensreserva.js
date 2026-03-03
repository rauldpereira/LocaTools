'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ItemReserva extends Model {
    static associate(models) {
      ItemReserva.belongsTo(models.OrdemDeServico, {
        foreignKey: 'id_ordem_servico',
      });
      ItemReserva.belongsTo(models.Unidade, {
        foreignKey: 'id_unidade',
      });
      ItemReserva.hasOne(models.Prejuizo, {
        foreignKey: 'item_reserva_id',
        as: 'prejuizo'
      });
    }
  }
  ItemReserva.init({
    id_ordem_servico: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdensDeServico',
        key: 'id',
      },
    },
    id_unidade: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Unidades',
        key: 'id',
      },
    },
    data_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_fim: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ATIVO'
    },
    data_devolucao_real: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ItemReserva',
    tableName: 'ItensReserva'
  });
  return ItemReserva;
};