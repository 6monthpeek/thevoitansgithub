/**
 * VOITANS Bot Memory Manager
 * AI destekli kullanıcı hafıza sistemi
 */

const { getDatabase } = require('../database');
const { callOpenRouter } = require('../openrouter');

class MemoryManager {
  constructor() {
    this.db = getDatabase();
    this.shortTerm = new Map(); // Son 10 mesaj (RAM'de)
    this.userContexts = new Map(); // Kullanıcı bağlamları (RAM'de)
    this.maxShortTerm = 10;
    this.maxContextAge = 30 * 60 * 1000; // 30 dakika
  }

  /**
   * Kullanıcı hafızasını getir ve güncelle
   */
  async getUserMemory(discordId, forceRefresh = false) {
    try {
      // RAM'deki context'i kontrol et
      const cached = this.userContexts.get(discordId);
      const now = Date.now();
      
      if (!forceRefresh && cached && (now - cached.lastUpdate) < this.maxContextAge) {
        return cached.data;
      }

      // Database'den veri çek
      const profile = await this.db.getUserProfile(discordId);
      const conversations = await this.db.getRecentConversations(discordId, 20);
      const summary = await this.db.getUserConversationSummary(discordId, 30);

      // AI ile context oluştur
      const context = await this.buildUserContext(profile, conversations, summary);
      
      // RAM'e cache'le
      const memoryData = {
        profile,
        conversations: conversations.slice(0, 10), // Son 10'u RAM'de tut
        summary,
        context,
        lastUpdate: now
      };

      this.userContexts.set(discordId, memoryData);
      
      return memoryData;
    } catch (error) {
      console.error('[Memory] getUserMemory hatası:', error);
      return null;
    }
  }

  /**
   * AI ile kullanıcı bağlamı oluştur
   */
  async buildUserContext(profile, conversations, summary) {
    try {
      if (!profile || !conversations.length) {
        return {
          personality: 'Yeni kullanıcı',
          interests: [],
          communication_style: 'Bilinmiyor',
          topics_discussed: []
        };
      }

      // Son konuşmalardan özet çıkar
      const recentMessages = conversations.slice(0, 10).map(c => c.message_content).join('\n');
      
      const contextPrompt = `
Aşağıdaki Discord kullanıcısı hakkında kısa bir özet çıkar:

KULLANICI BİLGİLERİ:
- Username: ${profile.username}
- Nickname: ${profile.nickname || 'Yok'}
- Roller: ${profile.roles.join(', ') || 'Yok'}
- Mesaj sayısı: ${profile.message_count}
- Son aktivite: ${profile.last_seen}

SON KONUŞMALAR:
${recentMessages}

Bu kullanıcı hakkında şunları belirle:
1. Kişilik özellikleri (3-4 kelime)
2. İlgi alanları (varsa)
3. İletişim tarzı
4. Sık konuştuğu konular

JSON formatında döndür:
{
  "personality": "kısa özet",
  "interests": ["ilgi1", "ilgi2"],
  "communication_style": "tarz",
  "topics_discussed": ["konu1", "konu2"]
}
`;

      const response = await callOpenRouter([
        { role: 'system', content: 'Sen bir kullanıcı analiz uzmanısın. Sadece JSON döndür.' },
        { role: 'user', content: contextPrompt }
      ], {
        temperature: 0.3,
        max_tokens: 200
      });

      // JSON parse et
      try {
        const context = JSON.parse(response);
        return context;
      } catch (parseError) {
        console.error('[Memory] Context JSON parse hatası:', parseError);
        return {
          personality: 'Analiz edilemedi',
          interests: [],
          communication_style: 'Bilinmiyor',
          topics_discussed: []
        };
      }
    } catch (error) {
      console.error('[Memory] buildUserContext hatası:', error);
      return {
        personality: 'Hata oluştu',
        interests: [],
        communication_style: 'Bilinmiyor',
        topics_discussed: []
      };
    }
  }

