class ClaudeExporter {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await this.waitForPageLoad();
      await this.waitForChatInterface();
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
    const selectors = ['.w-full.h-full.relative', '[role="main"]', '#__next'];
    for (const selector of selectors) {
      const container = await this.waitForElement(selector);
      if (container) return container;
    }
    throw new Error('Chat container not found');
  }

  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((_, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  setupControls() {
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
    
    const container = document.querySelector('.w-full.h-full.relative') || document.body;
    container.appendChild(controlsDiv);
  }

  setupExportPanel() {
    const exportDiv = document.createElement('div');
    exportDiv.className = 'claude-export-float';

    const buttons = [
      { text: '复制到剪贴板 | Copy', handler: () => this.copyToClipboard() },
      { text: '导出为TXT | Export TXT', handler: () => this.exportAsTxt() },
      { text: '导出为MD | Export MD', handler: () => this.exportAsMarkdown() }
    ];

    buttons.forEach(({ text, handler }) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.className = 'claude-export-button';
      button.addEventListener('click', handler);
      exportDiv.appendChild(button);
    });

    const container = document.querySelector('.w-full.h-full.relative') || document.body;
    container.appendChild(exportDiv);
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

  setupMessageObserver() {
    const chatContainer = document.querySelector('.w-full.h-full.relative') || 
                         document.querySelector('[role="main"]');
    
    if (!chatContainer) return;

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

    observer.observe(chatContainer, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
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
    
    const extractText = (node) => {
      if (!node) return;

      if (node.classList?.contains('claude-export-checkbox')) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text && text.trim()) textParts.push(text);
      } 
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const ignoreElements = ['SELECT', 'OPTION', 'BUTTON', 'INPUT'];
        if (ignoreElements.includes(node.tagName)) {
          return;
        }

        if (node.tagName === 'PRE' || node.tagName === 'CODE') {
          textParts.push('\n```\n' + node.textContent + '\n```\n');
          return;
        }
        
        if (node.tagName === 'LI') {
          textParts.push('\n• ');
        }
        
        node.childNodes.forEach(child => extractText(child));
      }
    };

    try {
      extractText(element);
    } catch (e) {
      console.error('Error extracting text:', e);
    }
    
    return textParts
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
  }

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
      console.error('Failed to copy to clipboard:', err);
      alert('复制失败 | Copy failed');
    }
  }

  exportAsTxt() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `${msg.role === 'assistant' ? 'Claude' : 'Human'}:\n${msg.content}`)
      .join('\n\n---\n\n');

    this.downloadFile(text, 'claude-conversation.txt', 'text/plain');
  }

  exportAsMarkdown() {
    const messages = this.getSelectedMessages();
    if (messages.length === 0) {
      alert('请先选择要导出的消息 | Please select messages to export');
      return;
    }

    const text = messages
      .map(msg => `### ${msg.role === 'assistant' ? 'Claude' : 'Human'}\n\n${msg.content}`)
      .join('\n\n---\n\n');

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