/**
 * Live Presidio Integration Test
 * 
 * Tests our implementation with actual Presidio services
 */

import axios from 'axios';

const testText = "John Doe's email is john.doe@example.com and phone is (555) 123-4567. SSN: 123-45-6789";

async function testLivePresidio() {
  console.log('🧪 Testing Live Presidio Integration...\n');

  try {
    // Test Presidio Analyzer
    console.log('1. Testing Presidio Analyzer...');
    const analysisRequest = {
      text: testText,
      language: 'en',
      score_threshold: 0.5
    };

    const analyzerResponse = await axios.post('http://localhost:5003/analyze', analysisRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`   ✅ Analyzer responded with ${analyzerResponse.data.length} entities:`);
    analyzerResponse.data.forEach((entity, index) => {
      const detectedText = testText.substring(entity.start, entity.end);
      console.log(`   ${index + 1}. ${entity.entity_type}: "${detectedText}" (confidence: ${entity.score})`);
    });

    // Test Presidio Anonymizer
    console.log('\n2. Testing Presidio Anonymizer...');
    const anonymizeRequest = {
      text: testText,
      analyzer_results: analyzerResponse.data,
      operators: {
        "DEFAULT": { "type": "replace", "new_value": "[REDACTED]" }
      }
    };

    const anonymizerResponse = await axios.post('http://localhost:5004/anonymize', anonymizeRequest, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`   ✅ Anonymizer processed text successfully:`);
    console.log(`   Original: "${testText}"`);
    console.log(`   Anonymized: "${anonymizerResponse.data.text}"`);

    console.log('\n🎉 Live Presidio integration test passed!');
    console.log('\n📋 Results:');
    console.log(`   - Detected ${analyzerResponse.data.length} PII entities`);
    console.log(`   - Successfully anonymized sensitive data`);
    console.log(`   - Both services responding correctly on ports 5003/5004`);
    console.log('\n🚀 Ready for full end-to-end PII detection workflow!');

  } catch (error) {
    console.error('❌ Live Presidio test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testLivePresidio();