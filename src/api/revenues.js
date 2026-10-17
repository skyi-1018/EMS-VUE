// @/api/revenues.js
import request from '@/utils/request'

export function getRevenueList(param) {
    return request.post('/revenues/list', param)
}

export function addRevenue(revenue) {
    return request.post('/revenues', revenue)
}

export function updateRevenue(revenue) {
    return request.put('/revenues', revenue)
}

export function deleteRevenueById(id) {
    return request.delete(`/revenues/${id}`)
}

export function calcRevenue(month) {
    return request.get('/revenues/calc', {
        params: {
            month: month
        }
    })
}