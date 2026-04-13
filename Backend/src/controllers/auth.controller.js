const tokenBlacklistModel = require('../models/blacklist.model')
const userModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

/**
 * @name registerUserController
 * @description register a new user expects username, email and password
 * @access Public
*/

async function registerUserController(req, resp) {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
        return resp.status(400).json({ message: "Please provide username,email and password" })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserAlreadyExists) {
        /* isUserAlreadyExists.username = username */
        return resp.status(400).json({ message: "User already exists" })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await userModel.create({
        username,
        email,
        password: hash
    })
    const token = jwt.sign(
        {
            id: user._id,
            username: user.username
        }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    }
    )
    resp.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    resp.status(201).json({
        message: "user registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name loginUserController
 * @description login a user expects email and password
 * @access Public
 */

async function loginUserController(req, resp) {
    const { email, password } = req.body
    const user = await userModel.findOne({ email })
    if (!user) {
        return resp.status(400).json({
            message: "Invalid email"
        })
    }
    const isPassValid = await bcrypt.compare(password, user.password)
    if (!isPassValid) {
        return resp.status(400).json({
            message: "Invalid Password"
        })
    }
    const token = jwt.sign(
        {
            id: user._id,
            username: user.username
        }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    }
    )
    resp.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    resp.status(201).json({
        message: "user logged in successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add token in black-list
 */

async function logutUserController(req, resp) {
    const token = req.cookies.token
    if (token) {
        await tokenBlacklistModel.create({ token })
    }
    resp.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    resp.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details
 * @access Private
 */
async function getMeController(req, resp) {
    const user = await userModel.findById(req.user.id)
    resp.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            userName: user.username,
            email: user.email
        }
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    logutUserController,
    getMeController
}