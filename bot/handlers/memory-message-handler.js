/**
 * Memory-Enhanced Message Handler
 * Hafıza sistemi ile entegre mesaj işleme
 */

const { getMemoryManager } = require('../memory/memory-manager');
const { callOpenRouter } = require('../openrouter');

class MemoryMessageHandler {
  constructor() {
    this.memory = getMemoryManager();
    this.maxResponseLength = 450; // Discord 500 char limit için güvenlik payı
  }

  /**
   * Mesajı işle ve hafızayı kullan
   */
  async handleMessage(message, isModeration = false) {
    try {
      const { author, content, channel, guild } = message;
      const discordId = author.id;
      
      // Kullanıcıyı database'e kaydet/güncelle
      const roles = guild?.members?.cache?.get(discordId)?.roles?.cache
        ?.map(role => role.name) || [];
      
      await this.memory.db.createOrUpdateUser(
        discordId,
        author.username,
        guild?.members?.cache?.get(discordId)?.nickname || null,
        roles
      );

      // Mesajı hafızaya kaydet
      const messageType = isModeration ? 'moderation' : 'chat';
      await this.memory.saveUserMessage(discordId, channel.id, content, messageType);

      // Hafızadan kullanıcı bilgilerini al
      const userMemory = await this.memory.getUserMemory(discordId);
      
      // AI response oluştur
      const response = await this.generateAIResponse(content, userMemory, isModeration);
      
      return response;
      
    } catch (error) {
      console.error('[MemoryHandler] handleMessage hatası:', error);
      return {
        success: false,
        message: 'Mesaj işlenirken hata oluştu',
        error: error.message
      };
    }
  }

  /**
   * AI response oluştur (hafıza ile)
   */
  async generateAIResponse(content, userMemory, isModeration = false) {
    try {
      const { profile, context, conversations } = userMemory;
      
      // Kullanıcı hakkında bilgi özeti
      const userContext = this.buildUserContextString(profile, context, conversations);
      
      // System prompt'u hazırla
      const systemPrompt = this.buildSystemPrompt(isModeration, userContext);
      
      // User prompt'u hazırla
      const userPrompt = this.buildUserPrompt(content, userMemory);
      
      // OpenRouter API'yi çağır
      const response = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: isModeration ? 0.1 : 0.7,
        max_tokens: 300
      });

      // Response'u formatla ve karakter sınırını kontrol et
      const formattedResponse = this.formatResponse(response, userMemory);
      
