'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrdemDeServico extends Model {
    static associate(models) {
      OrdemDeServico.belongsTo(models.Usuario, {
        foreignKey: 'id_usuario',
      });

      OrdemDeServico.hasMany(models.ItemReserva, {
        foreignKey: 'id_ordem_servico',
        as: 'ItemReservas'
      });

      OrdemDeServico.hasMany(models.Pagamento, {
        foreignKey: 'id_ordem_servico',
        as: 'Pagamentos'
      });

      OrdemDeServico.hasMany(models.Entrega, {
        foreignKey: 'id_ordem_servico',
        as: 'Entregas'
      });

      OrdemDeServico.hasMany(models.Vistoria, {
        foreignKey: 'id_reserva',
        as: 'Vistorias'
      });
    }
  }

  OrdemDeServico.init({
    id_usuario: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Usuarios',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM(
        'pendente',
        'aprovada',
        'cancelada',
        'aguardando_assinatura',
        'em_andamento',
        'entregue',
        'devolvida',
        'finalizada',
        'aguardando_pagamento_final'
      ),
      allowNull: false,
      defaultValue: 'pendente' 
    },
    data_criacao: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: false
    },
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tipo_entrega: {
      type: DataTypes.ENUM('retirada', 'entrega'),
      allowNull: false,
    },
    endereco_entrega: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    custo_frete: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    valor_sinal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'OrdemDeServico',
    tableName: 'OrdensDeServico'
  });
  return OrdemDeServico;
};

