# 系统模式

## 推荐目录结构
- `package.json`: 项目依赖和脚本。
- `public/`: 公共静态资源。
- `src/`: 核心源代码。
  - `components/`: 可复用的 React 组件。
  - `contexts/`: React 上下文。
  - `hooks/`: 自定义 React Hooks。
  - `LLMProviders/`: 管理与不同语言模型的交互。
  - `core/`: 核心业务逻辑，如聊天管理。
  - `main.ts`: Obsidian 插件入口点。