<template>
  <router-view />
</template>

<style>
/* 美化 ElMessageBox 弹窗 */
.el-message-box {
  border-radius: 20px !important;
  border: none !important;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12) !important;
  padding: 0 !important;
  overflow: hidden;
}

.el-message-box__header {
  padding: 20px 24px !important;
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0;
}

.el-message-box__title {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #0a1b33 !important;
}

.el-message-box__headerbtn {
  top: 20px !important;
  right: 20px !important;
}

.el-message-box__headerbtn .el-message-box__close {
  color: #909399;
  font-size: 18px;
  transition: color 0.3s;
}

.el-message-box__headerbtn .el-message-box__close:hover {
  color: #123e81;
}

.el-message-box__content {
  padding: 24px !important;
  font-size: 15px;
  color: #606266;
}

.el-message-box__status {
  font-size: 22px !important;
}

.el-message-box__status + .el-message-box__message {
  padding-left: 36px !important;
}

.el-message-box__btns {
  padding: 16px 24px 24px !important;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.el-message-box__btns .el-button {
  border-radius: 999px !important;
  padding: 10px 24px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.el-message-box__btns .el-button:hover {
  transform: translateY(-1px);
}

.el-message-box__btns .el-button--primary {
  color: #334155 !important;
  background: #fff !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05) !important;
}

.el-message-box__btns .el-button--primary:hover {
  color: #0a1b33 !important;
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.08) !important;
}
</style>
