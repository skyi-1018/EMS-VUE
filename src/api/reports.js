// @/api/reports.js
import request from '@/utils/request'

/* 
数据res.data返回格式
[
  ['product', '分类1', '分类2', '分类3', ...],
  ['X轴1', '分类1值', '分类2值', '分类3值', ...],
  ['X轴2', '分类1值', '分类2值', '分类3值', ...],
  ...
]
*/

// 获取总产值数据
export function getTotalSales(params){
    return request.get('/reports/total-sales', {
        params: {
            mode: params.mode,
            date: params.date
        }
    })
}

// 获取客户产值数据
export function getCustomersTotalSales(params){ 
    return request.get('/reports/customers-total-sales', {
        params: {
            mode: params.mode,
            date: params.date
        }
    })
}

// 获取工艺产量数据
export function getProcessesTotalProduction(params){ 
    return request.get('/reports/processes-total-production', {
        params: {
            mode: params.mode,
            date: params.date
        }
    })
}

// 获取客户总产值数据
export function getCustomersTotalProductValue(params){
    return request.get('/reports/customers-total-product-value', {
        params: {
            mode: params.mode,
            date: params.date
        }
    })
}

// 获取首页数据Map
export function getStatMap(){
    return request.get('/reports/get-stat-map')
}