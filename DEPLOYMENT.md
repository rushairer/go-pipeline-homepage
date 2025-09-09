# GitHub Pages 部署指南

## 已创建的文件

✅ `.github/workflows/deploy.yml` - GitHub Actions 工作流配置

## 🚨 遇到权限错误？

### 错误信息：
- "Get Pages site failed"
- "Create Pages site failed" 
- "Resource not accessible by integration"

### 完整解决步骤：

#### 1. 检查仓库可见性
- 确保仓库是 **公开的 (Public)**，或者你有 GitHub Pro/Team 账户

#### 2. 手动启用 GitHub Pages
1. 进入：`https://github.com/你的用户名/你的仓库名/settings/pages`
2. **Source** 选择：**Deploy from a branch**
3. **Branch** 选择：**main** (或 master)
4. **文件夹** 选择：**/ (root)**
5. 点击 **Save**
6. 等待页面显示："Your site is ready to be published at ..."

#### 3. 配置 Actions 权限
1. 进入：`https://github.com/你的用户名/你的仓库名/settings/actions`
2. 在 **Workflow permissions** 部分：
   - 选择 **Read and write permissions**
   - 勾选 **Allow GitHub Actions to create and approve pull requests**
3. 点击 **Save**

#### 4. 切换到 GitHub Actions 部署
1. 回到：`https://github.com/你的用户名/你的仓库名/settings/pages`
2. **Source** 改为：**GitHub Actions**
3. 点击 **Save**

#### 5. 重新运行工作流
1. 进入 Actions 标签页
2. 找到失败的工作流运行
3. 点击 **Re-run all jobs**

### 如果还是不行，尝试备用工作流：

我已经创建了一个简化版本的工作流文件：`.github/workflows/deploy-simple.yml`

**使用备用工作流：**

1. 删除或重命名原工作流：
   ```bash
   mv .github/workflows/deploy.yml .github/workflows/deploy.yml.backup
   ```

2. 备用工作流会自动生效，它使用更简单的配置

3. 如果备用工作流成功，说明问题在于复杂的配置，可以继续使用简化版本

**两个工作流的区别：**
- 原版本：分离的构建和部署作业，更适合复杂项目
- 简化版：单一作业完成所有步骤，更容易调试权限问题

## GitHub 仓库配置步骤

### ⚠️ 重要：必须先手动启用 GitHub Pages

**在推送代码之前，必须先在 GitHub 仓库中手动启用 Pages 功能：**

### 1. 启用 GitHub Pages

1. 进入你的 GitHub 仓库页面
2. 点击 **Settings** 标签页
3. 在左侧菜单中滚动找到 **Pages** 选项
4. 在 **Source** 部分：
   - 选择 **Deploy from a branch** （临时选择）
   - Branch 选择 **main** 或 **master**
   - 文件夹选择 **/ (root)**
   - 点击 **Save**
5. 等待几秒钟，页面会显示 Pages 已启用
6. 然后再次进入 **Pages** 设置
7. 将 **Source** 改为 **GitHub Actions**
8. 点击 **Save**

### 2. 配置 Actions 权限

确保仓库的 Actions 权限设置正确：

1. 在 **Settings** → **Actions** → **General**
2. 在 **Workflow permissions** 部分选择：
   - **Read and write permissions**
   - 勾选 **Allow GitHub Actions to create and approve pull requests**

### 3. 验证 Pages 配置

在 **Settings** → **Pages** 中应该看到：
- ✅ **Source**: GitHub Actions
- ✅ 显示网站 URL（可能需要几分钟生效）

## 工作流说明

### 触发条件
- 推送到 `main` 或 `master` 分支时自动触发
- 可以手动触发（workflow_dispatch）

### 构建过程
1. **检出代码** - 获取仓库代码
2. **设置 Node.js** - 使用 Node.js 18 和 npm 缓存
3. **安装依赖** - 运行 `npm ci`
4. **构建网站** - 运行 `npm run build`
5. **上传构建产物** - 将 `build` 目录上传为 Pages 构件
6. **部署到 Pages** - 自动部署到 GitHub Pages

### 部署 URL
部署完成后，你的网站将在以下地址可用：
```
https://<username>.github.io/<repository-name>
```

## 使用方法

1. 将代码推送到 `main` 分支：
   ```bash
   git add .
   git commit -m "Add GitHub Pages workflow"
   git push origin main
   ```

2. 查看部署状态：
   - 进入仓库的 **Actions** 标签页
   - 查看最新的工作流运行状态

3. 访问部署的网站：
   - 部署成功后，在 **Settings** → **Pages** 中可以看到网站 URL

## 故障排除

### 常见问题

1. **"Get Pages site failed" 错误**
   ```
   Error: Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions
   Error: HttpError: Not Found
   ```
   
   **解决方案：**
   - 这是最常见的错误，表示 Pages 功能未正确启用
   - 必须先在 GitHub 仓库设置中手动启用 Pages
   - 按照上面的步骤 1 操作，先选择 "Deploy from a branch"，保存后再改为 "GitHub Actions"
   - 确保仓库是公开的，或者你有 GitHub Pro/Team 账户（私有仓库需要付费计划）

2. **权限错误**
   - 确保在仓库设置中启用了正确的 Actions 权限
   - 检查 **Settings** → **Actions** → **General** → **Workflow permissions**

3. **构建失败**
   - 检查 `package.json` 中的构建脚本
   - 确保所有依赖都在 `package.json` 中正确声明
   - 查看 Actions 日志中的具体错误信息

4. **部署失败**
   - 确保在仓库设置中选择了 "GitHub Actions" 作为 Pages 源
   - 检查工作流日志中的错误信息
   - 验证 `build` 目录是否正确生成

5. **网站无法访问**
   - 等待 5-10 分钟，GitHub Pages 部署需要时间
   - 检查 DNS 传播（可能需要最多 24 小时）
   - 确保没有浏览器缓存问题

### 自定义配置

如果需要修改构建配置，可以编辑 `.github/workflows/deploy.yml` 文件：

- 修改 Node.js 版本
- 添加环境变量
- 修改构建命令
- 添加额外的构建步骤

## 注意事项

- 确保 `build` 目录包含所有必要的静态文件
- Docusaurus 默认构建输出到 `build` 目录
- 工作流使用最新的 GitHub Actions，确保稳定性和安全性