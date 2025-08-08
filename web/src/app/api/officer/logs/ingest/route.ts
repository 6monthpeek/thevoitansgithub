import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import clientPromise from '@/lib/mongo';

// HMAC doğrulama fonksiyonu
function verifySignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');
    const secret = process.env.LOG_INGEST_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: 'LOG_INGEST_SECRET not configured' },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'X-Signature header required' },
        { status: 401 }
      );
    }

    // HMAC doğrulama
    if (!verifySignature(body, signature, secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // JSON parse
    let logData;
    try {
      logData = JSON.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Gerekli alanları kontrol et
    if (!logData.event) {
      return NextResponse.json(
        { error: 'event field is required' },
        { status: 400 }
      );
    }

    // MongoDB'ye bağlan
    const client = await clientPromise;
    const db = client.db('voitans');
    const collection = db.collection('logs');

    // Log document'ini hazırla
    const logDocument = {
      ts: logData.ts ? new Date(logData.ts) : new Date(),
      event: logData.event,
      guildId: logData.guildId || null,
      userId: logData.userId || null,
      channelId: logData.channelId || null,
      severity: logData.severity || 0,
      source: logData.source || 'bot',
      payload: logData.payload || {},
      createdAt: new Date()
    };

    // MongoDB'ye ekle
    const result = await collection.insertOne(logDocument);

    return NextResponse.json({
      ok: true,
      id: result.insertedId,
      ts: logDocument.ts
    });

  } catch (error) {
    console.error('Log ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
