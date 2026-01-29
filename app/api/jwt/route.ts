import { NextResponse } from 'next/server';
import { createHash, createPrivateKey, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Get RSA key from environment or file
function getRSAKey(): Buffer | string {
  console.log('=== Getting RSA Key ===');
  
  // Priority 1: Use direct key from environment (most reliable)
  if (process.env.SNOWFLAKE_PRIVATE_KEY) {
    console.log('✓ Using SNOWFLAKE_PRIVATE_KEY from environment');
    return process.env.SNOWFLAKE_PRIVATE_KEY;
  }
  
  // Priority 2: Use base64-encoded key from environment
  if (process.env.SNOWFLAKE_PRIVATE_KEY_BASE64) {
    console.log('✓ Using SNOWFLAKE_PRIVATE_KEY_BASE64 from environment');
    try {
      const keyBuffer = Buffer.from(process.env.SNOWFLAKE_PRIVATE_KEY_BASE64, 'base64');
      const keyString = keyBuffer.toString('utf-8');
      console.log('✓ Base64 key decoded successfully');
      return keyString;
    } catch (error) {
      console.error('✗ Failed to decode base64 key:', error);
      throw new Error('Failed to decode base64 key');
    }
  }
  
  // Priority 3: Development - Read from file
  const keyPath = path.join(process.cwd(), 'rsa_key.p8');
  if (fs.existsSync(keyPath)) {
    console.log('✓ Using rsa_key.p8 file from local filesystem');
    return fs.readFileSync(keyPath);
  }
  
  console.error('✗ No RSA key found in any location');
  throw new Error('RSA key not found. Set SNOWFLAKE_PRIVATE_KEY environment variable.');
}

export async function GET() {
  try {
    console.log('\n=== JWT Generation Started ===');
    
    // Get environment variables
    const SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT;
    const SNOWFLAKE_USER = process.env.SNOWFLAKE_USER;
    const SNOWFLAKE_RSA_PASSPHRASE = process.env.SNOWFLAKE_RSA_PASSPHRASE || '';
    
    console.log('SNOWFLAKE_ACCOUNT:', SNOWFLAKE_ACCOUNT);
    console.log('SNOWFLAKE_USER:', SNOWFLAKE_USER);
    console.log('Has passphrase:', SNOWFLAKE_RSA_PASSPHRASE ? 'Yes' : 'No');
    
    // Validate required variables
    if (!SNOWFLAKE_ACCOUNT) {
      console.error('✗ SNOWFLAKE_ACCOUNT not set');
      return NextResponse.json(
        { error: 'SNOWFLAKE_ACCOUNT environment variable not set' },
        { status: 500 }
      );
    }
    
    if (!SNOWFLAKE_USER) {
      console.error('✗ SNOWFLAKE_USER not set');
      return NextResponse.json(
        { error: 'SNOWFLAKE_USER environment variable not set' },
        { status: 500 }
      );
    }
    
    // Get RSA key
    const rsaKey = getRSAKey();
    console.log('✓ RSA key loaded');
    
    // Create private key object
    console.log('Creating private key object...');
    let privateKey;
    
    try {
      // If there's a passphrase, use it
      if (SNOWFLAKE_RSA_PASSPHRASE) {
        console.log('Attempting to create key with passphrase...');
        privateKey = createPrivateKey({
          key: rsaKey,
          format: 'pem',
          passphrase: SNOWFLAKE_RSA_PASSPHRASE
        });
        console.log('✓ Private key created with passphrase');
      } else {
        // No passphrase
        console.log('Attempting to create key without passphrase...');
        privateKey = createPrivateKey({
          key: rsaKey,
          format: 'pem'
        });
        console.log('✓ Private key created without passphrase');
      }
    } catch (error) {
      console.error('✗ Failed to create private key');
      console.error('Error details:', error);
      
      // If it failed and we didn't try a passphrase, suggest checking if key is encrypted
      if (!SNOWFLAKE_RSA_PASSPHRASE) {
        throw new Error('Failed to parse private key. If your key is encrypted, set SNOWFLAKE_RSA_PASSPHRASE.');
      }
      
      throw new Error(`Failed to parse private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Extract public key
    console.log('Extracting public key...');
    const publicKey = createPublicKey(privateKey);
    const publicKeyRaw = publicKey.export({ 
      type: 'spki', 
      format: 'der' 
    });
    console.log('✓ Public key extracted');
    
    // Create fingerprint
    console.log('Creating fingerprint...');
    const sha256Hash = createHash('sha256')
      .update(publicKeyRaw)
      .digest('base64');
    
    const publicKeyFp = 'SHA256:' + sha256Hash;
    console.log('✓ Fingerprint created:', publicKeyFp.substring(0, 20) + '...');
    
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
    
    console.log('JWT payload created');
    
    // Sign JWT
    console.log('Signing JWT...');
    const token = jwt.sign(payload, privateKey, { 
      algorithm: 'RS256' 
    });
    
    console.log('✓ JWT created successfully');
    console.log('=== JWT Generation Completed ===\n');
    
    return NextResponse.json({
      token: {
        token,
        expiresAt: nowInSeconds + oneHourInSeconds - 120 // 2 minutes before actual expiration
      }
    });
    
  } catch (error: unknown) {
    console.error('\n=== JWT Generation Failed ===');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
      
      return NextResponse.json({ 
        error: error.message,
        hint: 'Check Render logs for detailed error information'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Unknown error occurred',
      hint: 'Check Render logs for detailed error information'
    }, { status: 500 });
  }
}