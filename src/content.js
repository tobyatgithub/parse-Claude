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
    
    if (message.querySelector('.claude-export-checkbox')) {
      console.log('Checkbox already exists, skipping');
      return;
    }

    // 创建checkbox容器
    const container = document.createElement('div');
    container.className = 'claude-export-checkbox-wrapper';
    
    // 创建checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'claude-export-checkbox';
    
    // 添加数据属性以便追踪
    const isUserMessage = message.classList.contains('font-user-message');
    checkbox.setAttribute('data-message-role', isUserMessage ? 'user' : 'assistant');
    
    container.appendChild(checkbox);

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

      console.log('Successfully added checkbox with role:', checkbox.getAttribute('data-message-role'));
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
      // 首先尝试从 checkbox 的数据属性获取角色
      let role = checkbox.getAttribute('data-message-role');
      console.log('Role from checkbox:', role);

      // 从 checkbox 开始向上查找消息容器
      const messageContainer = checkbox.closest('.font-user-message, .font-claude-message') || 
                             checkbox.closest('div[data-message-author-role]');
      
      console.log(`Processing selected message ${index + 1}:`, messageContainer);

      if (!messageContainer) {
        console.log('Message container not found, trying alternative method...');
        const wrapper = checkbox.closest('.claude-export-checkbox-wrapper');
        const parentMessage = wrapper?.parentElement;
        console.log('Parent message:', parentMessage);
        
        if (parentMessage) {
          // 获取所有文本节点，包括子元素中的文本
          const content = this.getAllTextContent(parentMessage);
          // 确定角色
          role = this.determineMessageRole(parentMessage);
          return { role, content };
        }
      }

      // 如果还没有确定角色，尝试从消息容器确定
      if (!role || role === 'unknown') {
        role = this.determineMessageRole(messageContainer);
      }

      // 获取所有文本内容，保持格式
      const content = this.getAllTextContent(messageContainer);
      console.log('Message role:', role);
      console.log('Message content:', content ? content.substring(0, 100) + '...' : 'No content found');
      
      return { role, content };
    });
  }

  // 新增：确定消息角色的方法
  determineMessageRole(element) {
    if (!element) return 'unknown';

    // 检查各种可能的角色标识
    if (element.classList.contains('font-user-message')) return 'user';
    if (element.classList.contains('font-claude-message')) return 'assistant';
    
    const authorRole = element.getAttribute('data-message-author-role');
    if (authorRole) return authorRole;

    // 检查父元素
    const parent = element.parentElement;
    if (parent) {
      if (parent.classList.contains('font-user-message')) return 'user';
      if (parent.classList.contains('font-claude-message')) return 'assistant';
    }

    return 'unknown';
  }

  // 新增：获取元素的所有文本内容的方法
  getAllTextContent(element) {
    if (!element) return '';

    let textParts = [];
    
    const extractText = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) textParts.push(text);
      } 
      else if (node.nodeType === Node.ELEMENT_NODE) {
        // 处理代码块
        if (node.tagName === 'PRE' || node.tagName === 'CODE') {
          textParts.push('\n```\n' + node.textContent + '\n```\n');
          return; // 不再处理代码块的子节点
        }
        
        // 处理列表项
        if (node.tagName === 'LI') {
          textParts.push('\n• ');
        }
        
        // 处理段落和其他块级元素
        if (window.getComputedStyle(node).display === 'block') {
          if (textParts.length > 0 && !textParts[textParts.length - 1].endsWith('\n')) {
            textParts.push('\n');
          }
        }

        // 处理子节点
        node.childNodes.forEach(child => extractText(child));

        // 块级元素后添加换行
        if (window.getComputedStyle(node).display === 'block') {
          textParts.push('\n');
        }
      }
    };

    extractText(element);
    
    // 合并文本并清理格式
    return textParts
      .join('')
      .replace(/\n{3,}/g, '\n\n') // 将多个换行减少为最多两个
      .replace(/\s+\n/g, '\n') // 清理行尾空白
      .replace(/\n\s+/g, '\n') // 清理行首空白
      .trim();
  }

  // 复制到剪贴板
  async copyToClipboard() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `${msg.role === 'assistant' ? 'Claude' : 'Human'}: ${msg.content}`)
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