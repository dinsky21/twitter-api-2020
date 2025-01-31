const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const admin = require('./modules/admin')
const user = require('./modules/user')
const tweet = require('./modules/tweet')
const followship = require('./modules/followship.js')
const adminController = require('../controllers/admin-controller')
const userController = require('../controllers/user-controller')
const { authenticated, authenticatedAdmin, authenticatedUser } = require('../middleware/auth')
const { apiErrorHandler } = require('../middleware/error-handler')
const { userLogin, adminLogin } = require('../middleware/role-check')

router.post('/admin/signin', adminLogin, passport.authenticate('local', { session: false }), authenticatedAdmin, adminController.signIn)
router.use('/admin', authenticated, authenticatedAdmin, admin)
router.post('/users/signin', userLogin, passport.authenticate('local', { session: false }), authenticatedUser, userController.postSignIn)
router.post('/users', userController.postSignUp)
router.use('/users', authenticated, authenticatedUser, user)
router.use('/tweets', authenticated, authenticatedUser, tweet)
router.use('/followships', authenticated, authenticatedUser, followship)
router.use(apiErrorHandler)
module.exports = router
