class ClaudeExporter {
  static instance = null;

  constructor() {
    if (ClaudeExporter.instance) {
      return ClaudeExporter.instance;
    }
    
    ClaudeExporter.instance = this;
    this.observer = null;
    this.init();
    this.setupUrlChangeListener();
  }

  setupUrlChangeListener() {
    let lastUrl = location.href;
    
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('URL changed, reinitializing...');
        
        this.cleanup();
        
        if (location.href.includes('/chat/')) {
          setTimeout(() => this.init(), 500);
        }
      }
    });

    this.observer.observe(document, {
      subtree: true,
      childList: true
    });
  }

  cleanup() {
    const oldPanel = document.querySelector('.claude-export-float');
    if (oldPanel) {
      oldPanel.remove();
    }

    document.querySelectorAll('.claude-export-checkbox').forEach(checkbox => {
      checkbox.remove();
    });
  }

  init() {
    this.cleanup();
    this.initControlPanel();
    this.addCheckboxesToMessages();
    this.observeNewMessages();
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
    
    const messages = element.querySelectorAll('.font-user-message, .font-claude-message');
    
    messages.forEach(message => {
      if (message.getAttribute('contenteditable') === 'true') {
        return;
      }

      if (message.classList.contains('font-user-message')) {        
        let content = message.textContent
          .replace(/\s*Edit\s*$/, '')
          .trim();
        
        textParts.push(content);
      }
      else {
        let content = message.textContent
          .replace(/\s*(Copy|Retry)\s*$/, '')
          .trim();

        content = content
          .replace(/:\s*/g, ': ')
          .replace(/Click to open image/g, 'Click to open image\n')
          .replace(/(?:^|\n)([^•\n]+)(?=\n|$)/g, (match, line) => {
            if (line.match(/^(Smart|Export|Quick|Modern|Smooth)/)) {
              return `\n• ${line}`;
            }
            return match;
          })
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
    const controlPanel = document.querySelector('.claude-export-float');
    
    if (!controlPanel || controlPanel.classList.contains('collapsed')) {
        return;
    }

    const isControlPanel = event.target.closest('.claude-export-float');
    const isCheckbox = event.target.closest('.claude-export-checkbox');
    const isMessage = event.target.closest('.group.relative');
    const isControlButton = event.target.closest('.claude-export-button');

    if (isControlPanel || isCheckbox || isMessage || isControlButton) {
        return;
    }

    controlPanel.classList.add('collapsed');
}); 