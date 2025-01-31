const jwt = require('jsonwebtoken')
const helpers = require('../_helpers')
const db = require('../models')
const { User, sequelize, Tweet, Reply, Like, Followship } = db
const bcrypt = require('bcryptjs')
const { imgurFileHandler } = require('../helpers/file-helpers')
const { Op } = require('sequelize')

const userServices = {
  postSignIn: (req, cb) => {
    const userData = helpers.getUser(req).toJSON()
    delete userData.password
    try {
      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
      return cb(null, {
        status: 'success',
        message: '成功登入',
        data: {
          token,
          userData
        }
      })
    } catch (err) {
      cb(err)
    }
  },
  getTopUsers: (req, next, cb) => {
    const { id } = helpers.getUser(req)
    try {
      User.findAll({
        where: {
          role: 'user',
          id: {
            [Op.not]: id
          }
        },
        attributes: {
          include: [
            [
              sequelize.literal('(SELECT COUNT(*)FROM Tweets WHERE User_id = User.id)'), 'TweetsCounts'
            ],
            [
              sequelize.literal('(SELECT COUNT(*)FROM Followships AS Followers WHERE following_id = User.id)'), 'followerCounts'
            ],
            [
              sequelize.literal('(SELECT COUNT(*)FROM Followships AS Followings WHERE follower_id = User.id)'), 'followingCounts'
            ],
            [
              sequelize.literal('(SELECT COUNT(*)FROM Likes INNER JOIN Tweets ON Tweets.id = Likes.tweet_id WHERE Tweets.User_id = User.id)'), 'LikedCounts'
            ]
          ],
          exclude: [
            'introduction',
            'password',
            'updatedAt',
            'createdAt'
          ]
        },
        order: [
          [sequelize.literal('followerCounts'), 'DESC']
        ]
      })
        .then(users => cb(null, {
          status: 'success',
          data: {
            usersData: [...users]
          }
        }))
    } catch (err) {
      next(err)
    }
  },
  postSignUp: (req, cb) => {
    const { account, name, email, password, checkPassword } = req.body
    if (!account || !email || !password || !checkPassword) throw new Error('請填寫必填欄位')
    if (password !== checkPassword) throw new Error('密碼與確認密碼不相符')
    User.findOne({
      where: {
        [Op.or]: [{ account: account }, { email: email }]
      }
    })
      .then(user => {
        if (user !== null) {
          if (user.email === email) throw new Error('email 已重複註冊！')
          if (user.account === account) throw new Error('account 已重複註冊！')
        }
        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
        return User.create({
          account,
          name,
          email,
          password: hashedPassword,
          role: 'user',
          avatar: 'https://i.imgur.com/wHEDOtN.png',
          cover: 'https://i.imgur.com/2dr5z4M.png'

        })
          .then(user => {
            const userData = user.toJSON()
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
            delete userData.password
            return cb(null, {
              status: 'success',
              message: '建立帳號成功！',
              data: {
                token,
                userData
              }
            })
          })
      })
      .catch(err => cb(err))
  },
  getUserFailed: (req, cb) => {
    const { id } = req.params
    User.findAll({
      where: {
        id: id,
        role: 'user'
      }
    }, {
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*)FROM Tweets WHERE User_id = User.id)'), 'TweetsCounts'
          ],
          [
            sequelize.literal('(SELECT COUNT(*)FROM Followships AS Followers WHERE following_id = User.id)'), 'followerCounts'
          ],
          [
            sequelize.literal('(SELECT COUNT(*)FROM Followships AS Followings WHERE follower_id = User.id)'), 'followingCounts'
          ],
          [
            sequelize.literal('(SELECT COUNT(*)FROM Likes INNER JOIN Tweets ON Tweets.id = Likes.tweet_id WHERE Tweets.User_id = User.id)'), 'LikedCounts'
          ]
        ],
        exclude: [
          'password',
          'updatedAt',
          'createdAt'
        ]
      },
      raw: true
    })
      .then(user => {
        cb(null, user[0])
      })
      .catch(err => cb(err))
  },
  getUserTweets: async (req, cb) => {
    const UserId = req.params.id
    if (!UserId) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    const user = await User.findByPk(UserId)
    if (!user) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    await Tweet.findAll({
      where: { UserId: req.params.id },
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*)FROM Likes WHERE Tweet_id = Tweet.id )'), 'LikedCounts'
          ],
          [
            sequelize.literal('(SELECT COUNT(*)FROM Replies WHERE Tweet_id = Tweet.id )'), 'RepliesCounts'
          ]
        ]
      },
      include: [{ model: User, attributes: ['id', 'account', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']]
    })
      .then(tweets => {
        // tweets = tweets.map(tweet => { return tweet })
        return cb(null, [...tweets])
      })
      .catch(err => cb(err))
  },
  getUserRepliedTweets: async (req, cb) => {
    const UserId = req.params.id
    if (!UserId) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    const user = await User.findByPk(UserId)
    if (!user) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    await Reply.findAll({
      where: { UserId },
      include: [
        {
          model: Tweet,
          attributes: [
            'id',
            'description',
            'createdAt',
            'UserId' // 關聯 User 資料
          ],
          include: [
            {
              model: User,
              attributes: ['id', 'account', 'name']
            }
          ]
        }
      ],
      order: [['createdAt', 'desc']]
    }).then(replies => {
      return cb(null, [...replies])
    })
      .catch(err => cb(err))
  },
  getUserLikedTweets: async (req, cb) => {
    const UserId = req.params.id
    if (!UserId) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    const user = await User.findByPk(UserId)
    if (!user) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))
    await Like.findAll({
      where: { UserId: req.params.id },
      include: [
        {
          model: Tweet,
          attributes: {
            include: [
              [
                sequelize.literal('(SELECT COUNT(*)FROM Likes WHERE Tweet_id = Tweet.id )'), 'LikedCounts'
              ],
              [
                sequelize.literal('(SELECT COUNT(*)FROM Replies WHERE Tweet_id = Tweet.id )'), 'RepliesCounts'
              ]
            ]
          },
          include: [
            { model: User, attributes: ['id', 'account', 'name', 'avatar'] }
          ]
        }
      ],
      order: [['createdAt', 'desc']]
    }).then(replies => {
      return cb(null, [...replies])
    })
      .catch(err => cb(err))
  },
  getUserFollowings: async (req, cb) => {
    const UserId = req.params.id
    const currentUserId = helpers.getUser(req)?.id
    if (!UserId) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    const user = await User.findByPk(UserId)
    if (!user) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))
    await Followship.findAll({
      where: { followerId: req.params.id },
      include: [
        { model: User, as: 'Following', attributes: ['id', 'account', 'name', 'avatar', 'introduction'] }
      ],
      order: [['createdAt', 'DESC']]
    }).then(followings => {
      const followingsWithIsFollowedByCurrentUser = followings.map(following => {
        const followingData = following.toJSON()
        if (followingData.followerId === currentUserId) {
          followingData.isFollowed = true
        } else {
          followingData.isFollowed = false
        }
        return followingData
      })
      return cb(null, followingsWithIsFollowedByCurrentUser)
    }).catch(err => cb(err))
  },
  getUserFollowers: async (req, cb) => {
    const UserId = req.params.id
    const currentUserId = helpers.getUser(req)?.id
    if (!UserId) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))

    const user = await User.findByPk(UserId)
    if (!user) return cb(Object.assign(new Error('找不到使用者'), { status: 404 }))
    await Followship.findAll({
      where: { followingId: req.params.id },
      include: [
        { model: User, as: 'Follower', attributes: ['id', 'account', 'name', 'avatar', 'introduction'] }
      ],
      order: [['createdAt', 'DESC']]
    }).then(followers => {
      const followersWithIsFollowedByCurrentUser = followers.map(follower => {
        const followerData = follower.toJSON()
        if (followerData.followerId === currentUserId) {
          followerData.isFollowed = true
        } else {
          followerData.isFollowed = false
        }
        return followerData
      })
      return cb(null, followersWithIsFollowedByCurrentUser)
    })
      .catch(err => cb(err))
  },
  putUserSetting: (req, cb) => {
    const id = Number(req.params.id)
    const currentUserId = helpers.getUser(req).id
    const { name, account, email, introduction, password } = req.body
    let hashedPassword = ''
    if (password) { hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10), null) }
    if (id !== currentUserId) throw new Error('您沒有權限編輯此使用者資料')
    return User.findOne({
      where: {
        [Op.or]: [{ account: { [Op.or]: { [Op.is]: null, [Op.eq]: account } } }]
      }
    })
      .then(user => {
        const findUser = User.findOne({
          where: {
            [Op.or]: [{ email: { [Op.or]: { [Op.is]: null, [Op.eq]: email } } }]
          }
        })
        if (user === null) return findUser
        if (user.account !== null && user.id !== currentUserId) throw new Error('account 已重複註冊！')
        return findUser
      })
      .then(user => {
        if (user === null) return User.findByPk(currentUserId)
        if (user.email !== null && user.id !== currentUserId) throw new Error('email 已重複註冊！')
        return User.findByPk(currentUserId)
      })
      .then(user => {
        user.name = name
        user.account = account
        user.email = email
        user.introduction = introduction
        if (password) { user.password = hashedPassword }
        return user.save()
      }
      )
      .then(user => {
        const userData = user.toJSON()
        delete userData.password
        const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
        return cb(null, { token, userData })
      })
      .catch(err => cb(err))
  },
  putUserProfile: (req, cb) => {
    const id = Number(req.params.id)
    const currentUserId = helpers.getUser(req).id
    const { name, introduction } = req.body
    const files = req.files
    if (id !== currentUserId) throw new Error('您沒有權限編輯此使用者資料')
    return Promise.all([User.findByPk(currentUserId), imgurFileHandler(files.avatar), imgurFileHandler(files.cover)])
      .then(([user, avatarFile, coverFile]) => {
        user.update({
          name,
          introduction,
          avatar: avatarFile || user.avatar,
          cover: coverFile || user.cover
        })
          .then(user => {
            const userData = user.toJSON()
            delete userData.password
            const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '30d' })
            return cb(null, { token, userData })
          })
          .catch(err => cb(err))
      })
  }

}
module.exports = userServices
