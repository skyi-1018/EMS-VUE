// @/api/operation-log.js
import request from '@/utils/request'

// 获取操作日志列表
export function getLogList(params) {
    return request.post('/logs/list', params)
}