      return {
        success: true,
        message: formattedResponse,
        userContext: userContext,
        memoryUsed: true
      };
      
    } catch (error) {
      console.error('[MemoryHandler] generateAIResponse hatası:', error);
      return {
        success: false,
        message: 'AI response oluşturulamadı',
        error: error.message
      };
    }
  }

  /**
   * Kullanıcı context string'i oluştur
   */
  buildUserContextString(profile, context, conversations) {
    if (!profile) return 'Yeni kullanıcı';
    
    const parts = [];
    
    // Temel bilgiler
    if (profile.nickname) {
      parts.push(`Nickname: ${profile.nickname}`);
    }
    
    if (profile.roles && profile.roles.length > 0) {
      parts.push(`Roller: ${profile.roles.join(', ')}`);
    }
    
    // AI analizi
    if (context) {
      if (context.personality && context.personality !== 'Yeni kullanıcı') {
        parts.push(`Kişilik: ${context.personality}`);
      }
      
      if (context.interests && context.interests.length > 0) {
        parts.push(`İlgi alanları: ${context.interests.join(', ')}`);
      }
      
      if (context.communication_style && context.communication_style !== 'Bilinmiyor') {
        parts.push(`İletişim tarzı: ${context.communication_style}`);
      }
    }
    
    // Aktivite bilgileri
    if (profile.message_count > 0) {
      parts.push(`Toplam mesaj: ${profile.message_count}`);
    }
    
    // Son konuşma konuları
    if (context?.topics_discussed && context.topics_discussed.length > 0) {
      const recentTopics = context.topics_discussed.slice(0, 3);
      parts.push(`Son konular: ${recentTopics.join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Yeni kullanıcı';
  }

  /**
   * System prompt oluştur
   */
  buildSystemPrompt(isModeration, userContext) {
    const basePrompt = `Sen VOITANS lon'unun resmi Discord botusun. 
    
KULLANICI HAFIZASI:
${userContext}

POLİTİKA:
- Türkçe konuş
- Kısa ve öz cevaplar ver (Discord 500 karakter sınırı)
- Kullanıcı hakkında bildiğin bilgileri kullan
- Önceki konuşmaları hatırla ve referans ver
- Yardımcı ve dostane ol`;

    if (isModeration) {
      return basePrompt + `

MODERASYON MODU:
- Sadece moderasyon komutlarına odaklan
- Kullanıcı hakkında bilgi verirken güvenlik öncelikli ol
- Rol ve yetki bilgilerini doğru kullan`;
    }
    
    return basePrompt;
  }

  /**
   * User prompt oluştur
   */
  buildUserPrompt(content, userMemory) {
    const { profile, conversations } = userMemory;
    
    let prompt = `Kullanıcı mesajı: ${content}\n\n`;
    
    // Son konuşmalardan context ekle
    if (conversations && conversations.length > 0) {
      const recentMessages = conversations.slice(0, 3);
      prompt += `Son konuşmalar:\n`;
      recentMessages.forEach((conv, index) => {
        prompt += `${index + 1}. ${conv.content}\n`;
      });
      prompt += `\n`;
    }
    
    // Kullanıcı hakkında bilgi ekle
    if (profile) {
      prompt += `Kullanıcı bilgileri:\n`;
      prompt += `- Username: ${profile.username}\n`;
      if (profile.nickname) prompt += `- Nickname: ${profile.nickname}\n`;
      if (profile.roles && profile.roles.length > 0) {
        prompt += `- Roller: ${profile.roles.join(', ')}\n`;
      }
      prompt += `- Mesaj sayısı: ${profile.message_count}\n\n`;
    }
    
    prompt += `Bu bilgileri kullanarak kullanıcıya uygun, kişiselleştirilmiş bir cevap ver. 
Önceki konuşmaları referans al ve kullanıcı hakkında bildiğin bilgileri kullan.`;
    
    return prompt;
  }

  /**
   * Response'u formatla ve karakter sınırını kontrol et
   */
  formatResponse(response, userMemory) {
    // Response'u temizle
    let formatted = response.trim();
    
    // Discord karakter sınırını kontrol et
    if (formatted.length > this.maxResponseLength) {
      formatted = formatted.substring(0, this.maxResponseLength - 3) + '...';
    }
    
    // Kullanıcı context'ini ekle (eğer yer varsa)
    if (userMemory?.context?.personality && formatted.length < 400) {
      const personality = userMemory.context.personality;
      if (personality !== 'Yeni kullanıcı' && personality !== 'Analiz edilemedi') {
        formatted += `\n\n💭 ${personality} olarak tanıdığım kullanıcı, size nasıl yardımcı olabilirim?`;
      }
    }
    
    return formatted;
  }

  /**
   * Kullanıcı hakkında bilgi sorgula
   */
  async queryUserInfo(discordId, query) {
    try {
      const result = await this.memory.queryUserInfo(discordId, query);
      return result;
    } catch (error) {
      console.error('[MemoryHandler] queryUserInfo hatası:', error);
      return { found: false, message: 'Sorgu hatası' };
    }
  }

  /**
   * Kullanıcı hakkında yeni bilgi öğren
   */
  async learnAboutUser(discordId, newInfo) {
    try {
      const result = await this.memory.learnAboutUser(discordId, newInfo);
      return result;
    } catch (error) {
      console.error('[MemoryHandler] learnAboutUser hatası:', error);
      return false;
    }
  }
}

module.exports = { MemoryMessageHandler };
