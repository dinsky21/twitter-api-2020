'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Followship extends Model {
    static associate (models) {
      Followship.belongsTo(models.User, { as: 'Follower', foreignKey: 'followerId' })
      Followship.belongsTo(models.User, { as: 'Following', foreignKey: 'followingId' })
    }
  }
  Followship.init({
    followingId: DataTypes.INTEGER,
    followerId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Followship',
    tableName: 'followships',
    underscored: true
  })
  return Followship
}
