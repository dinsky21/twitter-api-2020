'use strict'
const { shuffledArray } = require('../helpers/math-helpers.js')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query("SELECT id FROM Users WHERE role = 'user';", { type: queryInterface.sequelize.QueryTypes.SELECT })
    const tweets = await queryInterface.sequelize.query('SELECT id FROM Tweets;', { type: queryInterface.sequelize.QueryTypes.SELECT })

    await queryInterface.bulkInsert('Likes', Array.from({ length: 250 }, (_, index) => ({
      created_at: new Date(),
      updated_at: new Date(),
      Tweet_id: shuffledArray(tweets)[index % 100].id,
      User_id: shuffledArray(users)[index % 20].id
    })))
  },
  // !這邊還沒有解決不能Like自己貼文的問題
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Likes', null, {})
  }
}
