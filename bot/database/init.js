/**
 * Database Başlatma Script'i
 * npm run db:init ile çalıştırılır
 */

const { getDatabase } = require('./index');

async function initDatabase() {
  console.log('🚀 VOITANS Bot Database başlatılıyor...');
  
  try {
    const db = await getDatabase();
    
    // Test verisi ekle
    console.log('📝 Test verisi ekleniyor...');
    
    // Test kullanıcısı
    await db.createOrUpdateUser('123456789', 'TestUser', 'TestNick', ['Member']);
    await db.saveConversation('123456789', 'test-channel', 'Merhaba! Bu bir test mesajıdır.');
    
    // Stats göster
    const stats = await db.getStats();
    console.log('📊 Database Stats:', stats);
    
    console.log('✅ Database başarıyla başlatıldı!');
    
    // Bağlantıyı kapat
    await db.close();
    
  } catch (error) {
    console.error('❌ Database başlatma hatası:', error);
    process.exit(1);
  }
}

// Script çalıştırılıyorsa
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
