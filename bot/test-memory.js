/**
 * Memory System Test Script
 * Bot token olmadan memory sistemini test eder
 */

const { getDatabase } = require('./database');
const { getMemoryManager } = require('./memory/memory-manager');

async function testMemorySystem() {
  console.log('🧠 Memory System Test başlatılıyor...\n');
  
  try {
    // Database'i başlat
    console.log('📊 Database bağlantısı kuruluyor...');
    const db = await getDatabase();
    console.log('✅ Database bağlantısı başarılı\n');
    
    // Memory manager'ı başlat
    console.log('🧠 Memory Manager başlatılıyor...');
    const memoryManager = getMemoryManager();
    console.log('✅ Memory Manager başarılı\n');
    
    // Test kullanıcısı oluştur
    console.log('👤 Test kullanıcısı oluşturuluyor...');
    const testUserId = 'test-user-123';
    await db.createOrUpdateUser(testUserId, 'TestUser', 'TestNick', ['Member']);
    console.log('✅ Test kullanıcısı oluşturuldu\n');
    
    // Test mesajları ekle
    console.log('💬 Test mesajları ekleniyor...');
    const testMessages = [
      'Merhaba! Ben yeni bir kullanıcıyım.',
      'JavaScript ile Discord bot geliştirmeyi öğrenmek istiyorum.',
      'React ve Next.js konularında da deneyimim var.',
      'En sevdiğim oyunlar: Valorant, CS2 ve Minecraft.',
      'Müzik dinlemeyi çok severim, özellikle rock ve elektronik.'
    ];
    
    for (const message of testMessages) {
      await db.saveConversation(testUserId, 'test-channel', message);
      console.log(`📝 Mesaj kaydedildi: "${message}"`);
    }
    console.log('✅ Tüm test mesajları eklendi\n');
    
    // Memory'den kullanıcı bilgilerini al
    console.log('🔍 Kullanıcı memory bilgileri alınıyor...');
    const userMemory = await memoryManager.getUserMemory(testUserId);
    console.log('📋 Kullanıcı Memory:', JSON.stringify(userMemory, null, 2));
    console.log('✅ Memory bilgileri alındı\n');
    
    // AI context'i oluştur
    console.log('🤖 AI Context oluşturuluyor...');
    const userContext = await memoryManager.buildUserContext(testUserId);
    console.log('📝 AI Context:', userContext);
    console.log('✅ AI Context oluşturuldu\n');
    
    // Kullanıcı hakkında bilgi sorgula
    console.log('❓ Kullanıcı hakkında bilgi sorgulanıyor...');
    const userInfo = await memoryManager.queryUserInfo(testUserId, 'Bu kullanıcının ilgi alanları neler?');
    console.log('💡 Kullanıcı Bilgisi:', userInfo);
    console.log('✅ Kullanıcı bilgisi alındı\n');
    
    // Database istatistikleri
    console.log('📊 Database istatistikleri:');
    const stats = await db.getStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log('✅ İstatistikler alındı\n');
    
    // Database'i kapat
    await db.close();
    console.log('🔒 Database bağlantısı kapatıldı');
    
    console.log('\n🎉 Memory System Test başarıyla tamamlandı!');
    console.log('✅ Tüm sistemler çalışıyor');
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
    process.exit(1);
  }
}

// Test'i çalıştır
testMemorySystem();
