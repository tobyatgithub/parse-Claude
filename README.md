# parse-Claude

A Chrome extension for easily exporting conversations from Claude.

一个用于轻松导出Claude对话的Chrome扩展程序。

## Features | 功能特性

- **Conversation Selection | 对话选择**
  - Adds checkboxes to each message for easy selection
  - Select All/Deselect All buttons at the bottom of the page
  - 为每条消息添加复选框，方便选择
  - 页面底部配备全选/取消全选按钮
  
- **Export Options | 导出选项**
  - Floating window in the bottom-right corner
  - Multiple export formats:
    - Copy to clipboard
    - Download as TXT
    - Download as Markdown
  - 右下角悬浮窗
  - 多种导出格式：
    - 复制到剪贴板
    - 下载为TXT文件
    - 下载为Markdown文件

## Installation | 安装方法

1. Clone this repository | 克隆此仓库
2. Open Chrome and navigate to `chrome://extensions/` | 打开Chrome浏览器，访问 `chrome://extensions/`
3. Enable "Developer mode" | 启用"开发者模式"
4. Click "Load unpacked" and select the extension directory | 点击"加载已解压的扩展程序"并选择扩展目录

## Usage | 使用方法

1. Open Claude chat interface | 打开Claude聊天界面
2. Select messages you want to export using checkboxes | 使用复选框选择要导出的消息
3. Click the floating export button in the bottom-right corner | 点击右下角的导出按钮
4. Choose your preferred export format | 选择您想要的导出格式

## Development | 开发

### Prerequisites | 前置要求
- Chrome Browser | Chrome浏览器
- Basic knowledge of JavaScript, HTML, and CSS | 基础的JavaScript、HTML和CSS知识

### Project Structure | 项目结构
parse-Claude/
├── manifest.json
├── src/
│ ├── content.js
│ ├── popup/
│ │ ├── popup.html
│ │ ├── popup.js
│ │ └── popup.css
│ └── styles/
│ └── content.css
├── assets/
│ └── icons/
└── README.md

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details