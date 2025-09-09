# GitHub Pages 部署指南

## 已创建的文件

✅ `.github/workflows/deploy.yml` - GitHub Actions 工作流配置

## GitHub 仓库配置步骤

### 1. 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** 标签页
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 部分选择 **GitHub Actions**

### 2. 配置权限（如果需要）

确保仓库的 Actions 权限设置正确：

1. 在 **Settings** → **Actions** → **General**
2. 在 **Workflow permissions** 部分选择：
   - **Read and write permissions**
   - 勾选 **Allow GitHub Actions to create and approve pull requests**

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

1. **权限错误**
   - 确保在仓库设置中启用了正确的 Actions 权限

2. **构建失败**
   - 检查 `package.json` 中的构建脚本
   - 确保所有依赖都在 `package.json` 中正确声明

3. **部署失败**
   - 确保在仓库设置中选择了 "GitHub Actions" 作为 Pages 源
   - 检查工作流日志中的错误信息

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