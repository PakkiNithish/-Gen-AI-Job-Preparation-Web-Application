const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        unique: [true,"user name already exists"],
        required: true,
    },
    email:{
        type: String,
        unique: [true,"Account exists with this email"],
        required: true,
    },
    password:{
        type: String,
        required: true
    }
})

const userModel = mongoose.model("users",userSchema)

module.exports = userModel