# 轻量行情 PWA

这是从 Streamlit 原型迁移出来的 Next.js 桌面 Web App / PWA 版本，用于部署到 Vercel，并分享给朋友直接通过浏览器访问。

## 功能

- 自选页：展示价格、涨跌额、涨跌幅、MA5、MA10、J 值，支持卡片/列表两种视图、查看详情、删除自选。
- 搜索页：按名称、拼音或代码搜索股票/ETF，支持查看详情和加入自选。
- 详情页：保留来源感知返回按钮，展示成交量、技术指标综合建议、近 30 交易日蜡烛图和 KDJ 趋势。
- 设置页：展示部署方式、数据源、自选存储和安装方式。
- PWA：包含 manifest、图标和 service worker，可安装为桌面 Web App。

## 本地运行

先安装 Node.js 20 LTS 或更新版本，然后在本目录执行：

```bash
npm install
npm run check
npm run build
npm run dev
```

启动后按终端显示的 `Local:` 地址访问，默认通常是：

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

## 桌面安装

Chrome / Edge：

1. 用浏览器打开 Vercel 地址。
2. 点击地址栏右侧的“安装”图标，或在浏览器菜单中选择“安装应用”。
3. 安装后会以独立窗口形式运行，更接近桌面 App。

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

自选列表和自选页视图偏好存储在浏览器 `localStorage`，同一台设备、同一浏览器中会持久保留。跨设备同步后续需要增加登录和云端存储。
