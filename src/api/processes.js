// @/api/processes.js
import request from '@/utils/request'

// 工艺列表信息查询
export function getProcessList(){
    return request.get('/processes')
}

// 根据id删除工艺
export function deleteProcessById(id){
    return request.delete('/processes', {
        params: {
            id: id
        }
    })
}

// 添加工艺
export function addProcess(process){ 
    return request.post('/processes', process)
}

// 修改工艺
export function updateProcess(process){ 
    return request.put('/processes', process)
}