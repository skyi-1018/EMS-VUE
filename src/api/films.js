// @/api/films.js
import request from '@/utils/request'

// 膜查询
export function getFilmList() {
    return request.get('/films')
}

// 膜添加
export function addFilm(film) {
    return request.post('/films', film)
}

// 膜修改
export function updateFilm(film) {
    return request.put('/films', film)
}

// 根据id删除膜
export function deleteFilmById(id) {
    return request.delete(`/films/${id}`)
}

// 膜进料条件分页查询
export function getFilmInList(param) {
    return request.post('/film-ins/list', param)
}

// 膜进料批量添加
export function batchAddFilmIn(list) {
    return request.post('/film-ins/batch-add', list)
}

// 膜进料修改
export function updateFilmIn(filmIn) {
    return request.put('/film-ins', filmIn)
}

// 根据id删除膜进料
export function deleteFilmIdById(id) {
    return request.delete(`/film-ins/${id}`)
}