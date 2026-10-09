// @/api/material-ins.js
import request from '@/utils/request'

// 条件分页列表查询
export function getMaterialInList(param) {
    return request.post('/material-ins/list', param)
}

// 新增普通材料进料
export function batchAddMaterialIn(materialIn) {
    return request.post('/material-ins/batch-add', materialIn)
}

// 修改普通材料进料
export function updateMaterialIn(materialIn) {
    return request.put('/material-ins', materialIn)
}

// 删除普通材料进料
export function deleteMaterialInById(id) {
    return request.delete(`/material-ins/${id}`)
}