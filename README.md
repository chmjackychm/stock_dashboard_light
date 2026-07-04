# 轻量行情 PWA

这是从 Streamlit 原型迁移出来的 Next.js PWA 版本，用于部署到 Vercel，并在手机浏览器中添加到主屏幕使用。

## 功能

- 自选页：展示价格、涨跌额、涨跌幅、MA5、MA10、J 值，并支持查看详情、删除自选。
- 搜索页：按名称、拼音或代码搜索股票/ETF，支持查看详情和加入自选。
- 详情页：保留来源感知返回按钮，展示成交量、技术指标分析、近 7 日蜡烛图和 KDJ 趋势。
- 设置页：展示部署方式、数据源、自选存储和安装方式。
- PWA：包含 manifest、图标和 service worker，可添加到手机主屏幕。

## 本地运行

先安装 Node.js 20 LTS 或更新版本，然后在本目录执行：

```bash
npm install
npm run check
npm run build
npm run dev
```

启动后访问：

```text
http://localhost:3000
```

## Vercel 部署

1. 将 `vercel-app` 作为一个独立项目提交到 GitHub。
2. 打开 Vercel，选择 `New Project`，导入该仓库。
3. 如果仓库根目录不是 `vercel-app`，在 Vercel 的 `Root Directory` 中选择 `stock-dashboard 2/vercel-app`。
4. Framework Preset 选择 `Next.js`。
5. Build Command 保持 `npm run build`，Install Command 保持 `npm install`。
6. 部署完成后，用 Vercel 提供的 HTTPS 地址在手机浏览器打开。

## 手机安装

iPhone：

1. 用 Safari 打开 Vercel 地址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 从桌面图标打开后，会以近似 App 的独立窗口运行。

Android：

1. 用 Chrome 打开 Vercel 地址。
2. 点击菜单。
3. 选择“安装应用”或“添加到主屏幕”。

## 数据说明

行情数据通过 Next.js API Route 在服务端代理腾讯公开行情接口：

- `/api/search?q=`
- `/api/quote?secid=`
- `/api/kline?secid=&count=`
- `/api/detail?secid=`

自选列表存储在浏览器 `localStorage`，同一台手机上会持久保留。跨设备同步后续需要增加登录和云端存储。

## 当前环境备注

当前开发机器缺少 `node` 和 `npm`，因此本次收尾无法在本机实际执行 `npm install`、`npm run check` 或 `npm run build`。安装 Node.js 后应先运行上面的检查命令，再部署到 Vercel。
