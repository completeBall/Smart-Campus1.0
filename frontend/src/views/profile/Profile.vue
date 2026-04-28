<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" v-loading="loading">
        <!-- 头像 -->
        <el-form-item label="头像">
          <div class="avatar-wrapper">
            <el-avatar :size="100" :src="form.avatar" class="profile-avatar">
              {{ form.name?.charAt(0) }}
            </el-avatar>
            <el-upload
              class="avatar-uploader"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleAvatarChange"
              accept="image/*"
            >
              <el-button type="primary" size="small" :loading="uploading">{{ form.avatar ? '更换头像' : '上传头像' }}</el-button>
            </el-upload>
          </div>
        </el-form-item>

        <!-- 账号（只读） -->
        <el-form-item label="账号">
          <el-input v-model="form.username" disabled />
        </el-form-item>

        <!-- 角色（只读） -->
        <el-form-item label="角色">
          <el-input v-model="roleText" disabled />
        </el-form-item>

        <!-- 姓名 -->
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>

        <!-- 班级（仅学生，只读） -->
        <el-form-item label="班级" v-if="form.role === 'student'">
          <el-input v-model="form.class_name" placeholder="暂无班级" disabled />
        </el-form-item>

        <!-- 学院（仅学生，只读） -->
        <el-form-item label="学院" v-if="form.role === 'student'">
          <el-input :model-value="form.college" placeholder="暂无学院" disabled />
        </el-form-item>

        <!-- 专业（仅学生，只读） -->
        <el-form-item label="专业" v-if="form.role === 'student'">
          <el-input :model-value="form.major" placeholder="暂无专业" disabled />
        </el-form-item>

        <!-- 手机号 -->
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>

        <!-- 邮箱 -->
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <!-- 个性签名 -->
        <el-form-item label="个性签名">
          <el-input
            v-model="form.signature"
            type="textarea"
            :rows="2"
            maxlength="100"
            show-word-limit
            placeholder="一句话介绍自己,会显示在好友主页上"
          />
        </el-form-item>

        <!-- 主页背景图 -->
        <el-form-item label="主页背景图">
          <div class="bg-wrapper">
            <div v-if="form.background_image" class="bg-preview">
              <el-image :src="form.background_image" fit="cover" style="width: 300px; height: 120px; border-radius: 8px;" />
              <el-button type="danger" size="small" class="bg-remove" @click="form.background_image = ''">
                <el-icon><Delete /></el-icon> 移除
              </el-button>
            </div>
            <el-upload
              v-else
              class="bg-uploader"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleBgChange"
              accept="image/*"
            >
              <el-button type="primary" size="small" :loading="uploadingBg">
                <el-icon><Upload /></el-icon> 上传背景图
              </el-button>
            </el-upload>
          </div>
        </el-form-item>

        <!-- 精选照片 -->
        <el-form-item label="精选照片">
          <div class="photos-wrapper">
            <div v-if="featuredPhotos.length" class="photo-list">
              <div v-for="(url, idx) in featuredPhotos" :key="idx" class="photo-item">
                <el-image :src="url" fit="cover" style="width: 100px; height: 100px; border-radius: 8px;" />
                <el-button circle size="small" type="danger" class="photo-remove" @click="removePhoto(idx)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
            <el-upload
              v-if="featuredPhotos.length < 9"
              class="photo-uploader"
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handlePhotosChange"
              accept="image/*"
              multiple
            >
              <el-button type="primary" size="small" :loading="uploadingPhotos">
                <el-icon><Plus /></el-icon> 添加照片 ({{ featuredPhotos.length }}/9)
              </el-button>
            </el-upload>
          </div>
        </el-form-item>

        <!-- 注册时间（只读） -->
        <el-form-item label="注册时间">
          <el-input v-model="form.created_at" disabled />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="saving">保存修改</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getProfile, updateProfile, uploadAvatar, uploadImage } from '@/api/profile'
import { Upload, Delete, Close, Plus } from '@element-plus/icons-vue'

const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const uploadingBg = ref(false)
const uploadingPhotos = ref(false)

const form = ref({
  username: '',
  name: '',
  role: '',
  avatar: '',
  class_name: '',
  phone: '',
  email: '',
  signature: '',
  background_image: '',
  featured_photos: null,
  created_at: ''
})

const originalData = ref(null)

const roleText = computed(() => {
  const map = { admin: '管理员', teacher: '教师', student: '学生' }
  return map[form.value.role] || form.value.role
})

const featuredPhotos = computed(() => {
  if (!form.value.featured_photos) return []
  if (Array.isArray(form.value.featured_photos)) return form.value.featured_photos
  try {
    const parsed = JSON.parse(form.value.featured_photos)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const fetchProfile = async () => {
  loading.value = true
  try {
    const res = await getProfile()
    form.value = { ...res.data }
    originalData.value = { ...res.data }
  } finally {
    loading.value = false
  }
}

const handleAvatarChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 2MB')
    return
  }
  uploading.value = true
  try {
    const res = await uploadAvatar(file)
    form.value.avatar = res.data.url
    ElMessage.success('头像上传成功')
  } catch (err) {
    ElMessage.error('头像上传失败')
  } finally {
    uploading.value = false
  }
}

const handleBgChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('背景图大小不能超过 5MB')
    return
  }
  uploadingBg.value = true
  try {
    const res = await uploadAvatar(file)
    form.value.background_image = res.data.url
    ElMessage.success('背景图上传成功')
  } catch (err) {
    ElMessage.error('背景图上传失败')
  } finally {
    uploadingBg.value = false
  }
}

const handlePhotosChange = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('单张图片大小不能超过 5MB')
    return
  }
  if (featuredPhotos.value.length >= 9) {
    ElMessage.warning('最多上传 9 张精选照片')
    return
  }
  uploadingPhotos.value = true
  try {
    const res = await uploadAvatar(file)
    const current = featuredPhotos.value
    form.value.featured_photos = [...current, res.data.url]
    ElMessage.success('照片上传成功')
  } catch (err) {
    ElMessage.error('照片上传失败')
  } finally {
    uploadingPhotos.value = false
  }
}

const removePhoto = (idx) => {
  const current = [...featuredPhotos.value]
  current.splice(idx, 1)
  form.value.featured_photos = current
}

const handleSubmit = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const res = await updateProfile({
      name: form.value.name,
      phone: form.value.phone,
      email: form.value.email,
      avatar: form.value.avatar,
      signature: form.value.signature,
      background_image: form.value.background_image,
      featured_photos: featuredPhotos.value
    })
    userStore.setUserInfo(res.data)
    originalData.value = { ...form.value }
    ElMessage.success('保存成功')
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleReset = async () => {
  // 重置为从服务器获取的原始数据
  if (originalData.value) {
    form.value = { ...originalData.value }
  }
  // 清除表单校验状态
  formRef.value?.clearValidate()
  ElMessage.success('已重置为原始数据')
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.profile-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 36px;
  font-weight: bold;
}

.avatar-uploader {
  display: inline-block;
}

.bg-wrapper {
  .bg-preview {
    position: relative;
    display: inline-block;
    .bg-remove {
      position: absolute;
      top: 6px;
      right: 6px;
    }
  }
}

.photos-wrapper {
  .photo-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    .photo-item {
      position: relative;
      .photo-remove {
        position: absolute;
        top: -6px;
        right: -6px;
      }
    }
  }
}
</style>
