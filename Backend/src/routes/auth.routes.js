const {Router} = require('express')

const authMuiddleware = require('../middlewares/auth.middleware')
const authController = require('../controllers/auth.controller')
const authRouter = Router()

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post('/register',authController.registerUserController)

/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
authRouter.post('/login',authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and token in the blacklist
 * @access Public
 */
authRouter.get('/logout',authController.logutUserController)

/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access Private
 */
authRouter.get('/get-me',authMuiddleware.authUser,authController.getMeController)

module.exports = authRouter