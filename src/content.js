class ClaudeExporter {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.waitForPageLoad();
      await this.waitForChatContent();
      this.setupControls();
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

  waitForChatContent() {
    return new Promise((resolve) => {
      const checkContent = () => {
        const messages = document.querySelectorAll('.font-user-message, .font-claude-message, [data-message-author-role]');
        if (messages.length > 0) {
          resolve();
          return;
        }
        setTimeout(checkContent, 100);
      };
      checkContent();
    });
  }

  setupMessageObserver() {
    const observer = new MutationObserver((mutations) => {
      const hasNewMessages = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return false;
          return node.classList?.contains('font-user-message') ||
                 node.classList?.contains('font-claude-message') ||
                 node.hasAttribute('data-message-author-role');
        });
      });

      if (hasNewMessages) {
        this.addCheckboxesToMessages();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  setupControls() {
    const exportDiv = document.createElement('div');
    exportDiv.className = 'claude-export-float collapsed';

    const toggleButton = document.createElement('button');
    toggleButton.className = 'claude-export-toggle';
    toggleButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 5l7 7-7 7"/>
      </svg>
    `;
    toggleButton.addEventListener('click', () => {
      exportDiv.classList.toggle('collapsed');
    });
    exportDiv.appendChild(toggleButton);

    const selectButtons = [
      { text: 'Select All', handler: () => this.selectAllMessages(true) },
      { text: 'Deselect All', handler: () => this.selectAllMessages(false) }
    ];

    const contentDiv = document.createElement('div');
    contentDiv.className = 'claude-export-content';

    selectButtons.forEach(({ text, handler }) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.className = 'claude-export-button';
      button.addEventListener('click', handler);
      contentDiv.appendChild(button);
    });

    const divider = document.createElement('div');
    divider.className = 'claude-export-divider';
    contentDiv.appendChild(divider);

    const exportButtons = [
      { text: '复制到剪贴板 | Copy', handler: () => this.copyToClipboard() },
      { text: '导出为TXT | Export TXT', handler: () => this.exportAsTxt() },
      { text: '导出为MD | Export MD', handler: () => this.exportAsMarkdown() }
    ];

    exportButtons.forEach(({ text, handler }) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.className = 'claude-export-button';
      button.addEventListener('click', handler);
      contentDiv.appendChild(button);
    });

    exportDiv.appendChild(contentDiv);
    document.body.appendChild(exportDiv);
  }

  selectAllMessages(select) {
    const checkboxes = document.querySelectorAll('.claude-export-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = select);
  }

  addCheckboxesToMessages() {
    const messages = document.querySelectorAll(
      '.font-user-message:not([contenteditable="true"]), .font-claude-message, [data-message-author-role]'
    );
    messages.forEach(message => this.addCheckboxToMessage(message));
  }

  addCheckboxToMessage(message) {
    if (message.querySelector('.claude-export-checkbox')) return;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'claude-export-checkbox';
    
    let targetContainer;
    if (message.classList.contains('font-user-message')) {
      targetContainer = message.closest('.group.relative.inline-flex') || message;
    } else {
      targetContainer = message.closest('.group.relative.pt-3\\.5') || message;
    }
    
    const isUserMessage = message.classList.contains('font-user-message');
    checkbox.setAttribute('data-message-role', isUserMessage ? 'user' : 'assistant');

    try {
      targetContainer.style.position = 'relative';
      targetContainer.insertBefore(checkbox, targetContainer.firstChild);
    } catch (error) {
      console.error('Failed to add checkbox:', error);
    }
  }

  getSelectedMessages() {
    const checkboxes = document.querySelectorAll('.claude-export-checkbox:checked');
    return Array.from(checkboxes)
      .map(checkbox => {
        const role = checkbox.getAttribute('data-message-role');
        
        const selector = role === 'assistant' 
          ? '.group.relative.pt-3\\.5'
          : '.group.relative.inline-flex';
        
        const messageContainer = checkbox.closest(selector);
        if (!messageContainer) return null;

        const content = this.getAllTextContent(messageContainer);
        if (!content) return null;

        return { role, content };
      })
      .filter(Boolean);
  }

  determineMessageRole(element) {
    if (!element) return 'unknown';
    if (element.classList.contains('font-user-message')) return 'user';
    if (element.classList.contains('font-claude-message')) return 'assistant';
    const authorRole = element.getAttribute('data-message-author-role');
    if (authorRole) return authorRole;
    const parent = element.parentElement;
    if (parent?.classList.contains('font-user-message')) return 'user';
    if (parent?.classList.contains('font-claude-message')) return 'assistant';
    return 'unknown';
  }

  getAllTextContent(element) {
    if (!element) return '';
    let textParts = [];
    
    // 获取所有消息元素
    const messages = element.querySelectorAll('.font-user-message, .font-claude-message');
    
    messages.forEach(message => {
      // 跳过编辑框
      if (message.getAttribute('contenteditable') === 'true') {
        return;
      }

      // 处理用户消息
      if (message.classList.contains('font-user-message')) {        
        // 获取消息内容
        let content = message.textContent
          // 移除所有可能的前缀格式
          .replace(/\s*Edit\s*$/, '')
          .trim();
        
        textParts.push(content);
      }
      // 处理 Claude 消息
      else {
        let content = message.textContent
          .replace(/\s*(Copy|Retry)\s*$/, '')  // 移除末尾的 Copy/Retry
          .trim();

        // 格式化内容
        content = content
          // 确保冒号后有一个空格
          .replace(/:\s*/g, ': ')
          // 处理列表项
          .replace(/(?:^|\n)([^•\n]+)(?=\n|$)/g, (match, line) => {
            if (line.match(/^(Smart|Export|Quick|Modern|Smooth)/)) {
              return `\n• ${line}`;
            }
            return match;
          })
          // 移除多余的换行
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        textParts.push(content);
      }
    });

    return textParts
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  showToast(message, duration = 2000) {
    const existingToast = document.querySelector('.claude-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'claude-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  async copyToClipboard() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      this.showToast('请先选择要导出的消息 | Please select messages');
      return;
    }

    const text = messages
      .map(msg => `${msg.role === 'assistant' ? 'Claude' : 'Human'}: ${msg.content}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('已复制到剪贴板 | Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      this.showToast('复制失败 | Copy failed');
    }
  }

  exportAsTxt() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      this.showToast('请先选择要导出的消息 | Please select messages');
      return;
    }

    const text = messages
      .map(msg => `${msg.role === 'assistant' ? 'Claude' : 'Human'}:\n${msg.content}`)
      .join('\n\n---\n\n');

    this.showToast('正在导出TXT | Exporting TXT...');
    this.downloadFile(text, 'claude-conversation.txt', 'text/plain');
  }

  exportAsMarkdown() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      this.showToast('请先选择要导出的消息 | Please select messages');
      return;
    }

    const text = messages
      .map(msg => `### ${msg.role === 'assistant' ? 'Claude' : 'Human'}\n\n${msg.content}`)
      .join('\n\n---\n\n');

    this.showToast('正在导出MD | Exporting MD...');
    this.downloadFile(text, 'claude-conversation.md', 'text/markdown');
  }

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ClaudeExporter());
} else {
  new ClaudeExporter();
}

document.addEventListener('click', function(event) {
    // 获取控制面板元素 - 修正类名
    const controlPanel = document.querySelector('.claude-export-float');
    
    // 如果面板不存在或者已经是收起状态，直接返回
    if (!controlPanel || controlPanel.classList.contains('collapsed')) {
        return;
    }

    // 检查点击的元素是否在以下情况之一：
    // 1. 点击的是控制面板本身
    // 2. 点击的是复选框
    // 3. 点击的是对话消息
    // 4. 点击的是控制面板内的按钮
    const isControlPanel = event.target.closest('.claude-export-float');
    const isCheckbox = event.target.closest('.claude-export-checkbox');
    const isMessage = event.target.closest('.group.relative');
    const isControlButton = event.target.closest('.claude-export-button');

    // 如果点击的是上述元素之一，不收起面板
    if (isControlPanel || isCheckbox || isMessage || isControlButton) {
        return;
    }

    // 其他情况，收起面板
    // console.log('收起面板');
    controlPanel.classList.add('collapsed');
}); 