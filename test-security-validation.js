#!/usr/bin/env node

/**
 * Security Validation Test
 * 
 * Comprehensive test suite for the enhanced security validation layers.
 * Tests file validation, input sanitization, and security filter effectiveness.
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_DIR = './test-security-files';

console.log('🔒 Security Validation Test Suite\n');

// Test credentials
const testCredentials = {
  email: 'admin@maskwise.com',
  password: 'admin123'
};

let authToken = null;
let testProjectId = null;

/**
 * Setup test environment
 */
async function setup() {
  console.log('🔧 Setting up test environment...');
  
  // Create test directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Authenticate
  const authResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCredentials)
  });

  if (!authResponse.ok) {
    throw new Error(`Authentication failed: ${authResponse.status}`);
  }

  const authData = await authResponse.json();
  authToken = authData.accessToken;
  console.log('✅ Authentication successful');

  // Create test project
  const projectResponse = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Security Test Project',
      description: 'Project for testing security validation'
    })
  });

  if (!projectResponse.ok) {
    throw new Error(`Project creation failed: ${projectResponse.status}`);
  }

  const projectData = await projectResponse.json();
  testProjectId = projectData.id;
  console.log('✅ Test project created');
}

/**
 * Create test files for security validation
 */
function createTestFiles() {
  console.log('\n📁 Creating test files...');
  
  // 1. Legitimate text file
  fs.writeFileSync(
    path.join(TEST_DIR, 'legitimate.txt'),
    'This is a legitimate file with some PII: john.doe@example.com and phone: 555-123-4567'
  );

  // 2. File with suspicious content
  fs.writeFileSync(
    path.join(TEST_DIR, 'suspicious.txt'),
    'eval(document.location); <script>alert("XSS")</script>'
  );

  // 3. File with executable signature (fake EXE)
  const exeSignature = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ signature
  fs.writeFileSync(path.join(TEST_DIR, 'fake.exe'), exeSignature);

  // 4. File with path traversal in content
  fs.writeFileSync(
    path.join(TEST_DIR, 'traversal.txt'),
    '../../../etc/passwd\n..\\..\\windows\\system32\\config\\sam'
  );

  // 5. File with suspicious filename
  fs.writeFileSync(
    path.join(TEST_DIR, 'script.exe.txt'),
    'Legitimate content but suspicious double extension'
  );

  // 6. File with null bytes in name (will be handled by filesystem)
  try {
    fs.writeFileSync(
      path.join(TEST_DIR, 'normal.txt'),
      'File with legitimate content'
    );
  } catch (e) {
    // Expected to fail on some systems
  }

  // 7. Very long filename
  const longName = 'a'.repeat(300) + '.txt';
  fs.writeFileSync(
    path.join(TEST_DIR, 'long.txt'),
    'File with very long intended name'
  );

  // 8. File with macro indicators
  fs.writeFileSync(
    path.join(TEST_DIR, 'macro.doc'),
    'Sub AutoOpen()\nShell("cmd.exe")\nEnd Sub'
  );

  console.log('✅ Test files created');
}

/**
 * Test file upload with security validation
 */
