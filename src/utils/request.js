// @/utils/request.js
import axios from 'axios'
import router from '@/router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const request = axios.create({
    baseURL: '/api',
    timeout: 20000,
    withCredentials: true
})

// 请求拦截器，自动携带token
request.interceptors.request.use(
    (config) => {
        const userStore = useUserStore()
        if (userStore.token) {
            config.headers.Authorization = `Bearer ${userStore.token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// 响应拦截器，处理401
request.interceptors.response.use(
    (response) => {
        if (response.config.responseType === 'blob') {
            return response
        }
        const res = response.data
        if (res.code == 0) {
            ElMessage.error(res.msg || '请求失败')
            return Promise.reject(new Error(res.msg))
        }
        return res
    },
    (error) => {
        const status = error.response.status
        if (status === 401) {
            const userStore = useUserStore()
            userStore.resetAuth()
            ElMessage.error('登录已过期，请重新登录')
            router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
        }else if (status === 403) {
            ElMessage.error('没有权限执行该操作')
        } else {
            ElMessage.error(error.response?.data?.msg || '网络异常，请稍后重试')
        }
        return Promise.reject(error)
    } 
)

export default request