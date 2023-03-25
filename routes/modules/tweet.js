const express = require('express')
const router = express.Router()
const tweetController = require('../../controllers/tweet-controller')
const likeController = require('../../controllers/like-controller')

router.post('/:id/unlike', likeController.unlikeTweet)
router.post('/:id/like', likeController.likeTweet)
router.get('/:id', tweetController.getTweet)
router.post('/', tweetController.postTweet)
router.get('/', tweetController.getTweets)

module.exports = router
