// Real-time Chat Manager
class ChatManager {
  constructor() {
    this.socket = null;
    this.currentChatUserId = null;
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.currentUserId = localStorage.getItem('userId') || (user && (user.id || user._id));
    this.conversations = [];
    this.typingTimeout = null;
  }

  // Initialize Socket.IO
  init() {
    const token = localStorage.getItem('authToken');
    if (!this.currentUserId || !token) return;

    this.socket = io({ auth: { token } });
    
    this.socket.emit('user-connected');
    
    this.setupSocketListeners();
  }

  // Setup socket event listeners
  setupSocketListeners() {
    // Receive messages
    this.socket.on('receive-message', (message) => {
      this.handleNewMessage(message);
    });

    // Message sent confirmation
    this.socket.on('message-sent', (message) => {
      this.addMessageToChat(message, true);
    });

    // Typing indicators
    this.socket.on('user-typing', ({ from }) => {
      if (from === this.currentChatUserId) {
        this.showTypingIndicator();
      }
    });

    this.socket.on('user-stop-typing', ({ from }) => {
      if (from === this.currentChatUserId) {
        this.hideTypingIndicator();
      }
    });

    // User status updates
    this.socket.on('user-status', ({ userId, online }) => {
      this.updateUserStatus(userId, online ? 'online' : 'offline');
    });
    this.socket.on('message-error', ({ message }) => showAppMessage(message || 'Message could not be sent.', { type: 'error' }));
  }

  // Load conversations
  async loadConversations() {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load conversations');

      this.conversations = await response.json();
      this.displayConversations();
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  // Display conversations list
  displayConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;

    if (this.conversations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>💬 No conversations yet</p>
          <p class="text-muted">Start chatting with sellers!</p>
        </div>
      `;
      return;
    }

    container.replaceChildren();
    this.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = `conversation-item ${conv.user._id === this.currentChatUserId ? 'active' : ''}`;
      item.addEventListener('click', () => this.openChat(conv.user._id, conv.user.name));
      const avatar = document.createElement('div');
      avatar.className = 'conversation-avatar';
      avatar.textContent = (conv.user.name || '?').charAt(0).toUpperCase();
      const info = document.createElement('div');
      info.className = 'conversation-info';
      const name = document.createElement('h4');
      name.textContent = conv.user.name || 'Farmer';
      const preview = document.createElement('p');
      preview.className = 'conversation-preview';
      preview.textContent = conv.lastMessage?.text || 'No messages yet';
      info.append(name, preview);
      item.append(avatar, info);
      if (conv.unreadCount > 0) {
        const unread = document.createElement('span');
        unread.className = 'unread-badge';
        unread.textContent = String(conv.unreadCount);
        item.appendChild(unread);
      }
      const status = document.createElement('span');
      status.className = `user-status ${conv.user.online ? 'online' : 'offline'}`;
      status.id = `status-${conv.user._id}`;
      item.appendChild(status);
      container.appendChild(item);
    });
  }

  // Open chat with user
  async openChat(userId, userName) {
    this.currentChatUserId = userId;
    
    // Update UI
    document.getElementById('chatUserName').textContent = userName;
    document.getElementById('chatWindow').style.display = 'flex';
    
    // Load message history
    await this.loadMessages(userId);
    
    // Update active conversation
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    event?.currentTarget?.classList.add('active');
  }

  // Load messages
  async loadMessages(userId) {
    try {
      const response = await fetch(`/api/messages/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const messages = await response.json();
      this.displayMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  // Display messages
  displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    container.replaceChildren();
    messages.forEach(msg => {
      const message = document.createElement('div');
      message.className = `message ${msg.sender._id === this.currentUserId ? 'sent' : 'received'}`;
      const content = document.createElement('div');
      content.className = 'message-content';
      const text = document.createElement('p');
      text.textContent = msg.text || msg.content || '';
      const time = document.createElement('span');
      time.className = 'message-time';
      time.textContent = new Date(msg.createdAt).toLocaleTimeString();
      content.append(text, time);
      message.appendChild(content);
      container.appendChild(message);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Send message
  sendMessage(event) {
    event?.preventDefault();
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !this.currentChatUserId) return;

    this.socket.emit('send-message', {
      to: this.currentChatUserId,
      message
    });

    input.value = '';
    this.stopTyping();
  }

  // Handle new message
  handleNewMessage(message) {
    // Add to chat if currently viewing this conversation
    if (message.sender._id === this.currentChatUserId) {
      this.addMessageToChat(message, false);
    } else {
      // Show notification
      this.showMessageNotification(message);
    }
    
    // Update conversations list
    this.loadConversations();
  }

  // Add message to chat
  addMessageToChat(message, isSent) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
    `;

    const content = document.createElement('div');
    content.className = 'message-content';
    const text = document.createElement('p');
    text.textContent = message.text || message.content || '';
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date(message.createdAt).toLocaleTimeString();
    content.append(text, time);
    messageDiv.appendChild(content);

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Typing indicator
  handleTyping() {
    if (!this.currentChatUserId) return;

    this.socket.emit('typing', { to: this.currentChatUserId });

    // Auto-stop typing after 3 seconds
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  stopTyping() {
    if (!this.currentChatUserId) return;
    this.socket.emit('stop-typing', { to: this.currentChatUserId });
  }

  showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'block';
      indicator.textContent = 'typing...';
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Update user status
  updateUserStatus(userId, status) {
    const statusEl = document.getElementById(`status-${userId}`);
    if (statusEl) {
      statusEl.className = `user-status ${status}`;
    }
  }

  // Show message notification
  showMessageNotification(message) {
    showNotification('You received a new message.', 'info');
    
    // Update badge
    const badge = document.getElementById('messagesBadge');
    if (badge) {
      const count = parseInt(badge.textContent || '0') + 1;
      badge.textContent = count;
      badge.style.display = 'inline-block';
    }
  }

  // Close chat window
  closeChat() {
    document.getElementById('chatWindow').style.display = 'none';
    this.currentChatUserId = null;
  }
}

// Global instance
const chatManager = new ChatManager();
window.chatManager = chatManager;

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('authToken')) {
      chatManager.init();
    }
  });
} else {
  if (localStorage.getItem('authToken')) {
    chatManager.init();
  }
}
