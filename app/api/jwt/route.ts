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
    try {
      const keyBuffer = Buffer.from(process.env.SNOWFLAKE_PRIVATE_KEY_BASE64, 'base64');
      const keyString = keyBuffer.toString('utf-8');
      console.log('Key decoded, first 50 chars:', keyString.substring(0, 50));
      console.log('Key decoded, last 50 chars:', keyString.substring(keyString.length - 50));
      return keyString;
    } catch (error) {
      console.error('Failed to decode base64 key:', error);
      throw error;
    }
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
    const rsaKeyString = getRSAKey();
    console.log('RSA key loaded successfully, length:', rsaKeyString.length);
    
    console.log('Creating private key object...');
    
    // Try to create private key with explicit format options
    let privateKey;
    try {
      // First attempt: Try as PKCS8 format
      privateKey = createPrivateKey({
        key: rsaKeyString,
        format: 'pem',
        type: 'pkcs8',
      });
      console.log('Successfully created private key (PKCS8)');
    } catch (pkcs8Error) {
      console.log('PKCS8 failed, trying PKCS1:', pkcs8Error);
      try {
        // Second attempt: Try as PKCS1 format
        privateKey = createPrivateKey({
          key: rsaKeyString,
          format: 'pem',
          type: 'pkcs1',
        });
        console.log('Successfully created private key (PKCS1)');
      } catch (pkcs1Error) {
        console.log('PKCS1 failed, trying without type:', pkcs1Error);
        try {
          // Third attempt: Let Node.js auto-detect
          privateKey = createPrivateKey({
            key: rsaKeyString,
            format: 'pem',
          });
          console.log('Successfully created private key (auto-detect)');
        } catch (autoError) {
          console.error('All key format attempts failed');
          console.error('PKCS8 error:', pkcs8Error);
          console.error('PKCS1 error:', pkcs1Error);
          console.error('Auto-detect error:', autoError);
          throw new Error(`Failed to parse private key. Last error: ${autoError}`);
        }
      }
    }
    
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
    
    // Sign JWT - export the key in PEM format for jwt.sign
    const privateKeyPem = privateKey.export({
      type: 'pkcs8',
      format: 'pem'
    });
    
    const token = jwt.sign(payload, privateKeyPem, { 
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