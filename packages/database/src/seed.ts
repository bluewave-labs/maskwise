import { PrismaClient, UserRole, PolicyTemplateCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@maskwise.com' },
    update: {},
    create: {
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@maskwise.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Administrator',
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create default policy
  const defaultPolicy = await prisma.policy.upsert({
    where: { id: 'default-policy' },
    update: {},
    create: {
      id: 'default-policy',
      name: 'Default PII Detection Policy',
      description: 'Standard policy for detecting common PII entities',
      isDefault: true,
      version: '1.0.0',
      config: {
        entities: [
          'PERSON',
          'EMAIL_ADDRESS',
          'PHONE_NUMBER',
          'CREDIT_CARD',
          'SSN',
          'IP_ADDRESS',
          'DATE_TIME',
          'LOCATION'
        ],
        anonymization: {
          default_anonymizer: 'mask',
          anonymizers: {
            mask: { type: 'mask', masking_char: '*', chars_to_mask: 4, from_end: true },
            redact: { type: 'redact' },
            replace: { type: 'replace', new_value: '[REDACTED]' }
          }
        },
        confidence_threshold: 0.8
      }
    },
  });

  console.log('Created default policy:', defaultPolicy.name);

  // Create policy templates
  const templates = [
    {
      name: 'GDPR Compliance',
      description: 'Policy template for GDPR compliance with EU data protection requirements',
      category: PolicyTemplateCategory.GDPR,
      tags: ['gdpr', 'eu', 'privacy', 'compliance'],
      config: {
        entities: ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'IP_ADDRESS', 'LOCATION'],
        anonymization: {
          default_anonymizer: 'redact',
          anonymizers: {
            redact: { type: 'redact' }
          }
        },
        confidence_threshold: 0.9
      }
    },
    {
      name: 'HIPAA Healthcare',
      description: 'Healthcare data protection policy compliant with HIPAA regulations',
      category: PolicyTemplateCategory.HIPAA,
      tags: ['hipaa', 'healthcare', 'medical', 'phi'],
      config: {
        entities: ['PERSON', 'MEDICAL_LICENSE', 'PHONE_NUMBER', 'EMAIL_ADDRESS', 'DATE_TIME'],
        anonymization: {
          default_anonymizer: 'mask',
          anonymizers: {
            mask: { type: 'mask', masking_char: 'X', chars_to_mask: 6, from_end: false }
          }
        },
        confidence_threshold: 0.85
      }
    },
    {
      name: 'Financial Services',
      description: 'Policy for financial data including credit cards, banking information',
      category: PolicyTemplateCategory.FINANCE,
      tags: ['finance', 'banking', 'credit-card', 'pci'],
      config: {
        entities: ['CREDIT_CARD', 'IBAN', 'SSN', 'PERSON', 'PHONE_NUMBER'],
        anonymization: {
          default_anonymizer: 'replace',
          anonymizers: {
            replace: { type: 'replace', new_value: '[FINANCIAL_DATA]' }
          }
        },
        confidence_threshold: 0.95
      }
    }
  ];

  for (const template of templates) {
    await prisma.policyTemplate.upsert({
      where: { id: template.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: template.name.toLowerCase().replace(/\s+/g, '-'),
        ...template,
      },
    });
    console.log('Created policy template:', template.name);
  }

  // Create system configuration
  const systemConfigs = [
    { key: 'features.unlearning.enabled', value: false },
    { key: 'features.cloud_connectors.enabled', value: true },
    { key: 'features.sso.enabled', value: false },
    { key: 'system.max_file_size', value: 100 * 1024 * 1024 }, // 100MB
    { key: 'system.supported_languages', value: ['en'] },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
    console.log('Created system config:', config.key);
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });