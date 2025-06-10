import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test directory structure
    include: ['test/**/*.test.ts'],
    
    // Environment setup
    environment: 'node',
    
    // Global test settings
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '*.config.*',
        'examples/',
        'documentation.md'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Reporter configuration
    reporter: ['verbose', 'html'],
    
    // Test setup files
    setupFiles: ['./test/setup.ts']
  },
  
  // TypeScript resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test')
    }
  },
  
  // Define for test environment
  define: {
    'import.meta.vitest': 'undefined'
  }
});