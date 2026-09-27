// @/api/auths.js
import request from '@/utils/request'

// 登录
export function login(user) {
    return request.post('/auths/login', user)
}

// 获取当前用户信息
export function me() { 
    return request.get('/auths/me')
}

// 注册
export function register(user) { 
    return request.post('/auths/register', user)
}

// 获取用户列表
export function getUserList() { 
    return request.get('/auths/user-list')
}