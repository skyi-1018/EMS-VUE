// @/api/processes.js
import request from '@/utils/request'

// 打印订单
export function printOrder(ids, mode){ 
    return request.get('/prints', {
        params: {
            ids: ids,
            mode: mode
        }
    })
}