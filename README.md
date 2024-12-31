# parse-Claude

A Chrome extension for easily exporting conversations from Claude.

一个用于轻松导出Claude对话的Chrome扩展程序。

## Features | 功能特性

### Current Features | 当前功能
- **Conversation Selection | 对话选择**
  - Perfectly aligned with both user and Claude messages | 与用户和Claude消息完美对齐
  - Select All/Deselect All buttons | 全选/取消全选按钮

- **Multiple Export Options | 多种导出选项**
  - Copy to clipboard | 复制到剪贴板
  - Download as TXT | 下载为TXT文件
  - Download as Markdown | 下载为Markdown文件

### Planned Features | 计划功能

#### UI Improvements | 界面改进
1. **Unified Control Panel | 统一控制面板**
   - Collapsible floating button that expands to show all options
   - 可折叠的悬浮按钮，展开后显示所有选项
   - Benefits | 优势:
     - Cleaner interface | 更简洁的界面
     - More screen space for chat | 为聊天留出更多空间
     - Better user experience | 更好的用户体验
   - Challenges | 挑战:
     - Need to ensure good positioning | 需要确保良好的定位
     - Must maintain accessibility | 必须保持可访问性
     - Consider mobile responsiveness | 考虑移动端响应性

2. **Enhanced Feedback System | 增强的反馈系统**
   - Toast notifications for user actions | 用户操作的 Toast 通知
   - Benefits | 优势:
     - No interrupting alerts | 无打断性提醒
     - Better user feedback | 更好的用户反馈
     - Modern UI feel | 现代化的界面感觉
   - Implementation Considerations | 实现考虑:
     - Position and timing | 位置和时间
     - Animation smoothness | 动画流畅度
     - Message clarity | 消息清晰度

## Installation | 安装方法

1. Clone this repository | 克隆此仓库
2. Open Chrome and navigate to `chrome://extensions/` | 打开Chrome浏览器，访问 `chrome://extensions/`
3. Enable "Developer mode" | 启用"开发者模式"
4. Click "Load unpacked" and select the extension directory | 点击"加载已解压的扩展程序"并选择扩展目录

## Usage | 使用方法

1. Open Claude chat interface | 打开Claude聊天界面
2. Hover over messages to see checkboxes | 将鼠标悬停在消息上以显示复选框
3. Select messages you want to export | 选择要导出的消息
4. Use the export buttons to copy or download | 使用导出按钮复制或下载

## Development | 开发

### Current Status | 当前状态
- ✅ Basic export functionality | 基本导出功能
- ✅ Checkbox positioning | 复选框定位
- ✅ Message selection | 消息选择
- ✅ Multiple export formats | 多种导出格式

### Next Steps | 下一步计划
1. Implement collapsible control panel | 实现可折叠控制面板
2. Add toast notification system | 添加 Toast 通知系统
3. Enhance UI animations and transitions | 增强UI动画和过渡效果
4. Improve mobile responsiveness | 改进移动端响应性

## Contributing | 贡献

Feel free to open issues or submit pull requests! | 欢迎提出问题或提交拉取请求！

## License | 许可

MIT