class ClaudeExporter {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Attempting to initialize Claude Exporter...');
    
    try {
      // 等待页面完全加载
      await this.waitForPageLoad();
      
      // 等待聊天界面加载
      await this.waitForChatInterface();
      
      console.log('Chat interface found, initializing features...');
      this.setupControls();
      this.setupExportPanel();
      this.addCheckboxesToMessages();
      this.setupMessageObserver();
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  waitForPageLoad() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  async waitForChatInterface() {
    console.log('Waiting for chat interface...');
    
    // 尝试多个可能的选择器
    const selectors = [
      '.w-full.h-full.relative',
      '[role="main"]',
      '#__next',
      '.overflow-y-auto.overflow-x-hidden' // 消息容器的一个可能的类
    ];

    for (const selector of selectors) {
      console.log(`Trying to find container with selector: ${selector}`);
      const container = await this.waitForElement(selector);
      if (container) {
        console.log('Found container:', container);
        return container;
      }
    }

    throw new Error('Chat container not found');
  }

  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      // 先检查元素是否已存在
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      // 创建一个观察器来等待元素
      const observer = new MutationObserver((_, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      // 观察整个文档
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // 设置超时
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  setupControls() {
    try {
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'claude-export-controls';
      
      const selectAllBtn = document.createElement('button');
      selectAllBtn.textContent = 'Select All';
      selectAllBtn.className = 'claude-export-button';
      selectAllBtn.addEventListener('click', () => this.selectAllMessages(true));

      const deselectAllBtn = document.createElement('button');
      deselectAllBtn.textContent = 'Deselect All';
      deselectAllBtn.className = 'claude-export-button';
      deselectAllBtn.addEventListener('click', () => this.selectAllMessages(false));

      controlsDiv.appendChild(selectAllBtn);
      controlsDiv.appendChild(deselectAllBtn);
      
      // 确保添加到正确的容器
      const container = document.querySelector('.w-full.h-full.relative') || document.body;
      container.appendChild(controlsDiv);
      console.log('Controls setup completed');
    } catch (error) {
      console.error('Failed to setup controls:', error);
    }
  }

  setupExportPanel() {
    try {
      const exportDiv = document.createElement('div');
      exportDiv.className = 'claude-export-float';

      const copyBtn = document.createElement('button');
      copyBtn.textContent = '复制到剪贴板 | Copy';
      copyBtn.className = 'claude-export-button';
      copyBtn.addEventListener('click', () => this.copyToClipboard());

      const txtBtn = document.createElement('button');
      txtBtn.textContent = '导出为TXT | Export TXT';
      txtBtn.className = 'claude-export-button';
      txtBtn.addEventListener('click', () => this.exportAsTxt());

      const mdBtn = document.createElement('button');
      mdBtn.textContent = '导出为MD | Export MD';
      mdBtn.className = 'claude-export-button';
      mdBtn.addEventListener('click', () => this.exportAsMarkdown());

      exportDiv.appendChild(copyBtn);
      exportDiv.appendChild(txtBtn);
      exportDiv.appendChild(mdBtn);

      // 确保添加到正确的容器
      const container = document.querySelector('.w-full.h-full.relative') || document.body;
      container.appendChild(exportDiv);
      console.log('Export panel setup completed');
    } catch (error) {
      console.error('Failed to setup export panel:', error);
    }
  }

  selectAllMessages(select) {
    console.log('Attempting to select all messages:', select);
    const checkboxes = document.querySelectorAll('.claude-export-checkbox');
    console.log('Found checkboxes:', checkboxes.length);
    
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = select;
      console.log(`Checkbox ${index + 1} set to:`, select);
    });
  }

  addCheckboxesToMessages() {
    console.log('Adding checkboxes to messages...');
    
    // 更新选择器列表，基于 Claude 的 DOM 结构
    const selectors = [
      // 主要消息容器选择器
      '.w-full.flex.flex-col.items-start.gap-4.whitespace-pre-wrap',
      // 备用选择器
      '[data-message-author-role]',
      '.text-message-content',
      '.message-content',
      // 尝试定位包含实际消息内容的元素
      'div[class*="message"]',
      'div[class*="chat"]'
    ];

    // 打印当前页面的关键元素，帮助调试
    console.log('Document body:', document.body);
    console.log('Main content:', document.querySelector('main'));
    console.log('Chat container:', document.querySelector('[role="main"]'));

    // 遍历所有可能的选择器
    let messages = [];
    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        // 打印找到的元素，帮助调试
        elements.forEach((el, i) => {
          console.log(`Element ${i + 1}:`, el);
          console.log(`Element ${i + 1} HTML:`, el.outerHTML);
        });
        messages = elements;
        break;
      }
    }

