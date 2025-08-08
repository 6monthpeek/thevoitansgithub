/**
 * Database Reset Script
 * npm run db:reset ile çalıştırılır
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./index');

async function resetDatabase() {
  console.log('🔄 VOITANS Bot Database sıfırlanıyor...');
  
  try {
    const dbPath = path.join(__dirname, 'users.db');
    
    // Database dosyasını sil
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('🗑️ Eski database dosyası silindi');
    }
    
    // Yeni database oluştur
    console.log('📊 Yeni database oluşturuluyor...');
    const db = await getDatabase();
    
    // Test verisi ekle
    console.log('📝 Test verisi ekleniyor...');
    
    // Test kullanıcıları
    await db.createOrUpdateUser('123456789', 'TestUser1', 'Test1', ['member']);
    await db.createOrUpdateUser('987654321', 'TestUser2', 'Test2', ['admin']);
    await db.createOrUpdateUser('555666777', 'TestUser3', 'Test3', ['moderator']);
    
    // Test konuşmaları
    await db.saveConversation('123456789', '111111111', 'Merhaba! Nasılsın?', 'Selamlaşma', 'chat');
    await db.saveConversation('123456789', '111111111', 'Ben iyiyim, teşekkürler!', 'Yanıt', 'chat');
    await db.saveConversation('987654321', '111111111', 'Bugün hava çok güzel', 'Hava durumu', 'chat');
    
    // Test profilleri
    await db.updateUserProfile('123456789', {
      bio: 'Merhaba, ben test kullanıcısıyım!',
      interests: ['teknoloji', 'oyun', 'müzik'],
      skills: ['JavaScript', 'Python', 'Discord Bot'],
      favorite_topics: ['programlama', 'AI', 'gaming']
    });
    
    await db.updateUserProfile('987654321', {
      bio: 'Admin kullanıcı',
      interests: ['yönetim', 'moderasyon'],
      skills: ['Discord Moderation', 'Community Management'],
      favorite_topics: ['moderation', 'community']
    });
    
    // İstatistikleri göster
    const stats = await db.getStats();
    console.log('📊 Database istatistikleri:', stats);
    
    // Database'i kapat
    await db.close();
    console.log('🔒 Database bağlantısı kapatıldı');
    
    console.log('✅ Database başarıyla sıfırlandı ve yeniden başlatıldı!');
    
  } catch (error) {
    console.error('❌ Database sıfırlama hatası:', error);
    process.exit(1);
  }
}

// Script çalıştırılıyorsa
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
