// app/api/test-auth/route.ts
import { NextResponse } from 'next/server';
import { generateSnowflakeJWTFromEnv, verifyJWTStructure, testSnowflakeAuth } from '@/lib/snowflake-auth';

/**
 * Test API endpoint to verify Snowflake authentication
 * 
 * GET /api/test-auth
 * 
 * This endpoint:
 * 1. Checks if all required environment variables are present
 * 2. Generates a JWT token
 * 3. Verifies the token structure
 * 4. Tests authentication against Snowflake
 */
export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        steps: {},
    };

    try {
        // Step 1: Check environment variables
        results.steps.environmentVariables = {
            SNOWFLAKE_ACCOUNT: !!process.env.SNOWFLAKE_ACCOUNT,
            SNOWFLAKE_USER: !!process.env.SNOWFLAKE_USER,
            SNOWFLAKE_PRIVATE_KEY_BASE64: !!process.env.SNOWFLAKE_PRIVATE_KEY_BASE64,
            SNOWFLAKE_ROLE: !!process.env.SNOWFLAKE_ROLE,
            NEXT_PUBLIC_SNOWFLAKE_URL: !!process.env.NEXT_PUBLIC_SNOWFLAKE_URL,
            NEXT_PUBLIC_SNOWFLAKE_SCHEMA: !!process.env.NEXT_PUBLIC_SNOWFLAKE_SCHEMA,
            NEXT_PUBLIC_SNOWFLAKE_DATABASE: !!process.env.NEXT_PUBLIC_SNOWFLAKE_DATABASE,
            NEXT_PUBLIC_AGENT_NAME: !!process.env.NEXT_PUBLIC_AGENT_NAME,
        };

        const missingVars = Object.entries(results.steps.environmentVariables)
            .filter(([_, exists]) => !exists)
            .map(([name]) => name);

        if (missingVars.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Missing required environment variables',
                missingVariables: missingVars,
                ...results,
            }, { status: 500 });
        }

        // Step 2: Generate JWT token
        const jwtResult = generateSnowflakeJWTFromEnv();
        
        if (!jwtResult.success) {
            return NextResponse.json({
                success: false,
                error: 'JWT generation failed',
                jwtError: jwtResult.error,
                ...results,
            }, { status: 500 });
        }

        results.steps.jwtGeneration = {
            success: true,
            details: jwtResult.details,
            tokenPreview: jwtResult.token?.substring(0, 50) + '...',
        };

        // Step 3: Verify token structure
        const verificationResult = verifyJWTStructure(jwtResult.token!);
        
        if (!verificationResult.valid) {
            return NextResponse.json({
                success: false,
                error: 'JWT verification failed',
                verificationError: verificationResult.error,
                ...results,
            }, { status: 500 });
        }

        results.steps.jwtVerification = {
            success: true,
            decoded: verificationResult.decoded,
        };

        // Step 4: Test authentication with Snowflake
        const snowflakeUrl = process.env.NEXT_PUBLIC_SNOWFLAKE_URL;
        
        if (!snowflakeUrl) {
            return NextResponse.json({
                success: false,
                error: 'NEXT_PUBLIC_SNOWFLAKE_URL is not set',
                ...results,
            }, { status: 500 });
        }

        const authTestResult = await testSnowflakeAuth(snowflakeUrl, jwtResult.token!);
        
        results.steps.snowflakeAuthentication = {
            success: authTestResult.success,
            statusCode: authTestResult.statusCode,
            error: authTestResult.error,
        };

        if (!authTestResult.success) {
            return NextResponse.json({
                success: false,
                error: 'Snowflake authentication failed',
                authError: authTestResult.error,
                ...results,
            }, { status: 500 });
        }

        // All steps successful
        return NextResponse.json({
            success: true,
            message: 'All authentication tests passed!',
            ...results,
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Unexpected error during testing',
            details: error.message,
            stack: error.stack,
            ...results,
        }, { status: 500 });
    }
}

/**
 * Alternative endpoint that provides detailed diagnostics
 * 
 * POST /api/test-auth
 * Body: { action: 'diagnose' | 'test' | 'generate-token' }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'diagnose':
                // Provide detailed diagnostics without testing auth
                return NextResponse.json({
                    environment: {
                        SNOWFLAKE_ACCOUNT: process.env.SNOWFLAKE_ACCOUNT ? 'SET' : 'NOT SET',
                        SNOWFLAKE_USER: process.env.SNOWFLAKE_USER ? 'SET' : 'NOT SET',
                        SNOWFLAKE_PRIVATE_KEY_BASE64: process.env.SNOWFLAKE_PRIVATE_KEY_BASE64 
                            ? `SET (${process.env.SNOWFLAKE_PRIVATE_KEY_BASE64.length} chars)` 
                            : 'NOT SET',
                        NEXT_PUBLIC_SNOWFLAKE_URL: process.env.NEXT_PUBLIC_SNOWFLAKE_URL || 'NOT SET',
                        NEXT_PUBLIC_AGENT_NAME: process.env.NEXT_PUBLIC_AGENT_NAME || 'NOT SET',
                    },
                    runtime: {
                        nodeVersion: process.version,
                        platform: process.platform,
                        timestamp: new Date().toISOString(),
                    },
                });

            case 'generate-token':
                // Just generate and return token details
                const jwtResult = generateSnowflakeJWTFromEnv();
                
                if (!jwtResult.success) {
                    return NextResponse.json({
                        success: false,
                        error: jwtResult.error,
                    }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    tokenDetails: jwtResult.details,
                    tokenPreview: jwtResult.token?.substring(0, 100) + '...',
                });

            case 'test':
            default:
                // Redirect to GET for full test
                return GET();
        }
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}