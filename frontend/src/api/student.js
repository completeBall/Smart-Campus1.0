import request from './request'

export const getStudentStatistics = () => request.get('/student/statistics')
export const getStudentTasks = () => request.get('/student/tasks')
export const submitHomework = (id, data) => request.post(`/student/tasks/${id}/submit`, data)
export const getStudentSchedule = () => request.get('/student/schedule')
export const getStudentGrades = () => request.get('/student/grades')
export const getPosts = (params) => request.get('/student/forum/posts', { params })
export const getPostDetail = (id) => request.get(`/student/forum/posts/${id}`)
export const createPost = (data) => request.post('/student/forum/posts', data)
export const replyPost = (id, data) => request.post(`/student/forum/posts/${id}/reply`, data)
export const togglePostLike = (id) => request.post(`/student/forum/posts/${id}/like`)
export const getHotPosts = () => request.get('/student/forum/hot')
export const uploadForumImages = (formData) => request.post('/upload/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const uploadForumFile = (formData) => request.post('/upload/file', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const getJobs = (params) => request.get('/student/jobs', { params })
export const getJobDetail = (id) => request.get(`/student/jobs/${id}`)
export const getAttendance = () => request.get('/student/attendance')
export const getActiveAttendanceSession = () => request.get('/student/attendance-sessions/active')
export const checkInAttendanceSession = (id) => request.post(`/student/attendance-sessions/${id}/check-in`)
export const submitFeedback = (data) => request.post('/student/feedback', data)
export const getMyFeedback = () => request.get('/student/feedback')
export const getStudentNotices = () => request.get('/student/notices')

// 请假
export const applyLeave = (data) => request.post('/student/leave', data)
export const getMyLeave = () => request.get('/student/leave')

// 综测
export const getMyAssessment = () => request.get('/student/assessment')
export const getAssessmentRank = (params) => request.get('/student/assessment/rank', { params })

// 活动
export const getActivities = (params) => request.get('/student/activities', { params })
export const getActivityDetail = (id) => request.get(`/student/activities/${id}`)
export const applyActivity = (id) => request.post(`/student/activities/${id}/apply`)
export const getMyActivities = () => request.get('/student/activities/my')
export const createActivity = (data) => request.post('/student/activities', data)
export const getOrganizedActivities = () => request.get('/student/activities/organized')
export const getOrganizedParticipants = (id) => request.get(`/student/activities/${id}/participants`)
export const reviewOrganizedParticipant = (activityId, participantId, data) => request.put(`/student/activities/${activityId}/participants/${participantId}`, data)

// 加分名单
export const getActivityScoreRecords = (id) => request.get(`/student/activities/${id}/score-records`)
export const submitScoreList = (id, data) => request.post(`/student/activities/${id}/score-submission`, data)
export const getMyScoreRecords = () => request.get('/student/score-records')

// 同学
export const getClassmates = () => request.get('/student/classmates')

// 学院专业
export const getColleges = () => request.get('/student/colleges')

// 每日背单词
export const getDailyWords = () => request.get('/student/daily-words')
export const submitDailyWords = (data) => request.post('/student/daily-words/submit', data)
export const getTodayWordRecord = () => request.get('/student/daily-words/today')

// 小游戏
export const playGame = (data) => request.post('/student/games/play', data)
export const getTodayGames = () => request.get('/student/games/today')
export const getGameLeaderboard = () => request.get('/student/games/leaderboard')
export const getMyGameRank = () => request.get('/student/games/my-rank')
