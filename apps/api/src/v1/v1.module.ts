import { Module } from '@nestjs/common';
import { DatasetsV1Controller } from './datasets/datasets-v1.controller';
import { ProjectsV1Controller } from './projects/projects-v1.controller';
import { DatasetsModule } from '../datasets/datasets.module';
import { ProjectsModule } from '../projects/projects.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [DatasetsModule, ProjectsModule, ApiKeysModule],
  controllers: [DatasetsV1Controller, ProjectsV1Controller],
})
export class V1Module {}