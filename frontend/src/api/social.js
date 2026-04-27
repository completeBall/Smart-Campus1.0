import request from './request'

// 用户搜索
export function searchUsers(keyword) {
  return request.get('/social/search-users', { params: { keyword } })
}

// 公开主页
export function getUserProfile(id) {
  return request.get(`/social/users/${id}/profile`)
}

// 好友申请
export function sendFriendRequest(toUserId) {
  return request.post('/social/friend-requests', { to_user_id: toUserId })
}

export function getReceivedFriendRequests() {
  return request.get('/social/friend-requests')
}

export function respondFriendRequest(id, status) {
  return request.put(`/social/friend-requests/${id}`, { status })
}

// 好友列表
export function getFriends() {
  return request.get('/social/friends')
}

export function deleteFriendship(friendId) {
  return request.delete(`/social/friendships/${friendId}`)
}

// 聊天
export function getUserChat(peerId, afterId = 0) {
  return request.get(`/social/chats/user/${peerId}`, { params: { after_id: afterId } })
}

export function getGroupChat(groupId, afterId = 0) {
  return request.get(`/social/chats/group/${groupId}`, { params: { after_id: afterId } })
}

export function sendMessage(targetType, targetId, content) {
  return request.post('/social/messages', {
    target_type: targetType,
    target_id: targetId,
    content
  })
}

// 群聊
export function createGroup(name, memberIds) {
  return request.post('/social/groups', { name, member_ids: memberIds })
}

export function getMyGroups() {
  return request.get('/social/groups')
}

export function getGroupDetail(id) {
  return request.get(`/social/groups/${id}`)
}

export function inviteGroupMembers(groupId, userIds) {
  return request.post(`/social/groups/${groupId}/members`, { user_ids: userIds })
}

export function removeGroupMember(groupId, userId) {
  return request.delete(`/social/groups/${groupId}/members/${userId}`)
}

// 24小时状态
export function getMyStatus() {
  return request.get('/social/me/status')
}

export function setMyStatus(emoji, text) {
  return request.post('/social/me/status', { emoji, text })
}

export function clearMyStatus() {
  return request.delete('/social/me/status')
}

// 未读 / 已读
export function getUnreadSummary() {
  return request.get('/social/unread-summary')
}

export function markChatRead(targetType, targetId, lastMsgId) {
  return request.post('/social/chat-reads', {
    target_type: targetType,
    target_id: targetId,
    last_msg_id: lastMsgId
  })
}
