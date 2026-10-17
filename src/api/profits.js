// @/api/profits.js
import request from '@/utils/request'

export function getProfitList(param) {
    return request.post('/profits/list', param)
}

export function deleteProfitById(id) {
    return request.delete(`/profits/${id}`)
}

export function calcProfit(month) {
    return request.get('/profits/calc', {
        params: {
            month: month
        }
    })
}