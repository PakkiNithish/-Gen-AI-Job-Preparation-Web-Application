import axios from "axios"

const api = axios.create({
    baseURL: 'http://localhost:3200',
    withCredentials: true
})

export async function register({ username, email, password }) {
    try {
        const resp = await api.post('/api/auth/register', { username, email, password })
        return resp.data
    } catch (err) {
        throw err
    }
}

export async function login({ email, password }) {
    try {
        const resp = await api.post('/api/auth/login', { email, password })
        return resp.data
    } catch (err) {
        throw err
    }
}

export async function logout() {
    try {
        const resp = await api.get('/api/auth/logout')
        return resp.data
    } catch (err) {
        throw err
    }
}

export async function getMe() {
    try {
        const resp = await api.get('/api/auth/get-me')
        return resp.data
    } catch (err) {
        throw err
    }
}

// ✅ Fix 5: this function was missing entirely from interview.api.js
export async function generateInterviewReport({ jobDescription, selfDescription, resumeFile }) {
    try {
        const formData = new FormData()
        formData.append('jobDescription', jobDescription)
        formData.append('selfDescription', selfDescription)
        if (resumeFile) {
            formData.append('resume', resumeFile)  // must match multer field name on backend
        }

        const resp = await api.post('/api/interview/generate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return resp.data
    } catch (err) {
        throw err
    }
}

export async function getInterviewReportById(id) {
    try {
        const resp = await api.get(`/api/interview/${id}`)
        return resp.data
    } catch (err) {
        throw err
    }
}

export async function getAllInterviewReports() {
    try {
        const resp = await api.get('/api/interview')
        return resp.data
    } catch (err) {
        throw err
    }
}

export const generateResumePdf = async (interviewReportId) => {
    try {
        const resp = await api.get(
            `/api/interview/resume/pdf/${interviewReportId}`,
            {
                responseType: 'blob'
            }
        )
        return resp.data
    } catch (err) {
        throw err
    }
}