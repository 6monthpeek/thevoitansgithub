/**
 * MongoDB Logger for Discord Bot
 * - Queues logs and sends them in batches
 * - Uses HMAC signature for security
 * - Handles retries and backoff
 */

const crypto = require('crypto');

class MongoDBLogger {
  constructor() {
    this.queue = [];
    this.batchSize = 10;
    this.batchTimeout = 500; // 500ms
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1s
    this.isProcessing = false;
    this.ingestUrl = process.env.LOG_INGEST_URL;
    this.ingestSecret = process.env.LOG_INGEST_SECRET;
    
    if (!this.ingestUrl || !this.ingestSecret) {
      console.warn('⚠️ MongoDB Logger: LOG_INGEST_URL or LOG_INGEST_SECRET not configured');
      return;
    }

    // Start batch processing
    this.startBatchProcessor();
  }

  // Log event to queue
  log(event, data = {}) {
    if (!this.ingestUrl || !this.ingestSecret) {
      return; // Silently fail if not configured
    }

    const logEntry = {
      event,
      ts: new Date().toISOString(),
      guildId: data.guildId || null,
      userId: data.userId || null,
      channelId: data.channelId || null,
      severity: data.severity || 0,
      source: 'bot',
      payload: data.payload || data
    };

    this.queue.push(logEntry);

    // Process immediately if queue is full
    if (this.queue.length >= this.batchSize) {
      this.processBatch();
    }
  }

  // Start batch processor
  startBatchProcessor() {
    setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  // Process batch of logs
  async processBatch() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      await this.sendBatch(batch);
    } catch (error) {
      console.error('❌ MongoDB Logger batch error:', error.message);
      
      // Re-queue failed logs (with retry limit)
      batch.forEach(log => {
        if (!log.retryCount) log.retryCount = 0;
        if (log.retryCount < this.retryAttempts) {
          log.retryCount++;
          this.queue.unshift(log); // Add back to front
        }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  // Send batch to ingest endpoint
  async sendBatch(batch) {
    const body = JSON.stringify(batch);
    const signature = this.createSignature(body);

    const response = await fetch(this.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`API error: ${result.error || 'Unknown error'}`);
    }

    console.log(`✅ MongoDB Logger: Sent ${batch.length} logs`);
  }

  // Create HMAC signature
  createSignature(body) {
    return crypto
      .createHmac('sha256', this.ingestSecret)
      .update(body)
      .digest('hex');
  }

  // Convenience methods for common events
  messageCreate(message) {
    this.log('messageCreate', {
      guildId: message.guild?.id,
      userId: message.author?.id,
      channelId: message.channel?.id,
      payload: {
        content: message.content?.substring(0, 500), // Limit content length
        author: {
          id: message.author?.id,
          username: message.author?.username,
          globalName: message.author?.globalName
        },
        channel: {
          id: message.channel?.id,
          name: message.channel?.name
        }
      }
    });
  }

  messageUpdate(oldMessage, newMessage) {
    this.log('messageUpdate', {
      guildId: newMessage.guild?.id,
      userId: newMessage.author?.id,
      channelId: newMessage.channel?.id,
      payload: {
        oldContent: oldMessage.content?.substring(0, 500),
        newContent: newMessage.content?.substring(0, 500),
        author: {
          id: newMessage.author?.id,
          username: newMessage.author?.username
        }
      }
    });
  }

  messageDelete(message) {
    this.log('messageDelete', {
      guildId: message.guild?.id,
      userId: message.author?.id,
      channelId: message.channel?.id,
      payload: {
        content: message.content?.substring(0, 500),
        author: {
          id: message.author?.id,
          username: message.author?.username
        }
      }
    });
  }

  interactionCreate(interaction) {
    this.log('interactionCreate', {
      guildId: interaction.guild?.id,
      userId: interaction.user?.id,
      channelId: interaction.channel?.id,
      payload: {
        type: interaction.type,
        commandName: interaction.commandName,
        user: {
          id: interaction.user?.id,
          username: interaction.user?.username
        }
      }
    });
  }

  guildMemberAdd(member) {
    this.log('guildMemberAdd', {
      guildId: member.guild?.id,
      userId: member.user?.id,
      payload: {
        user: {
          id: member.user?.id,
          username: member.user?.username,
          globalName: member.user?.globalName
        },
        joinedAt: member.joinedAt?.toISOString()
      }
    });
  }

  guildMemberRemove(member) {
    this.log('guildMemberRemove', {
      guildId: member.guild?.id,
      userId: member.user?.id,
      payload: {
        user: {
          id: member.user?.id,
          username: member.user?.username,
          globalName: member.user?.globalName
        },
        leftAt: new Date().toISOString()
      }
    });
  }
}

// Singleton instance
const logger = new MongoDBLogger();

module.exports = logger;
