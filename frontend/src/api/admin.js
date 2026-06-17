import request from './request'

export const getStatistics = () => request.get('/admin/statistics')
export const getUsers = (params) => request.get('/admin/users', { params })
export const createUser = (data) => request.post('/admin/users', data)
export const updateUser = (id, data) => request.put(`/admin/users/${id}`, data)
export const deleteUser = (id) => request.delete(`/admin/users/${id}`)
export const resetPassword = (id) => request.post(`/admin/users/${id}/reset-password`)
export const getLogs = (params) => request.get('/admin/logs', { params })
export const getFeedbacks = (params) => request.get('/admin/feedbacks', { params })
export const replyFeedback = (id, data) => request.put(`/admin/feedbacks/${id}`, data)
export const getNotices = () => request.get('/admin/notices')
export const createNotice = (data) => request.post('/admin/notices', data)
export const deleteNotice = (id) => request.delete(`/admin/notices/${id}`)
export const getCollegesMajors = () => request.get('/admin/colleges-majors')
export const getAiSettings = () => request.get('/admin/ai-settings')
export const saveAiSettings = (data) => request.put('/admin/ai-settings', data)
export const testAiSettings = (data) => request.post('/admin/ai-settings/test', data, { timeout: 70000 })
export const getAdminYouthRegions = () => request.get('/admin/youth-creation/regions', { silent: true })
export const getAdminYouthPosts = (params) => request.get('/admin/youth-creation/posts', { params, silent: true })
export const approveYouthPost = (id) => request.put(`/admin/youth-creation/posts/${id}/approve`, null, { silent: true })
export const deleteYouthPost = (id) => request.delete(`/admin/youth-creation/posts/${id}`, { silent: true })

// 下载用户导入模板
export const downloadUserTemplate = () => {
  return request.get('/admin/users/template', { responseType: 'blob' })
}

// 批量导入用户
export const importUsers = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/admin/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
