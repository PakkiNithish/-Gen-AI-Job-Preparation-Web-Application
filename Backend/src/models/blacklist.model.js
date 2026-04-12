const mongoose = require('mongoose')

const blacklistTokenSchema = new mongoose.Schema({
    token :{
        type : String,
        required:[true, "Token is required to add in blacklist"]
    }
},{
    timestamps: true
})

const tokenBlacklistModel = mongoose.model("blacklisttokens",blacklistTokenSchema)

module.exports = tokenBlacklistModel