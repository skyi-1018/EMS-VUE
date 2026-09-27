// @/api/prepare-orders.js
import request from '@/utils/request'

// 获取预备订单列表
export function getPrepareOrderList() { 
    return request.get('/prepare-orders')
}

// 根据ids删除预备订单
export function batchDeletePrepareOrder(ids) { 
    return request.delete('/prepare-orders', {
        params: {
            ids: ids
        }
    })
}

// 添加预备订单
export function addPrepareOrder(prepareOrder) { 
    return request.post('/prepare-orders', prepareOrder)
}

// 修改预备订单
export function updatePrepareOrder(prepareOrder) { 
    return request.put('/prepare-orders', prepareOrder)
}

// 提交预备订单至正式订单
export function submitPrepareOrder(order) { 
    return request.post('/prepare-orders/submit', order)
}

// AB面保存
export function addABModePrepareOrder(ABModePrepareOrder) {
    return request.post('/prepare-orders/ABMode-add', ABModePrepareOrder)
}

// 提交并打印预备订单
export function submitAndPrintPrepareOrder(order) { 
    return request.post('/prepare-orders/submit-and-print', order)
}
