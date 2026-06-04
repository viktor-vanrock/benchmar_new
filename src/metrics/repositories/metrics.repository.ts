import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '@/common/dtos/paginationDto.dto';
import { SortDirection } from '@/common/enums/sortDirection.enum';
import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import { MetricDefinition, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateMetricDefinitionDto } from '../dto/create-metric-definition.dto';
import { CreateMetricResultDto } from '../dto/create-metric-result.dto';
import { CreateModelDto } from '../dto/create-model.dto';
import { UpdateMetricDefinitionDto } from '../dto/update-metric-definition.dto';
import { IMetricsRepository } from './metrics.repository.interface';

@Injectable()
export class MetricsRepository implements IMetricsRepository {
  private readonly logger = new Logger(MetricsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllMetrics(
    queryParams: PaginationDto
  ): Promise<InfiniteDataResponseType<MetricDefinition>> {
    const {
      search,
      page,
      limit,
      sortColumn,
      sortDirection = SortDirection.Asc,
    } = queryParams;

    this.logger.debug(
      `Fetching metric definitions: page=${page}, limit=${limit}, search="${search ?? ''}", sortColumn="${sortColumn ?? ''}", sortDirection="${sortDirection}"`
    );

    const where: Prisma.MetricDefinitionWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortColumns = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'displayName',
    ]);

    const sort =
      sortColumn && allowedSortColumns.has(sortColumn)
        ? sortColumn
        : 'createdAt';

    const prismaSortDirection =
      sortDirection === SortDirection.Asc ? 'asc' : 'desc';

