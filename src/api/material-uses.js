// @/api/material-uses.js
import request from '@/utils/request'

// 条件分页列表查询
export function getMaterialUseList(param) {
    return request.post('/material-uses/list', param)
}

// 单条添加用料
export function addMaterialUse(materialUse) {
    return request.post('/material-uses', materialUse)
}

// 修改用料
export function updateMaterialUse(materialUse) {
    return request.put('/material-uses', materialUse)
}

// 删除用料
export function deleteMaterialUseById(id) {
    return request.delete(`/material-uses/${id}`)
}

// 根据月份计算用料 
export function calcMaterialUseByMonth(month) {
    return request.get('/material-uses/calc', {
        params: {
            month: month
        }
    })
}