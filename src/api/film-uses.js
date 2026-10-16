// @/api/film-uses.js
import request from '@/utils/request'

// 条件分页列表查询
export function getFilmUseList(param) {
    return request.post('/film-uses/list', param)
}

// 单条添加用料
export function addFilmUse(filmUse) {
    return request.post('/film-uses', filmUse)
}

// 修改用料
export function updateFilmUse(filmUse) {
    return request.put('/film-uses', filmUse)
}

// 删除用料
export function deleteFilmUseById(id) {
    return request.delete(`/film-uses/${id}`)
}

// 根据月份计算用料 
export function calcFilmUseByMonth(month) {
    return request.get('/film-uses/calc', {
        params: {
            month: month
        }
    })
}