/**
 * VOITANS Bot Database Manager
 * SQLite tabanlı kullanıcı hafıza sistemi
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class UserDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'users.db');
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Database dosyası yoksa oluştur
        if (!fs.existsSync(this.dbPath)) {
          console.log('[DB] Database dosyası oluşturuluyor...');
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('[DB] Database bağlantı hatası:', err);
            reject(err);
            return;
          }

          // PRAGMA ayarları
          this.db.run('PRAGMA journal_mode = WAL');
          this.db.run('PRAGMA synchronous = NORMAL');
          this.db.run('PRAGMA cache_size = 10000');
          this.db.run('PRAGMA temp_store = MEMORY');
          this.db.run('PRAGMA foreign_keys = ON');

          this.createTables()
            .then(() => {
              console.log('[DB] Database başarıyla başlatıldı');
              resolve();
            })
            .catch(reject);
        });
      } catch (error) {
        console.error('[DB] Database başlatma hatası:', error);
        reject(error);
      }
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const tables = [
        // Users tablosu - kullanıcı temel bilgileri
        `CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          nickname TEXT,
          roles TEXT DEFAULT '[]',
          join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          message_count INTEGER DEFAULT 0,
          reputation INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Conversations tablosu - konuşma geçmişi
        `CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          message_content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          context_summary TEXT,
          message_type TEXT DEFAULT 'chat'
        )`,
        
        // User profiles tablosu - detaylı kullanıcı profilleri
        `CREATE TABLE IF NOT EXISTS user_profiles (
          user_id TEXT PRIMARY KEY,
          bio TEXT,
          interests TEXT DEFAULT '[]',
          skills TEXT DEFAULT '[]',
          favorite_topics TEXT DEFAULT '[]',
          last_activity TEXT,
          activity_score INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)`,
        `CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)`,
        `CREATE INDEX IF NOT EXISTS idx_users_message_count ON users(message_count)`
      ];

      let completed = 0;
      const total = tables.length;

      tables.forEach((sql, index) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error(`[DB] Tablo oluşturma hatası (${index}):`, err);
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total) {
            console.log('[DB] Tablolar oluşturuldu');
            resolve();
          }
        });
      });
    });
  }

  // Kullanıcı işlemleri
  async createOrUpdateUser(discordId, username, nickname = null, roles = []) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (discord_id, username, nickname, roles, updated_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(discord_id) DO UPDATE SET
          username = excluded.username,
          nickname = excluded.nickname,
          roles = excluded.roles,
          updated_at = CURRENT_TIMESTAMP
      `;

      this.db.run(sql, [discordId, username, nickname, JSON.stringify(roles)], function(err) {
        if (err) {
          console.error('[DB] createOrUpdateUser hatası:', err);
          reject(err);
          return;
        }
        
        // Profile tablosunda da kayıt oluştur
        this.createUserProfile(discordId).then(() => {
          resolve({ lastID: this.lastID, changes: this.changes });
        }).catch(reject);
      }.bind(this));
    });
  }

  async getUserProfile(discordId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.*, up.* 
        FROM users u 
        LEFT JOIN user_profiles up ON u.discord_id = up.user_id 
        WHERE u.discord_id = ?
      `;
      
      this.db.get(sql, [discordId], (err, user) => {
        if (err) {
          console.error('[DB] getUserProfile hatası:', err);
          reject(err);
          return;
        }
        
        if (user) {
          // JSON string'leri parse et
          user.roles = JSON.parse(user.roles || '[]');
          user.interests = JSON.parse(user.interests || '[]');
          user.skills = JSON.parse(user.skills || '[]');
          user.favorite_topics = JSON.parse(user.favorite_topics || '[]');
        }
        
        resolve(user);
      });
    });
  }

  async updateUserActivity(discordId, activity = 'message') {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users 
        SET last_seen = CURRENT_TIMESTAMP,
            message_count = message_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE discord_id = ?
      `;
      
      this.db.run(sql, [discordId], function(err) {
        if (err) {
          console.error('[DB] updateUserActivity hatası:', err);
          reject(err);
          return;
        }
        
        // Profile'da da activity_score'u güncelle
        if (activity === 'message') {
          const profileSql = `
            UPDATE user_profiles 
            SET activity_score = activity_score + 1,
                last_activity = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
          `;
          this.db.run(profileSql, [discordId]);
        }
        
        resolve({ changes: this.changes });
      }.bind(this));
    });
  }

  async saveConversation(userId, channelId, content, contextSummary = null, messageType = 'chat') {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO conversations (user_id, channel_id, message_content, context_summary, message_type)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [userId, channelId, content, contextSummary, messageType], function(err) {
        if (err) {
          console.error('[DB] saveConversation hatası:', err);
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID });
      });
    });
  }

  async getRecentConversations(userId, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM conversations 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [userId, limit], (err, conversations) => {
        if (err) {
          console.error('[DB] getRecentConversations hatası:', err);
          reject(err);
          return;
        }
        resolve(conversations);
      });
    });
  }

  async getUserConversationSummary(userId, limit = 20) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT message_content, timestamp, context_summary
        FROM conversations 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [userId, limit], (err, conversations) => {
        if (err) {
          console.error('[DB] getUserConversationSummary hatası:', err);
          reject(err);
          return;
        }
        
        // Son konuşmaları tersine çevir (kronolojik sıra için)
        const summary = conversations.reverse().map(conv => ({
          content: conv.message_content,
          timestamp: conv.timestamp,
          context: conv.context_summary
        }));
        
        resolve(summary);
      });
    });
  }

  async createUserProfile(discordId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO user_profiles (user_id, created_at, updated_at)
        VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [discordId], function(err) {
        if (err) {
          console.error('[DB] createUserProfile hatası:', err);
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  async updateUserProfile(discordId, updates) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (key === 'interests' || key === 'skills' || key === 'favorite_topics') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updates[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      values.push(discordId);
      
      const sql = `
        UPDATE user_profiles 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          console.error('[DB] updateUserProfile hatası:', err);
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('[DB] Database kapatma hatası:', err);
            reject(err);
          } else {
            console.log('[DB] Database kapatıldı');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // Toplam kullanıcı sayısı
      this.db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        stats.totalUsers = result.count;
        
        // Toplam mesaj sayısı
        this.db.get('SELECT COUNT(*) as count FROM conversations', (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          stats.totalMessages = result.count;
          
          // En aktif kullanıcılar
          this.db.all(`
            SELECT username, message_count, last_seen 
            FROM users 
            ORDER BY message_count DESC 
            LIMIT 5
          `, (err, users) => {
            if (err) {
              reject(err);
              return;
            }
            stats.topUsers = users;
            resolve(stats);
          });
        });
      });
    });
  }
}

// Singleton instance
let databaseInstance = null;

async function getDatabase() {
  if (!databaseInstance) {
    databaseInstance = new UserDatabase();
    await databaseInstance.init();
  }
  return databaseInstance;
}

module.exports = { UserDatabase, getDatabase };
