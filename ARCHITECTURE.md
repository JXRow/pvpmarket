# PvP Market V2 — 架构与模块说明

本项目是 **PvP Market** 的第二代前端，基于 **Vite + React** 构建，当前为纯 UI 静态实现阶段，尚未接入钱包、合约或实时数据。

---

## 1. 技术栈

| 层级 | 技术 |
|------|------|
| 构建工具 | Vite |
| 前端框架 | React 18 (Hooks) |
| 图标库 | Lucide React |
| 样式方案 | 全局 CSS (`styles.css`) |

---

## 2. 目录结构

```
src/
├── main.jsx              # 应用入口，渲染 App 组件
├── App.jsx               # 根组件，全局状态与 Overlay 管理
├── styles.css            # 全局样式，包含布局、动画、主题色
├── components/           # 展示型组件
│   ├── NavBar.jsx        # 顶部导航栏
│   ├── ConnectWallet.jsx # 连接钱包按钮
│   ├── OrderBook.jsx     # 订单簿
│   ├── OrderRow.jsx      # 订单簿单行
│   ├── TradePanel.jsx    # 交易面板（Buy/Sell 切换容器）
│   ├── BuyPanel.jsx      # 买入面板
│   ├── SellPanel.jsx     # 卖出面板
│   ├── MarketStats.jsx   # 市场行情卡片
│   ├── ChartPanel.jsx    # 图表占位区
│   ├── MyOrders.jsx      # 我的订单 / 活动列表
│   ├── ToastStack.jsx    # Toast 通知堆栈
│   ├── CalloutNotice.jsx # 顶部横幅通知
│   └── PromptDialog.jsx  # 模态对话框
├── model/
│   └── model.js          # 静态Mock数据（订单簿、订单、行情等）
└── utils/
    └── util.js           # 通用工具函数
```

---

## 3. 各模块职责

### 3.1 入口层

| 文件 | 职责 |
|------|------|
| `main.jsx` | React 应用挂载点，负责 `ReactDOM.createRoot` 渲染 `App`。 |
| `App.jsx` | **核心编排层**。定义全局状态（Dialog / Toast / Callout），封装其显示/关闭逻辑，并通过 props 将回调注入 `NavBar`。布局上组合所有页面级区块。 |

### 3.2 页面区块组件 (`components/`)

| 组件 | 职责 |
|------|------|
| **NavBar** | 顶部导航。包含品牌名、主导航链接（Trade / Tokens / Pool / Activity）、网络选择、钱包连接按钮、移动端菜单按钮。导航项点击触发 App 层的测试回调。 |
| **ConnectWallet** | 钱包连接按钮，点击调用 `onConnect` 打开连接对话框。 |
| **OrderBook** | 左侧订单簿。展示 Ask（卖单）列表、Spread 中间价、Bid（买单）列表。数据来自 `model.js`。 |
| **OrderRow** | 订单簿的单行渲染。根据 `type` 渲染红色(ask)或绿色(bid)深度条。 |
| **TradePanel** | 中间交易面板。管理 Buy / Sell 标签切换状态，渲染对应的 `BuyPanel` 或 `SellPanel`，底部为提交按钮。 |
| **BuyPanel** | 买入表单。包含余额显示、价格输入（只读）、数量输入、百分比快捷选择、总计显示。 |
| **SellPanel** | 卖出表单。结构与 `BuyPanel` 对称，单位和余额按卖出侧调整。 |
| **MarketStats** | 右侧市场行情卡片。展示交易对名称、当前价、涨跌幅、24h 高低 / 成交量。 |
| **ChartPanel** | 图表占位组件。当前仅显示禁用状态的图标与文案。 |
| **MyOrders** | 下方活动表格。展示"Open Orders"和"Order History"标签页，表格列包含日期、交易对、方向、价格、数量、总计、成交率、操作。 |

### 3.3 全局 Overlay 组件

| 组件 | 职责 |
|------|------|
| **PromptDialog** | 模态对话框。支持自定义标题、内容、按钮列表；具备队列机制（App 层实现排队）和进出动画。 |
| **ToastStack** | 底部 Toast 通知堆栈。最多同时显示 3 条，支持自动关闭和滑出动画。 |
| **CalloutNotice** | 顶部横幅通知。支持自动关闭或常驻（带手动隐藏按钮），支持即时替换当前通知。 |

### 3.4 数据与工具

| 文件 | 职责 |
|------|------|
| `model/model.js` | **静态 Mock 数据源**。导出 `asks`、`bids`、`orders`、`marketStats`、`pairInfo` 等常量，供组件直接引用。未来可替换为 API / 合约调用。 |
| `utils/util.js` | 通用工具。当前包含 `formatNumber`（千分位格式化）和 `clamp`（数值截断）。 |

---

## 4. 全局状态管理

当前未引入 Redux / Zustand / Context。所有全局 UI 状态集中在 `App.jsx` 中，通过 **Lifting State Up** 模式管理：

- **Dialog 队列**：`dialogQueue` (ref) + `activeDialog` / `isDialogOpen` (state)
- **Toast 列表**：`toasts` (state) + `toastTimers` (ref，管理 setTimeout)
- **Callout 通知**：`callout` (state) + `calloutTimers` (ref)

子组件通过 props 接收回调（如 `onConnect`、`onTokens`）来触发全局 Overlay 显示。

---

## 5. 后续接入建议

| 模块 | 建议方案 |
|------|----------|
| 钱包连接 | 集成 `wagmi` + `viem`，替换 `ConnectWallet` 的点击逻辑 |
| 合约交互 | 在 `model/` 或新建 `services/` 中封装合约读写方法 |
| 实时数据 | 使用 `ethers` Provider 监听事件，或接入 WebSocket 替换静态 `model.js` |
| 状态管理 | 若交互复杂度提升，建议引入 Zustand 或 Redux Toolkit |
| 图表 | 接入 `lightweight-charts` 或 `tradingview-charting-library` 替换 `ChartPanel` |

---

## 6. 构建与运行

```bash
npm install
npm run dev      # 本地开发
npm run build    # 生产构建（输出到 dist/）
```
