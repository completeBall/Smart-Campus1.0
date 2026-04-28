<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background: #f0f2f5;
}

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
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%) !important;
  border-bottom: 1px solid #e4e7ed;
}

.el-message-box__title {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #1a1a2e !important;
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
  color: #409eff;
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
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.el-message-box__btns .el-button:hover {
  transform: translateY(-1px);
}

.el-message-box__btns .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #1677ff 100%) !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35) !important;
}

.el-message-box__btns .el-button--primary:hover {
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.45) !important;
}
</style>
