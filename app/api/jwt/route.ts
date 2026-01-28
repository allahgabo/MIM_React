import { NextResponse } from 'next/server';
import { createHash, createPrivateKey, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Get RSA key from environment or file
function getRSAKey(): string {
  // Production: Use base64-encoded key from environment
  if (process.env.SNOWFLAKE_PRIVATE_KEY_BASE64) {
    console.log('Using SNOWFLAKE_PRIVATE_KEY_BASE64 from environment');
    const keyBuffer = Buffer.from(process.env.SNOWFLAKE_PRIVATE_KEY_BASE64, 'base64');
    return keyBuffer.toString('utf-8');
  }
  
  // Alternative: Direct key from environment
  if (process.env.SNOWFLAKE_PRIVATE_KEY) {
    console.log('Using SNOWFLAKE_PRIVATE_KEY from environment');
    return process.env.SNOWFLAKE_PRIVATE_KEY;
  }
  
  // Development: Read from file
  const keyPath = path.join(process.cwd(), 'rsa_key.p8');
  if (fs.existsSync(keyPath)) {
    console.log('Using rsa_key.p8 file from local filesystem');
    return fs.readFileSync(keyPath, 'utf-8');
  }
  
  throw new Error('RSA key not found. Set SNOWFLAKE_PRIVATE_KEY_BASE64 environment variable.');
}

export async function GET() {
  try {
    // Get environment variables
    const SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT;
    const SNOWFLAKE_USER = process.env.SNOWFLAKE_USER;
    
    console.log('=== JWT Generation Started ===');
    console.log('SNOWFLAKE_ACCOUNT:', SNOWFLAKE_ACCOUNT);
    console.log('SNOWFLAKE_USER:', SNOWFLAKE_USER);
    
    // Validate required variables
    if (!SNOWFLAKE_ACCOUNT) {
      console.error('ERROR: SNOWFLAKE_ACCOUNT not set');
      return NextResponse.json(
        { error: 'SNOWFLAKE_ACCOUNT environment variable not set' },
        { status: 500 }
      );
    }
    
    if (!SNOWFLAKE_USER) {
      console.error('ERROR: SNOWFLAKE_USER not set');
      return NextResponse.json(
        { error: 'SNOWFLAKE_USER environment variable not set' },
        { status: 500 }
      );
    }
    
    console.log('Loading RSA key...');
    
    // Get RSA key
    const rsaKey = getRSAKey();
    console.log('RSA key loaded successfully, length:', rsaKey.length);
    
    console.log('Creating private key object...');
    
    // Create private key object
    const privateKey = createPrivateKey({
      key: rsaKey,
      format: 'pem',
    });
    
    console.log('Extracting public key...');
    
    // Extract public key
    const publicKey = createPublicKey(privateKey);
    const publicKeyRaw = publicKey.export({ 
      type: 'spki', 
      format: 'der' 
    });
    
    console.log('Creating fingerprint...');
    
    // Create fingerprint
    const sha256Hash = createHash('sha256')
      .update(publicKeyRaw)
      .digest('base64');
    
    const publicKeyFp = 'SHA256:' + sha256Hash;
    console.log('Public key fingerprint created');
    
    // Format qualified username
    const account = SNOWFLAKE_ACCOUNT.toUpperCase();
    const user = SNOWFLAKE_USER.toUpperCase();
    const qualifiedUsername = `${account}.${user}`;
    
    console.log('Qualified username:', qualifiedUsername);
    
    // Create JWT payload
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const oneHourInSeconds = 60 * 60;
    
    const payload = {
      iss: `${qualifiedUsername}.${publicKeyFp}`,
      sub: qualifiedUsername,
      iat: nowInSeconds,
      exp: nowInSeconds + oneHourInSeconds,
    };
    
    console.log('Signing JWT...');
    
    // Sign JWT
    const token = jwt.sign(payload, rsaKey, { 
      algorithm: 'RS256' 
    });
    
    console.log('JWT created successfully');
    console.log('=== JWT Generation Completed ===');
    
    return NextResponse.json({
      token: {
        token,
        expiresAt: nowInSeconds + oneHourInSeconds - 120 // 2 minutes before actual expiration
      }
    });
    
  } catch (error: unknown) {
    console.error('=== JWT Generation Failed ===');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Unknown error' 
    }, { status: 500 });
  }
}