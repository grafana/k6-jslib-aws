import { build } from 'esbuild';

const buildOptions = {
    // Produce the build results in the dist folder
    outdir: 'dist',

    // Map source code typescript files to their output files (dist/*.js)
    entryPoints: [
        { in: 'src/index.ts', out: 'index' },
        { in: 'src/s3.ts', out: 's3' },
        { in: 'src/secrets-manager.ts', out: 'secrets-manager' },
        { in: 'src/sqs.ts', out: 'sqs' },
        { in: 'src/ssm.ts', out: 'ssm' },
        { in: 'src/kms.ts', out: 'kms' },
        { in: 'src/kinesis.ts', out: 'kinesis' },
        { in: 'src/event-bridge.ts', out: 'event-bridge' },
        { in: 'src/lambda.ts', out: 'lambda' },
        { in: 'src/signature.ts', out: 'signature' },
    ],

    // k6 supports the ES module format, and using it avoids transpiling and leads
    // to faster time to start a test, and better overall test performance.
    format: 'esm',

    // k6 JS runtime is browser-like.
    platform: 'browser',

    // Bundle all dependencies into the output file(s)
    bundle: true,

    // Generate source maps for the output files
    sourcemap: true,

    // Allow importing modules from the 'k6' package, all its submodules, and
    // all HTTP(S) URLs (jslibs).
    external: [
        'k6', // Mark the 'k6' package as external
        'k6/*',       // Mark all submodules of 'k6' as external
        "/^https:\\/\\/jslib\\.k6\\.io\\/.*" // Regex to mark all jslib imports as external
    ],

    // By default, no minification is applied
    minify: false,
};

// Determine if this is a release build or a development build
if (Deno.env.get('NODE_ENV') === 'production') {
    // Setup release build options
    Object.assign(buildOptions, {
        // Minify the output files
        minify: true,

        // Drop debugger and console statements
        drop: ['debugger', 'console'],
    })
}

// Build the project
try {
    await build(buildOptions);
    console.log('✅ Build completed successfully');
} catch (error) {
    console.error('❌ Build failed:', error);
    Deno.exit(1);
}
