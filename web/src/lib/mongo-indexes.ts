import clientPromise from './mongo';

export async function createIndexes() {
  try {
    const client = await clientPromise;
    const db = client.db('voitans');
    const collection = db.collection('logs');

    // Temel indeksler
    await collection.createIndex({ ts: -1 });
    await collection.createIndex({ event: 1, ts: -1 });
    await collection.createIndex({ userId: 1, ts: -1 });
    await collection.createIndex({ channelId: 1, ts: -1 });
    await collection.createIndex({ guildId: 1, ts: -1 });

    // Full-text search için text index
    await collection.createIndex({
      event: 'text',
      'payload.content': 'text',
      'payload.author.username': 'text'
    });

    // TTL index (90 gün sonra otomatik silme)
    await collection.createIndex({ ts: 1 }, { expireAfterSeconds: 7776000 });

    console.log('✅ MongoDB indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}
