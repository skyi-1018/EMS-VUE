// @/api/expenditures.js
import request from '@/utils/request'

export function getExpenditureList(param) {
    return request.post('/expenditures/list', param)
}

export function addExpenditure(expenditure) {
    return request.post('/expenditures', expenditure)
}

export function updateExpenditure(expenditure) {
    return request.put('/expenditures', expenditure)
}

export function deleteExpenditureById(id) {
    return request.delete(`/expenditures/${id}`)
}

export function calcExpenditure(month) {
    return request.get('/expenditures/calc', {
        params: {
            month: month
        }
    })
}