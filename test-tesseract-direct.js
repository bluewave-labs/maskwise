#!/usr/bin/env node

const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

async function testTesseract() {
  try {
    console.log('Testing Tesseract OCR directly...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/test-pii-document.png'));
    formData.append('options', JSON.stringify({
      languages: ['eng']
    }));
    
    const response = await axios.post('http://localhost:8884/tesseract', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    console.log('OCR Response:', response.data);
    console.log('Extracted text:', response.data.data.stdout.trim());
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testTesseract();