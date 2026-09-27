// @/api/update-log.js
import request from '@/utils/request'


// 获取更新日志Map
export function getUpdateLogList() { 
    return request.get('/update-logs')
}

// 批量添加更新日志
export function addUpdateLog(updateLog) { 
    return request.post('/update-logs', updateLog)
}