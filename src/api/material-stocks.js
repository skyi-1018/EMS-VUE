// @/api/material-stocks.js
import request from '@/utils/request'

// 条件分页列表查询
export function getMaterialStockList(param) {
    return request.post('/material-stocks/list', param)
}

// 批量新增普通材料月初库存
export function batchAddMaterialStock(materialStock) {
    return request.post('/material-stocks/batch-add', materialStock)
}

// 修改普通材料月初库存
export function updateMaterialStock(materialStock) {
    return request.put('/material-stocks', materialStock)
}

// 删除普通材料月初库存
export function deleteMaterialStockById(id) {
    return request.delete(`/material-stocks/${id}`)
}