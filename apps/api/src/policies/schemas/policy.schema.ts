import * as Joi from 'joi';

export interface PolicyYAML {
  name: string;
  version: string;
  description: string;
  detection: {
    entities: Array<{
      type: string;
      confidence_threshold: number;
      action: 'redact' | 'mask' | 'replace' | 'encrypt';
      replacement?: string;
    }>;
  };
  scope: {
    file_types: string[];
    max_file_size: string;
  };
  anonymization: {
    default_action: 'redact' | 'mask' | 'replace' | 'encrypt';
    preserve_format: boolean;
    audit_trail: boolean;
  };
}

export const PolicyYAMLSchema = Joi.object<PolicyYAML>({
  name: Joi.string().min(1).max(255).required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  description: Joi.string().max(1000).required(),
  
  detection: Joi.object({
    entities: Joi.array().items(
      Joi.object({
        type: Joi.string().valid(
          'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 
          'SSN', 'IBAN', 'IP_ADDRESS', 'DATE_TIME', 'LOCATION', 
          'ORGANIZATION', 'MEDICAL_LICENSE', 'US_DRIVER_LICENSE', 
          'US_PASSPORT', 'UK_NHS', 'URL'
        ).required(),
        confidence_threshold: Joi.number().min(0).max(1).required(),
        action: Joi.string().valid('redact', 'mask', 'replace', 'encrypt').required(),
        replacement: Joi.string().max(50).when('action', {
          is: 'replace',
          then: Joi.required(),
          otherwise: Joi.optional()
        })
      })
    ).min(1).required()
  }).required(),
  
  scope: Joi.object({
    file_types: Joi.array().items(
      Joi.string().valid('txt', 'csv', 'json', 'pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png', 'tiff')
    ).min(1).required(),
    max_file_size: Joi.string().pattern(/^\d+[KMGT]?B$/).required()
  }).required(),
  
  anonymization: Joi.object({
    default_action: Joi.string().valid('redact', 'mask', 'replace', 'encrypt').required(),
    preserve_format: Joi.boolean().required(),
    audit_trail: Joi.boolean().required()
  }).required()
});

export const DEFAULT_POLICY_YAML: PolicyYAML = {
  name: "Default PII Detection Policy",
  version: "1.0.0", 
  description: "Default policy for PII detection and protection",
  detection: {
    entities: [
      { type: "EMAIL_ADDRESS", confidence_threshold: 0.9, action: "redact" },
      { type: "PERSON", confidence_threshold: 0.85, action: "mask" },
      { type: "PHONE_NUMBER", confidence_threshold: 0.8, action: "replace", replacement: "[PHONE]" },
      { type: "CREDIT_CARD", confidence_threshold: 0.95, action: "redact" },
      { type: "SSN", confidence_threshold: 0.95, action: "redact" }
    ]
  },
  scope: {
    file_types: ["txt", "csv", "pdf", "docx"],
    max_file_size: "100MB"
  },
  anonymization: {
    default_action: "redact",
    preserve_format: true,
    audit_trail: true
  }
};