// @/api/orders.js
import request from '@/utils/request'

// 获取订单列表
export function getOrderList(orderListParam) { 
    return request.post('/orders/list', orderListParam)
}

// 添加订单
export function addOrder(order) { 
    return request.post('/orders', order)
}

// 修改订单
export function updateOrder(order) { 
    return request.put('/orders', order)
}

// 根据id删除订单
export function deleteOrderById(id) { 
    return request.delete('/orders', {
        params: {
            id: id
        }
    })
}

// Excel 导出
export function exportExcel(exportForm) { 
    return request.get('/orders/export', {
        params: {
            mode: exportForm.mode,
            month: exportForm.month,
            customerId: exportForm.customerId
        },
        responseType: 'blob'
    })
}

// 产品名称联想品名、规格1、规格2，前提是有customerId，processId与productName关键词
export function orderSuggest(order){
    return request.post('/orders/suggest', order)
}

// AB面提交
export function addABModeOrder(ABModeOrder) {
    return request.post('/orders/ABMode-add', ABModeOrder)
}

// AB面提交并打印
export function submitAndPrintABModeOrder(ABModeOrder) { 
    return request.post('/orders/ABMode-submit-and-print', ABModeOrder)
}

// 普通的提交并打印
export function submitAndPrintOrder(order) { 
    return request.post('/orders/submit-and-print', order)
}

// 回收站订单列表查询
export function getDeletedOrderList() { 
    return request.get('/orders/list-deleted-orders')
}

// 恢复订单
export function restoreByIds(ids) { 
    return request.get('/orders/restore-by-ids', {
        params: {
            ids: ids
        }
    })
}