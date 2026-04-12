const express = require('express')
const app = express();
const cookieParser = require('cookie-parser')
const cors = require('cors')

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin:'http://localhost:5173',
    credentials: true
}))

/* require all routes here */
const authRouter = require('./routes/auth.routes')
const aiRouter = require('./routes/ai.routes')
const interviewRouter = require('./routes/interview.routes')

/* Using all routes here */
app.use('/api/auth',authRouter)
app.use('/api/ai', aiRouter)
app.use('/api/interview',interviewRouter)

/**
 * @route GET /api/auth/register
 * @desctiption Register a new user
 * @access Public
 */

module.exports = app