<template>
  <div class="ai-settings-page">
    <div class="page-head">
      <div>
        <h2>AI 设置</h2>
        <p>统一配置学生端智能 AI 的服务商、模型和连接状态</p>
      </div>
      <el-tag :type="form.enabled ? 'success' : 'info'" effect="dark" size="large">
        {{ form.enabled ? '已启用' : '未启用' }}
      </el-tag>
    </div>

    <el-row :gutter="18">
      <el-col :lg="16" :md="24">
        <el-card class="panel" :body-style="{ padding: '24px' }">
          <template #header>
            <div class="panel-header">
              <span><el-icon><Connection /></el-icon> 模型接入</span>
              <el-button :loading="loading" @click="loadData">
                <el-icon><RefreshRight /></el-icon>
              </el-button>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" class="settings-form">
            <el-form-item label="服务商" prop="provider">
              <el-segmented v-model="form.provider" :options="providerOptions" @change="handleProviderChange" />
            </el-form-item>

            <el-form-item label="API Key" prop="api_key">
              <el-input
                v-model="form.api_key"
                type="password"
                show-password
                clearable
                :placeholder="setting.has_key ? `已保存：${setting.api_key_masked}，不填则继续使用原 Key` : '请输入 API Key'"
              >
                <template #prefix><el-icon><Key /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item label="模型 / 接入点" prop="model">
              <el-input v-model="form.model" placeholder="请输入模型名称或豆包方舟接入点 ID">
                <template #prefix><el-icon><Cpu /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item label="Base URL" prop="base_url">
              <el-input v-model="form.base_url" placeholder="服务商 OpenAI 兼容 Base URL" />
            </el-form-item>

            <el-form-item label="学生端启用">
              <el-switch
                v-model="form.enabled"
                active-text="开启"
                inactive-text="关闭"
                inline-prompt
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveConfig">
                <el-icon><Check /></el-icon>
                保存配置
              </el-button>
              <el-button type="success" plain :loading="testing" @click="testConfig">
                <el-icon><Promotion /></el-icon>
                测试连接
              </el-button>
            </el-form-item>
          </el-form>

          <el-alert
            v-if="testResult"
            class="test-result"
            :type="testResult.ok ? 'success' : 'error'"
            :title="testResult.title"
            :description="testResult.desc"
            show-icon
            :closable="false"
          />
        </el-card>
      </el-col>

      <el-col :lg="8" :md="24">
        <div class="stats-grid">
          <div class="stat-card">
            <span>累计请求</span>
            <strong>{{ usageSummary.request_count || 0 }}</strong>
          </div>
          <div class="stat-card">
            <span>总 Token</span>
            <strong>{{ usageSummary.total_tokens || 0 }}</strong>
          </div>
          <div class="stat-card">
            <span>输入 Token</span>
            <strong>{{ usageSummary.prompt_tokens || 0 }}</strong>
          </div>
          <div class="stat-card">
            <span>输出 Token</span>
            <strong>{{ usageSummary.completion_tokens || 0 }}</strong>
          </div>
        </div>

        <el-card class="panel status-panel" :body-style="{ padding: '18px' }">
          <template #header>
            <div class="panel-header">
              <span><el-icon><DataLine /></el-icon> 最近测试</span>
            </div>
          </template>
          <el-empty v-if="!setting.last_test_at" description="暂无测试记录" />
          <div v-else class="last-test">
            <el-tag :type="setting.last_test_status === 'success' ? 'success' : 'danger'">
              {{ setting.last_test_status === 'success' ? '连接成功' : '连接失败' }}
            </el-tag>
            <p>{{ setting.last_test_message }}</p>
            <span>{{ formatTime(setting.last_test_at) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="panel usage-panel" :body-style="{ padding: '0' }">
      <template #header>
        <div class="panel-header">
          <span><el-icon><DataAnalysis /></el-icon> Token 用量明细</span>
        </div>
      </template>
      <el-table :data="usageRecent" stripe>
        <el-table-column prop="created_at" label="时间" width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="user_name" label="用户" width="120">
          <template #default="{ row }">{{ row.user_name || '系统' }}</template>
        </el-table-column>
        <el-table-column prop="purpose" label="用途" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.purpose === 'test' ? 'warning' : 'primary'">
              {{ row.purpose === 'test' ? '测试' : '聊天' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="服务商" width="110" />
        <el-table-column prop="model" label="模型" min-width="180" show-overflow-tooltip />
        <el-table-column prop="prompt_tokens" label="输入" width="90" align="right" />
        <el-table-column prop="completion_tokens" label="输出" width="90" align="right" />
        <el-table-column prop="total_tokens" label="总计" width="90" align="right" />
        <el-table-column prop="success" label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.success ? 'success' : 'danger'">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAiSettings, saveAiSettings, testAiSettings } from '@/api/admin'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const formRef = ref()
const setting = ref({})
const providers = ref({})
const usageSummary = ref({})
const usageRecent = ref([])
const testResult = ref(null)

const form = reactive({
  provider: 'deepseek',
  api_key: '',
  model: 'deepseek-chat',
  base_url: 'https://api.deepseek.com',
  enabled: false
})

const providerOptions = computed(() => {
  return Object.entries(providers.value).map(([value, item]) => ({
    label: item.label,
    value
  }))
})

const rules = {
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  model: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  base_url: [{ required: true, message: '请输入 Base URL', trigger: 'blur' }]
}

const syncForm = (data) => {
  setting.value = data.setting || {}
  providers.value = data.providers || {}
  usageSummary.value = data.usage?.summary || {}
  usageRecent.value = data.usage?.recent || []
  form.provider = setting.value.provider || 'deepseek'
  form.api_key = ''
  form.model = setting.value.model || providers.value[form.provider]?.model || ''
  form.base_url = setting.value.base_url || providers.value[form.provider]?.baseUrl || ''
  form.enabled = !!setting.value.enabled
}

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await getAiSettings()
    syncForm(data)
  } catch (e) {
    testResult.value = {
      ok: false,
      title: 'AI 设置接口暂不可用',
      desc: '请确认后端已更新并重启后再试'
    }
  } finally {
    loading.value = false
  }
}

const handleProviderChange = () => {
  const defaults = providers.value[form.provider]
  if (!defaults) return
  form.model = defaults.model
  form.base_url = defaults.baseUrl
}

const buildPayload = () => ({
  provider: form.provider,
  api_key: form.api_key.trim(),
  model: form.model.trim(),
  base_url: form.base_url.trim(),
  enabled: form.enabled
})

const saveConfig = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const { data } = await saveAiSettings(buildPayload())
    setting.value = data
    form.api_key = ''
    ElMessage.success('AI 配置已保存')
    await loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const testConfig = async () => {
  await formRef.value.validate()
  testing.value = true
  testResult.value = null
  try {
    const { data } = await testAiSettings(buildPayload())
    form.enabled = true
    testResult.value = {
      ok: true,
      title: '连接成功',
      desc: `${data.reply} 本次消耗 ${data.usage?.total_tokens || 0} tokens`
    }
    ElMessage.success('AI 连接测试成功')
    await loadData()
  } catch (e) {
    testResult.value = {
      ok: false,
      title: '连接失败',
      desc: e.message || '请检查 API Key、模型名称和网络'
    }
  } finally {
    testing.value = false
  }
}

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', { hour12: false })
}

loadData()
</script>

<style scoped lang="scss">
.ai-settings-page {
  .page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;

    h2 {
      margin: 0 0 6px;
      color: #1f2937;
      font-size: 24px;
    }

    p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
  }

  .panel {
    border: none;
    border-radius: 8px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
    margin-bottom: 18px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 700;
    color: #1f2937;

    span {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  .settings-form {
    max-width: 760px;

    :deep(.el-segmented) {
      --el-segmented-item-selected-bg-color: #409eff;
      --el-segmented-item-selected-color: #fff;
    }
  }

  .test-result {
    margin-top: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 18px;
  }

  .stat-card {
    min-height: 86px;
    padding: 16px;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);

    span {
      display: block;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 10px;
    }

    strong {
      color: #1f2937;
      font-size: 26px;
      line-height: 1;
    }
  }

  .last-test {
    display: flex;
    flex-direction: column;
    gap: 10px;

    p {
      margin: 0;
      color: #374151;
      line-height: 1.6;
    }

    span {
      color: #9ca3af;
      font-size: 12px;
    }
  }

  .usage-panel {
    :deep(.el-card__header) {
      padding: 16px 20px;
    }
  }
}
</style>
