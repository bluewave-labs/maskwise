import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './services/policies.service';
import { YamlValidationService } from './services/yaml-validation.service';
import { DatabaseModule } from '../common/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PoliciesController],
  providers: [PoliciesService, YamlValidationService],
  exports: [PoliciesService, YamlValidationService],
})
export class PoliciesModule {}