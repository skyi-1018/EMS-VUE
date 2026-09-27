// @/api/customers.js
import request from '@/utils/request'

//获取客户列表
export function getCustomerList(customerName){
    return request.get('/customers', { 
        params: {
            customerName: customerName
        } 
    })
}

// 根据id删除客户
export function deleteCustomerById(id){ 
    return request.delete('/customers', {
        params: {
            customerId: id
        }
    })
}

// 添加客户
export function addCustomer(customer){ 
    return request.post('/customers', customer)
}

// 修改客户
export function updateCustomer(customer){ 
    return request.put('/customers', customer)
}

// 获取所有客户所有工艺假单价
export function getCustomerFakeUnitPriceMap(){
    return request.get('/customers/get-fake-unit-price-map')
}

// 获取客户基本信息
export function getCustomerSimpleList(){
    return request.get('/customers/simple-list')
}