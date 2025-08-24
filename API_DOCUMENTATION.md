# Maskwise API Documentation

## Overview

The Maskwise API provides programmatic access to PII detection and anonymization capabilities. The API uses REST principles with JSON payloads and supports both JWT authentication (for admin users) and API key authentication (for programmatic access).

## Base URLs

- **Development**: `http://localhost:3001`
- **API Documentation**: `http://localhost:3001/api/docs` (Swagger UI)

## Authentication

### JWT Authentication (Admin UI)
Used by the web dashboard and admin operations.

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@maskwise.com", 
  "password": "admin123"
}
```

### API Key Authentication (Programmatic Access)
Used for programmatic access via the v1 API endpoints.

```bash
Authorization: Bearer mk_live_xxxxx_yyyyyy
```

## API Key Management

### Generate API Key
Generate a new API key for programmatic access.

```bash
POST /api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My API Key"
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "cme12345",
    "name": "My API Key", 
    "prefix": "mk_live_abcd1234",
    "isActive": true,
    "lastUsedAt": null,
    "createdAt": "2025-08-24T00:00:00.000Z",
    "expiresAt": null
  },
  "fullKey": "mk_live_abcd1234_full_secret_key_here"
}
```

⚠️ **Important**: The `fullKey` is only returned once during generation. Store it securely!

### List API Keys
List all API keys for the authenticated user.

```bash
GET /api-keys
Authorization: Bearer <jwt_token>
```

### Update API Key
Update API key properties (name, status).

```bash
PUT /api-keys/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Updated API Key Name",
  "isActive": false
}
```

### Delete API Key
Permanently delete an API key.

```bash
DELETE /api-keys/:id
Authorization: Bearer <jwt_token>
```

## v1 API Endpoints

All v1 endpoints require API key authentication using the `Authorization: Bearer` header.

### Projects

#### Create Project
```bash
POST /v1/projects
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "tags": ["tag1", "tag2"]
}
```

#### List Projects
```bash
GET /v1/projects
Authorization: Bearer <api_key>
```

#### Get Project Details
```bash
GET /v1/projects/:id
Authorization: Bearer <api_key>
```

#### Get Project Statistics
```bash
GET /v1/projects/:id/stats
Authorization: Bearer <api_key>
```

### Datasets

#### Upload File for PII Analysis
```bash
POST /v1/datasets/upload
Authorization: Bearer <api_key>
Content-Type: multipart/form-data

Form Data:
- file: <file_to_upload>
- projectId: <project_id>
- name: <optional_dataset_name>
```

#### List Datasets
```bash
GET /v1/datasets?page=1&limit=10&projectId=<project_id>
Authorization: Bearer <api_key>
```

#### Get Dataset Details
```bash
GET /v1/datasets/:id
Authorization: Bearer <api_key>
```

#### Get PII Findings
```bash
GET /v1/datasets/:id/findings?page=1&limit=50
Authorization: Bearer <api_key>
```

**Response:**
```json
{
  "findings": [
    {
      "id": "finding_id",
      "entityType": "EMAIL_ADDRESS",
      "confidence": 0.95,
      "context": "Contact us at john@example.com for more info",
      "lineNumber": 5,
      "startPosition": 14,
      "endPosition": 29
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

## Supported File Types

- **Text Files**: .txt, .csv, .json, .jsonl
- **Documents**: .pdf, .docx, .xlsx (via Apache Tika)
- **Images**: .png, .jpg, .tiff (via Tesseract OCR)

## PII Entity Types Detected

- `EMAIL_ADDRESS` - Email addresses
- `PHONE_NUMBER` - Phone numbers (various formats)
- `PERSON` - Person names
- `CREDIT_CARD` - Credit card numbers
- `SSN` - Social Security Numbers
- `DATE_TIME` - Dates and timestamps
- `LOCATION` - Addresses and locations
- `IP_ADDRESS` - IP addresses
- `URL` - Web URLs
- `ORGANIZATION` - Company/organization names
- `MEDICAL_LICENSE` - Medical license numbers
- `US_DRIVER_LICENSE` - US driver license numbers
- `US_PASSPORT` - US passport numbers
- `UK_NHS` - UK NHS numbers
- `IBAN` - International bank account numbers

## Rate Limiting

- **JWT Endpoints**: 100 requests per minute per IP
- **API Key Endpoints**: No rate limiting currently applied

## Error Responses

All API endpoints return standardized error responses:

```json
{
  "message": "Error description",
  "error": "Error type",
  "statusCode": 400
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - Success (no content)
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Example Workflows

### Complete PII Analysis Workflow

1. **Generate API Key** (one-time setup)
```bash
# Login as admin
POST /auth/login
{
  "email": "admin@maskwise.com",
  "password": "admin123"
}

# Generate API key
POST /api-keys
Authorization: Bearer <jwt_token>
{
  "name": "Production API Key"
}
```

2. **Create Project**
```bash
POST /v1/projects
Authorization: Bearer <api_key>
{
  "name": "Customer Data Analysis",
  "description": "Analyzing customer support tickets for PII"
}
```

3. **Upload File for Analysis**
```bash
POST /v1/datasets/upload
Authorization: Bearer <api_key>
Content-Type: multipart/form-data

Form Data:
- file: customer_data.csv
- projectId: <project_id>
- name: "Customer Support Tickets Q4"
```

4. **Check Processing Status**
```bash
GET /v1/datasets/:dataset_id
Authorization: Bearer <api_key>
```

5. **Retrieve PII Findings**
```bash
GET /v1/datasets/:dataset_id/findings
Authorization: Bearer <api_key>
```

## Security Best Practices

### API Key Security
- Store API keys securely (environment variables, key management systems)
- Never commit API keys to version control
- Rotate API keys regularly
- Use different API keys for different environments
- Monitor API key usage and disable unused keys

### Data Protection
- All API communications use HTTPS in production
- Files are stored securely with unique naming
- PII findings are stored with context masking
- Original file content is not persisted beyond processing

### Access Control
- API keys are scoped to individual users
- All operations are audit logged
- Inactive API keys are automatically rejected
- Admin privileges required for API key management

## Support

- **API Documentation**: http://localhost:3001/api/docs
- **Admin Dashboard**: http://localhost:3004
- **Technical Issues**: Check audit logs in the admin dashboard

## Changelog

### v1.0 (Current)
- Initial API key authentication system
- Core PII detection endpoints
- Project and dataset management
- Support for text, document, and image files
- Comprehensive audit logging