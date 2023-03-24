'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    static associate(models) {
      Like.belongsTo(models.User, { foreignKey: 'UserId' })
      Like.belongsTo(models.Tweet, { as: 'likedTweet', foreignKey: 'TweetId' })
    }
  }
  Like.init({
    UserId: DataTypes.INTEGER,
    TweetId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Like',
    tableName: 'likes',
    underscored: true
  })
  return Like
}