    const orderBy: Prisma.MetricDefinitionOrderByWithRelationInput = {
      [sort]: prismaSortDirection,
    };

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.metricDefinition.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          priority: true,
          direction: true,
        },
      }),
      this.prisma.metricDefinition.count({ where }),
    ]);

    this.logger.debug(
      `Fetched metric definitions: returned=${data.length}, total=${total}`
    );

    return { data, total };
  }

  async findMetricById(id: string): Promise<Nullable<MetricDefinition>> {
    this.logger.debug(`Finding metric definition by id="${id}"`);

    return this.prisma.metricDefinition.findUnique({
      where: { id },
      include: {
        priority: true,
        direction: true,
      },
    });
  }

  async findMetricByName(name: string): Promise<Nullable<MetricDefinition>> {
    this.logger.debug(`Finding metric definition by name="${name}"`);

    return this.prisma.metricDefinition.findUnique({
      where: { name },
    });
  }

  async createMetric(
    data: CreateMetricDefinitionDto
  ): Promise<MetricDefinition> {
    this.logger.debug(`Creating metric definition name="${data.name}"`);

    const metric = await this.prisma.metricDefinition.create({
      data: this.toPrismaWriteInput(data),
      include: {
        priority: true,
        direction: true,
      },
    });

    this.logger.log(
      `Metric definition created: id="${metric.id}", name="${metric.name}"`
    );

    return metric;
  }

  async updateMetricById(
    id: string,
    updateData: UpdateMetricDefinitionDto
  ): Promise<MetricDefinition> {
    this.logger.debug(`Updating metric definition id="${id}"`);

    const metric = await this.prisma.metricDefinition.update({
      where: { id },
      data: this.toPrismaUpdateInput(updateData),
      include: {
        priority: true,
        direction: true,
      },
    });

    this.logger.log(`Metric definition updated: id="${metric.id}"`);

    return metric;
  }

  async deleteMetricById(id: string): Promise<void> {
    this.logger.debug(`Deleting metric definition id="${id}"`);

    await this.prisma.metricDefinition.delete({ where: { id } });

    this.logger.log(`Metric definition deleted: id="${id}"`);
  }

  async existsPriority(priorityId: string): Promise<boolean> {
    const found = await this.prisma.metricPriorityLookup.findUnique({
      where: { id: priorityId },
      select: { id: true },
    });

    return !!found;
  }

  async existsDirection(directionId: string): Promise<boolean> {
    const found = await this.prisma.metricDirectionLookup.findUnique({
      where: { id: directionId },
      select: { id: true },
    });

    return !!found;
  }

  async findAllPriorities() {
    return this.prisma.metricPriorityLookup.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllDirections() {
    return this.prisma.metricDirectionLookup.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async ensureDefaultLookups(): Promise<void> {
    await this.prisma.metricPriorityLookup.upsert({
      where: { code: 'primary' },
      update: {},
      create: {
        code: 'primary',
        name: 'Primary',
        description: 'Primary metric',
      },
    });

    await this.prisma.metricPriorityLookup.upsert({
      where: { code: 'secondary' },
      update: {},
      create: {
        code: 'secondary',
        name: 'Secondary',
        description: 'Secondary metric',
      },
    });

    await this.prisma.metricDirectionLookup.upsert({
      where: { code: 'higher_is_better' },
      update: {},
      create: {
        code: 'higher_is_better',
        name: 'Higher is better',
        description: 'Higher metric value is better',
      },
    });

    await this.prisma.metricDirectionLookup.upsert({
      where: { code: 'lower_is_better' },
      update: {},
      create: {
        code: 'lower_is_better',
        name: 'Lower is better',
        description: 'Lower metric value is better',
      },
    });
  }

  async createModel(data: CreateModelDto) {
    return this.prisma.model.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        provider: data.provider,
        isOpenSource: data.isOpenSource ?? false,
      },
      update: {
        name: data.name,
        provider: data.provider,
        isOpenSource: data.isOpenSource ?? false,
      },
    });
  }

  async findAllModels() {
    return this.prisma.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findModelById(id: string) {
    return this.prisma.model.findUnique({
      where: { id },
    });
  }

  async createMetricResult(data: CreateMetricResultDto) {
    this.logger.debug(
      `Creating metric result: testId="${data.testId}", metricId="${data.metricId}", modelId="${data.modelId}"`
    );

    const test = await this.prisma.benchmarkTest.findFirst({
      where: {
        id: data.testId,
        deletedAt: null,
        benchmark: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        benchmarkId: true,
      },
    });

    if (!test) {
      this.logger.warn(
        `Cannot create metric result: benchmark test id="${data.testId}" was not found or was deleted`
      );

      throw new NotFoundException(
        `Benchmark test with id "${data.testId}" was not found`
      );
    }

    if (data.subsetId) {
      const subset = await this.prisma.datasetSubset.findFirst({
        where: {
          id: data.subsetId,
          testId: data.testId,
        },
        select: {
          id: true,
        },
      });

      if (!subset) {
        this.logger.warn(
          `Cannot create metric result: subset id="${data.subsetId}" was not found for test id="${data.testId}"`
        );

        throw new NotFoundException(
          `Dataset subset with id "${data.subsetId}" was not found for benchmark test "${data.testId}"`
        );
      }
    }

    const result = await this.prisma.metricResult.create({
      data: {
        benchmark: {
          connect: {
            id: test.benchmarkId,
          },
        },
        test: {
          connect: {
            id: data.testId,
          },
        },
        subset: data.subsetId
          ? {
            connect: {
              id: data.subsetId,
            },
          }
          : undefined,
        metric: {
          connect: {
            id: data.metricId,
          },
        },
        model: {
          connect: {
            id: data.modelId,
          },
        },
        value: data.value,
        rawValue: data.rawValue,
        obtainedAt: data.obtainedAt ? new Date(data.obtainedAt) : new Date(),
        importSource: data.importSource,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
      include: {
        metric: true,
        model: true,
        test: true,
      },
    });

    await this.prisma.benchmarkTestMetric.upsert({
      where: {
        testId_metricId: {
          testId: data.testId,
          metricId: data.metricId,
        },
      },
      update: {},
      create: {
        testId: data.testId,
        metricId: data.metricId,
        sortOrder: 0,
      },
    });

    this.logger.log(
      `Metric result created: testId="${data.testId}", metricId="${data.metricId}", modelId="${data.modelId}"`
    );

    return result;
  }

  async findMetricResultsByTestId(testId: string) {
    return this.prisma.metricResult.findMany({
      where: { testId },
      orderBy: { obtainedAt: 'desc' },
      include: {
        metric: true,
        model: true,
      },
    });
  }

  private toPrismaWriteInput(
    data: CreateMetricDefinitionDto
  ): Prisma.MetricDefinitionCreateInput {
    return {
      name: data.name,
      displayName: data.displayName ?? null,
      priority: { connect: { id: data.priorityId } },
      direction: { connect: { id: data.directionId } },
      minValue: data.minValue ?? null,
      maxValue: data.maxValue ?? null,
      targetValue: data.targetValue ?? null,
      evaluationLogic: data.evaluationLogic ?? null,
      requiredGigaChatQualityLevel: data.requiredGigaChatQualityLevel ?? null,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
    };
  }

  private toPrismaUpdateInput(
    data: UpdateMetricDefinitionDto
  ): Prisma.MetricDefinitionUpdateInput {
    const input: Prisma.MetricDefinitionUpdateInput = {};

    if (data.name !== undefined) {
      input.name = data.name;
    }

    if (data.displayName !== undefined) {
      input.displayName = data.displayName;
    }

    if (data.priorityId !== undefined) {
      input.priority = { connect: { id: data.priorityId } };
    }

    if (data.directionId !== undefined) {
      input.direction = { connect: { id: data.directionId } };
    }

    if (data.minValue !== undefined) {
      input.minValue = data.minValue;
    }

    if (data.maxValue !== undefined) {
      input.maxValue = data.maxValue;
    }

    if (data.targetValue !== undefined) {
      input.targetValue = data.targetValue;
    }

    if (data.evaluationLogic !== undefined) {
      input.evaluationLogic = data.evaluationLogic;
    }

    if (data.requiredGigaChatQualityLevel !== undefined) {
      input.requiredGigaChatQualityLevel = data.requiredGigaChatQualityLevel;
    }

    if (data.metadata !== undefined) {
      input.metadata = data.metadata as Prisma.InputJsonValue;
    }

    return input;
  }
}
