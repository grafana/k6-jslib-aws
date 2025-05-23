import eslint from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import babelPlugin from '@babel/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    // Apply to all JavaScript and TypeScript files
    {
        files: ['**/*.js', '**/*.mjs', '**/*.ts'],
        languageOptions: {
            parser: babelParser,
            parserOptions: {
                ecmaVersion: 6,
                requireConfigFile: false,
            },
            globals: {
                // Allow specific global types present in the k6 JS runtime natively
                Uint8Array: 'readonly',
                Set: 'readonly',
                console: 'readonly',
                __ENV: 'readonly',
                open: 'readonly',
            },
        },
        plugins: {
            '@babel': babelPlugin,
        },
        rules: {
            ...eslint.configs.recommended.rules,
        },
    },
    
    // TypeScript-specific configuration
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 6,
                project: './tsconfig.json',
            },
            globals: {
                // Allow specific global types present in the k6 JS runtime natively
                Uint8Array: 'readonly',
                Set: 'readonly',
                console: 'readonly',
                __ENV: 'readonly',
                open: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...typescriptEslint.configs.recommended.rules,
        },
    },
    
    // Ignore patterns (equivalent to the old ignores property)
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'public/**',
            'build/**',
        ],
    },
]; 