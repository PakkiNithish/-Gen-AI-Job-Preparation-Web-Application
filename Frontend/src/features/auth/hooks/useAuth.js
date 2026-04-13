import { useContext, useEffect } from "react";
import { authContext } from "../auth.context";
import { login,register,logout,getMe} from '../services/auth.api'

export const useAuth = () => {
    const context = useContext(authContext)
    const {user,setUser,loading,setLoading} = context

    const handleLogin = async ({email,password}) => {
        setLoading(true)
        try{
            const data = await login({email,password})
            setUser(data.user)
            return true;
        }catch(err){
            const errMsg = err.response?.data?.message || err.message;
            alert(`Login failed: ${errMsg}`);
            console.error('Login error:', err)
            return false;
        }finally{
            setLoading(false)
        }
    }

    const handleRegister = async ({username,email,password}) => {
        setLoading(true);
        try{
            const data = await register({username,email,password})
            setUser(data.user)
            return true;
        }catch(err){
            const errMsg = err.response?.data?.message || err.message;
            alert(`Registration failed: ${errMsg}`);
            console.error('Register error:', err)
            return false;
        }finally{
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try{
            const data = await logout()
            setUser(null)
        }catch(err){
            console.error('Logout error:', err)
        }finally{
            setLoading(false)
        }
    }

    useEffect(() => {
    const getAndSetUser = async () => {
        try {
            const data = await getMe()
            if (!data) return
            setUser(data.user)
        } catch (err) {
            // ignore
        } finally {
            setLoading(false)
        }
    }

    getAndSetUser()
}, [])
    return { user, loading, handleRegister, handleLogin, handleLogout}
}