    if (messages.length === 0) {
      console.log('No messages found with any selector');
      // 尝试遍历并打印所有可能包含消息的元素
      this.debugPrintMessageCandidates();
      return;
    }

    messages.forEach((message, index) => {
      console.log(`Processing message ${index + 1}:`, message);
      this.addCheckboxToMessage(message);
    });
  }

  // 新增：调试方法，用于打印可能包含消息的元素
  debugPrintMessageCandidates() {
    console.log('Debugging potential message containers...');
    
    // 打印所有 div 元素及其类名
    const allDivs = document.querySelectorAll('div');
    console.log('All divs on page:', allDivs.length);
    
    allDivs.forEach((div, index) => {
      const classes = div.className;
      const role = div.getAttribute('role');
      const dataAttrs = Array.from(div.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ');
      
      if (classes || role || dataAttrs) {
        console.log(`Div ${index}:`, {
          element: div,
          classes,
          role,
          dataAttrs,
          text: div.textContent.slice(0, 100) // 只打印前100个字符
        });
      }
    });
  }

  addCheckboxToMessage(message) {
    console.log('Adding checkbox to message:', message);
    
    // 检查是否已经有checkbox
    if (message.querySelector('.claude-export-checkbox')) {
      console.log('Checkbox already exists, skipping');
      return;
    }

    // 创建checkbox容器
    const container = document.createElement('div');
    container.className = 'claude-export-checkbox-wrapper';
    container.innerHTML = `
      <input type="checkbox" class="claude-export-checkbox" />
    `;

    try {
      // 确保消息容器有正确的定位
      message.style.position = 'relative';
      
      // 在消息容器的最前面插入复选框
      message.insertBefore(container, message.firstChild);
      
      // 确保样式正确应用
      Object.assign(container.style, {
        position: 'absolute',
        left: '-30px',
        top: '10px',
        zIndex: '10000',
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      });

      console.log('Successfully added checkbox');
    } catch (error) {
      console.error('Failed to add checkbox:', error);
    }
  }

  setupMessageObserver() {
    console.log('Setting up message observer');
    
    // 观察整个文档的变化
    const observer = new MutationObserver((mutations) => {
      let shouldAddCheckboxes = false;
      
      mutations.forEach(mutation => {
        // 检查是否有新的消息元素被添加
        if (mutation.addedNodes.length > 0) {
          shouldAddCheckboxes = true;
        }
      });

      // 如果检测到新消息，重新添加复选框
      if (shouldAddCheckboxes) {
        console.log('New content detected, updating checkboxes...');
        this.addCheckboxesToMessages();
      }
    });

    // 观察整个文档
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // 获取选中的消息
  getSelectedMessages() {
    console.log('Getting selected messages...');
    const checkboxes = document.querySelectorAll('.claude-export-checkbox:checked');
    console.log('Found checked checkboxes:', checkboxes.length);

    return Array.from(checkboxes).map((checkbox, index) => {
      const messageContainer = checkbox.closest('[data-message-author-role]');
      console.log(`Processing selected message ${index + 1}:`, messageContainer);

      const role = messageContainer?.getAttribute('data-message-author-role') || 'unknown';
      console.log('Message role:', role);

      const contentElement = messageContainer?.querySelector('.prose');
      console.log('Content element:', contentElement);

      const content = contentElement ? contentElement.textContent.trim() : '';
      console.log('Message content length:', content.length);

      return { role, content };
    });
  }

  // 复制到剪贴板
  async copyToClipboard() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板 | Copied to clipboard');
    } catch (err) {
      alert('复制失败 | Copy failed');
      console.error(err);
    }
  }

  // 导出为TXT
  exportAsTxt() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `${msg.role}:\n${msg.content}`)
      .join('\n\n---\n\n');

    this.downloadFile(text, 'claude-conversation.txt', 'text/plain');
  }

  // 导出为Markdown
  exportAsMarkdown() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `### ${msg.role}\n\n${msg.content}`)
      .join('\n\n---\n\n');

    this.downloadFile(text, 'claude-conversation.md', 'text/markdown');
  }

  // 通用下载文件方法
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// 初始化
const initializeExporter = async () => {
  try {
    console.log('Starting Claude Exporter initialization...');
    new ClaudeExporter();
  } catch (error) {
    console.error('Failed to initialize Claude Exporter:', error);
  }
};

// 确保在页面加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExporter);
} else {
  initializeExporter();
} 