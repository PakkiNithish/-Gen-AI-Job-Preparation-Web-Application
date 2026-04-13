import axios from "axios"

const api = axios.create({
    baseURL: 'https://gen-ai-job-preparation-web-application-1.onrender.com',
    withCredentials: true
})

export async function register({username, email, password}) {
    try{
        const resp = await api.post('/api/auth/register',{
            username, email, password
        })
        return resp.data
    }catch(err){
        throw err;
    }
}

export async function login({email,password}){
    try {
        const resp = await api.post('/api/auth/login',{
            email,password
        })
        return resp.data
    } catch (error) {
        throw error;
    }
}

export async function logout(){
    try {
        const resp = await api.get('/api/auth/logout')
        return resp.data
    } catch (err) {
        throw err;
    }
}

export async function getMe() {
    try {
        const resp = await api.get('/api/auth/get-me')
        return resp.data
    } catch (err) {
        if (err.response?.status === 401) {
            return null   // ← ignore unauthorized
        }
        throw err
    }
}