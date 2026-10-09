// @/api/materials.js
import request from '@/utils/request'

// 列表查询
export function getMaterialList(name) {
    return request.get('/materials', {
        params: {
            name: name
        }
    })
}

// 新增材料
export function addMaterial(material) {
    return request.post('/materials', material)
}

// 修改材料
export function updateMaterial(material) {
    return request.put('/materials', material)
}

// 根据id删除材料
export function deleteMaterialById(id) {
    return request.delete(`/materials/${id}`)
}