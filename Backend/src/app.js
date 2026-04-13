const express = require('express')
const app = express();
const cookieParser = require('cookie-parser')
const cors = require('cors')

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://gen-ai-job-preparation-web-application-vjiy.onrender.com"
    ],
    credentials: true
}));

app.use(express.json())
app.use(cookieParser())

/* require all routes here */
const authRouter = require('./routes/auth.routes')
const aiRouter = require('./routes/ai.routes')
const interviewRouter = require('./routes/interview.routes')

/* Using all routes here */
app.use('/api/auth', authRouter)
app.use('/api/ai', aiRouter)
app.use('/api/interview', interviewRouter)

module.exports = app