  /**
   * Kullanıcı mesajını kaydet ve hafızayı güncelle
   */
  async saveUserMessage(discordId, channelId, content, messageType = 'chat') {
    try {
      // Database'e kaydet
      await this.db.saveConversation(discordId, channelId, content, null, messageType);
      
      // RAM'deki short-term memory'yi güncelle
      if (!this.shortTerm.has(discordId)) {
        this.shortTerm.set(discordId, []);
      }
      
      const userMessages = this.shortTerm.get(discordId);
      userMessages.push({
        content,
        timestamp: Date.now(),
        type: messageType
      });
      
      // Son 10 mesajı tut
      if (userMessages.length > this.maxShortTerm) {
        userMessages.splice(0, userMessages.length - this.maxShortTerm);
      }
      
      // Context'i force refresh et
      await this.getUserMemory(discordId, true);
      
      return true;
    } catch (error) {
      console.error('[Memory] saveUserMessage hatası:', error);
      return false;
    }
  }

  /**
   * Kullanıcı hakkında bilgi öğren ve kaydet
   */
  async learnAboutUser(discordId, newInfo) {
    try {
      const { interests, skills, bio, favorite_topics } = newInfo;
      
      // Profile'ı güncelle
      await this.db.updateUserProfile(discordId, {
        interests: interests || [],
        skills: skills || [],
        bio: bio || null,
        favorite_topics: favorite_topics || []
      });
      
      // Context'i force refresh et
      await this.getUserMemory(discordId, true);
      
      return true;
    } catch (error) {
      console.error('[Memory] learnAboutUser hatası:', error);
      return false;
    }
  }

  /**
   * Kullanıcı hakkında bilgi sorgula
   */
  async queryUserInfo(discordId, query) {
    try {
      const memory = await this.getUserMemory(discordId);
      if (!memory) {
        return { found: false, message: 'Kullanıcı bulunamadı' };
      }

      const { profile, context, summary } = memory;
      
      // Basit sorgular için pattern matching
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('rol') || queryLower.includes('görev')) {
        return {
          found: true,
          data: {
            roles: profile.roles,
            message_count: profile.message_count,
            last_seen: profile.last_seen
          }
        };
      }
      
      if (queryLower.includes('ilgi') || queryLower.includes('hobi')) {
        return {
          found: true,
          data: {
            interests: context.interests || [],
            favorite_topics: context.topics_discussed || []
          }
        };
      }
      
      if (queryLower.includes('aktivite') || queryLower.includes('son')) {
        return {
          found: true,
          data: {
            last_activity: profile.last_seen,
            message_count: profile.message_count,
            recent_messages: summary.recentMessages?.length || 0
          }
        };
      }
      
      // Genel bilgi
      return {
        found: true,
        data: {
          username: profile.username,
          nickname: profile.nickname,
          roles: profile.roles,
          personality: context.personality,
          message_count: profile.message_count
        }
      };
      
    } catch (error) {
      console.error('[Memory] queryUserInfo hatası:', error);
      return { found: false, message: 'Sorgu hatası' };
    }
  }

  /**
   * Hafıza temizliği (eski verileri temizle)
   */
  async cleanupMemory() {
    try {
      const now = Date.now();
      
      // Eski context'leri temizle
      for (const [discordId, context] of this.userContexts.entries()) {
        if (now - context.lastUpdate > this.maxContextAge) {
          this.userContexts.delete(discordId);
        }
      }
      
      // Short-term memory'yi temizle
      for (const [discordId, messages] of this.shortTerm.entries()) {
        const recentMessages = messages.filter(m => now - m.timestamp < this.maxContextAge);
        if (recentMessages.length === 0) {
          this.shortTerm.delete(discordId);
        } else {
          this.shortTerm.set(discordId, recentMessages);
        }
      }
      
      console.log('[Memory] Hafıza temizliği tamamlandı');
    } catch (error) {
      console.error('[Memory] cleanupMemory hatası:', error);
    }
  }

  /**
   * Hafıza istatistikleri
   */
  async getMemoryStats() {
    try {
      const dbStats = await this.db.getStats();
      
      return {
        database: dbStats,
        memory: {
          shortTermUsers: this.shortTerm.size,
          contextUsers: this.userContexts.size,
          maxShortTerm: this.maxShortTerm,
          maxContextAge: this.maxContextAge
        }
      };
    } catch (error) {
      console.error('[Memory] getMemoryStats hatası:', error);
      return null;
    }
  }
}

// Singleton instance
let instance = null;

function getMemoryManager() {
  if (!instance) {
    instance = new MemoryManager();
    
    // Her 5 dakikada bir hafıza temizliği
    setInterval(() => {
      instance.cleanupMemory();
    }, 5 * 60 * 1000);
  }
  return instance;
}

module.exports = {
  MemoryManager,
  getMemoryManager
};
