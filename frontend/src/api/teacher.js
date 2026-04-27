import request from './request'

export const getTeacherStatistics = () => request.get('/teacher/statistics')
export const getClasses = () => request.get('/teacher/classes')
export const getTasks = () => request.get('/teacher/tasks')
export const createTask = (data) => request.post('/teacher/tasks', data)
export const deleteTask = (id) => request.delete(`/teacher/tasks/${id}`)
export const getSubmissions = (params) => request.get('/teacher/submissions', { params })
export const reviewSubmission = (id, data) => request.put(`/teacher/submissions/${id}`, data)
export const getTeacherSchedule = () => request.get('/teacher/schedule')
export const addSchedule = (data) => request.post('/teacher/schedule', data)
export const updateSchedule = (id, data) => request.put(`/teacher/schedule/${id}`, data)
export const deleteSchedule = (id) => request.delete(`/teacher/schedule/${id}`)
export const getTeacherGrades = (params) => request.get('/teacher/grades', { params })
export const addGrade = (data) => request.post('/teacher/grades', data)
export const updateGrade = (id, data) => request.put(`/teacher/grades/${id}`, data)

// 审批管理
export const getLeaveRequests = (params) => request.get('/teacher/leave', { params })
export const reviewLeave = (id, data) => request.put(`/teacher/leave/${id}`, data)
export const getPendingActivities = (params) => request.get('/teacher/activities', { params })
export const reviewActivity = (id, data) => request.put(`/teacher/activities/${id}`, data)
export const getActivityParticipants = (id) => request.get(`/teacher/activities/${id}/participants`)
export const reviewParticipant = (activityId, participantId, data) => request.put(`/teacher/activities/${activityId}/participants/${participantId}`, data)

// 加分名单审核
export const getScoreRecords = (params) => request.get('/teacher/score-records', { params })
export const reviewScoreRecord = (id, data) => request.put(`/teacher/score-records/${id}`, data)

// 学生管理
export const getStudents = (params) => request.get('/teacher/students', { params })

// 课堂签到
export const createAttendanceSession = (data) => request.post('/teacher/attendance-sessions', data)
export const getAttendanceSessions = (params) => request.get('/teacher/attendance-sessions', { params })
export const getSessionRecords = (id) => request.get(`/teacher/attendance-sessions/${id}/records`)
export const closeAttendanceSession = (id) => request.put(`/teacher/attendance-sessions/${id}/close`)