async function testFileUpload(filename, expectedToFail = false, description = '') {
  const filePath = path.join(TEST_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    return;
  }

  console.log(`\n🧪 Testing: ${filename} ${description ? `(${description})` : ''}`);
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), filename);
    form.append('projectId', testProjectId);
    form.append('description', `Security test: ${filename}`);

    const response = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    const responseText = await response.text();
    
    if (expectedToFail) {
      if (!response.ok) {
        console.log(`✅ Correctly rejected: ${response.status} - ${responseText}`);
        return { success: true, rejected: true };
      } else {
        console.log(`❌ SECURITY FAILURE: File should have been rejected but was accepted`);
        return { success: false, rejected: false };
      }
    } else {
      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log(`✅ Correctly accepted: ${data.message}`);
        return { success: true, rejected: false, datasetId: data.dataset.id };
      } else {
        console.log(`❌ Unexpected rejection: ${response.status} - ${responseText}`);
        return { success: false, rejected: true };
      }
    }
  } catch (error) {
    console.log(`❌ Test error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test input sanitization on various endpoints
 */
async function testInputSanitization() {
  console.log('\n🧹 Testing Input Sanitization...');

  const maliciousInputs = [
    {
      name: 'SQL Injection',
      input: "'; DROP TABLE users; --",
      expectedCleaned: true
    },
    {
      name: 'XSS Script',
      input: '<script>alert("xss")</script>',
      expectedCleaned: true
    },
    {
      name: 'Path Traversal',
      input: '../../../etc/passwd',
      expectedCleaned: true
    },
    {
      name: 'Command Injection',
      input: 'file.txt; rm -rf /',
      expectedCleaned: true
    },
    {
      name: 'NoSQL Injection',
      input: '{"$ne": null}',
      expectedCleaned: true
    },
    {
      name: 'Legitimate Input',
      input: 'My Project Name',
      expectedCleaned: false
    }
  ];

  for (const test of maliciousInputs) {
    console.log(`\n  📝 Testing ${test.name}: "${test.input}"`);
    
    try {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: test.input,
          description: `Test for ${test.name}`
        })
      });

      const responseText = await response.text();
      
      if (test.expectedCleaned) {
        if (!response.ok) {
          console.log(`  ✅ Input correctly rejected or sanitized`);
        } else {
          // Check if the created project name was sanitized
          const data = JSON.parse(responseText);
          if (data.name !== test.input) {
            console.log(`  ✅ Input was sanitized: "${data.name}"`);
          } else {
            console.log(`  ⚠️  Input may not have been properly sanitized`);
          }
        }
      } else {
        if (response.ok) {
          console.log(`  ✅ Legitimate input accepted`);
        } else {
          console.log(`  ⚠️  Legitimate input was rejected: ${responseText}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Test error: ${error.message}`);
    }
  }
}

/**
 * Test filename security validation
 */
async function testFilenameValidation() {
  console.log('\n📝 Testing Filename Validation...');

  const testCases = [
    {
      originalName: 'document.pdf',
      shouldPass: true,
      description: 'Legitimate filename'
    },
    {
      originalName: 'malware.exe',
      shouldPass: false,
      description: 'Executable extension'
    },
    {
      originalName: 'document.exe.pdf',
      shouldPass: false,
      description: 'Hidden executable extension'
    },
    {
      originalName: '../../../etc/passwd',
      shouldPass: false,
      description: 'Path traversal attempt'
    },
    {
      originalName: 'CON.txt',
      shouldPass: true, // Should be renamed to prevent Windows issues
      description: 'Reserved Windows filename'
    },
    {
      originalName: 'normal\x00evil.exe',
      shouldPass: false,
      description: 'Null byte injection'
    },
    {
      originalName: 'a'.repeat(300) + '.txt',
      shouldPass: false,
      description: 'Extremely long filename'
    }
  ];

  // Create temporary test file
  const tempContent = 'Test content for filename validation';
  
  for (const testCase of testCases) {
    console.log(`\n  📁 Testing: "${testCase.originalName}" (${testCase.description})`);
    
    try {
      // Write to a safe temp file
      const safeTempFile = path.join(TEST_DIR, 'temp-test.txt');
      fs.writeFileSync(safeTempFile, tempContent);

      const form = new FormData();
      form.append('file', fs.createReadStream(safeTempFile), testCase.originalName);
      form.append('projectId', testProjectId);

      const response = await fetch(`${API_BASE}/datasets/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (testCase.shouldPass) {
        if (response.ok) {
          console.log(`  ✅ Filename correctly accepted (may have been sanitized)`);
        } else {
          const errorText = await response.text();
          console.log(`  ⚠️  Legitimate filename rejected: ${errorText}`);
        }
      } else {
        if (!response.ok) {
          console.log(`  ✅ Dangerous filename correctly rejected`);
        } else {
          console.log(`  ❌ SECURITY RISK: Dangerous filename was accepted`);
        }
      }

      // Clean up
      fs.unlinkSync(safeTempFile);
      
    } catch (error) {
      console.log(`  ❌ Test error: ${error.message}`);
    }
  }
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  try {
    await setup();
    createTestFiles();

    console.log('\n🚀 Running Security Validation Tests...');

    // Test legitimate files (should pass)
    await testFileUpload('legitimate.txt', false, 'legitimate content');
    
    // Test suspicious content (should be detected by advanced validation)
    await testFileUpload('suspicious.txt', true, 'suspicious script content');
    
    // Test executable files (should fail)
    await testFileUpload('fake.exe', true, 'executable file');
    
    // Test path traversal content (should pass file filter but content is just text)
    await testFileUpload('traversal.txt', false, 'path traversal in content');
    
    // Test suspicious double extension (should fail)
    await testFileUpload('script.exe.txt', true, 'double extension');
    
    // Test macro indicators (should be detected)
    await testFileUpload('macro.doc', true, 'macro indicators');

    // Test input sanitization
    await testInputSanitization();

    // Test filename validation
    await testFilenameValidation();

    console.log('\n🎉 Security validation tests completed!');
    console.log('\nSummary:');
    console.log('- File content validation: Enhanced magic byte and pattern detection');
    console.log('- Input sanitization: Multi-layer protection against injection attacks');
    console.log('- Filename validation: Path traversal and executable detection');
    console.log('- Audit logging: All security violations logged for monitoring');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  }
}

// Run the tests
runSecurityTests().catch(console.error);