class ClaudeExporter {
  constructor() {
    this.init();
  }

  init() {
    this.addCheckboxes();
    this.createControls();
    this.createExportFloat();
  }

  addCheckboxes() {
    // 获取所有对话消息
    const messages = document.querySelectorAll('.prose'); // 需要根据实际DOM结构调整选择器
    
    messages.forEach(message => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'claude-export-checkbox';
      message.style.position = 'relative';
      message.insertBefore(checkbox, message.firstChild);
    });
  }

  createControls() {
    const controls = document.createElement('div');
    controls.className = 'claude-export-controls';
    
    const selectAll = document.createElement('button');
    selectAll.className = 'claude-export-button';
    selectAll.textContent = 'Select All';
    selectAll.onclick = () => this.selectAllMessages(true);
    
    const deselectAll = document.createElement('button');
    deselectAll.className = 'claude-export-button';
    deselectAll.textContent = 'Deselect All';
    deselectAll.onclick = () => this.selectAllMessages(false);
    
    controls.appendChild(selectAll);
    controls.appendChild(deselectAll);
    document.body.appendChild(controls);
  }

  createExportFloat() {
    const floatContainer = document.createElement('div');
    floatContainer.className = 'claude-export-float';

    const exportOptions = [
      { text: '复制到剪贴板 | Copy', handler: () => this.copyToClipboard() },
      { text: '导出为TXT | Export TXT', handler: () => this.exportAsTxt() },
      { text: '导出为MD | Export MD', handler: () => this.exportAsMarkdown() }
    ];

    exportOptions.forEach(option => {
      const button = document.createElement('button');
      button.className = 'claude-export-button';
      button.textContent = option.text;
      button.onclick = option.handler;
      floatContainer.appendChild(button);
    });

    document.body.appendChild(floatContainer);
  }

  selectAllMessages(select) {
    const checkboxes = document.querySelectorAll('.claude-export-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = select;
    });
  }

  // 获取选中的消息
  getSelectedMessages() {
    const checkboxes = document.querySelectorAll('.claude-export-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => {
      const messageContainer = checkbox.closest('.prose');
      const role = messageContainer.closest('[data-message-author-role]')
        ?.getAttribute('data-message-author-role') || 'unknown';
      const content = messageContainer.textContent.trim();
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

// 初始化导出器
new ClaudeExporter(); 