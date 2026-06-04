import { Injectable, Logger } from '@nestjs/common';
import { SortDirection } from '@/common/enums/sortDirection.enum';
import { InfiniteDataResponseType } from '@/common/types/infiniteDataResponse.type';
import {
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BenchmarkCatalogQueryDto,
  BenchmarkSortColumn,
} from '../dto/benchmarkCatalogQueryDto.dto';
import { CreateCatalogBenchmarkDto } from '../dto/createCatalogBenchmark.dto';
import { UpdateCatalogBenchmarkDto } from '../dto/updateCatalogBenchmark.dto';
import {
  benchmarkTestFullInclude,
  BenchmarkTestWithRelations,
  CatalogFilterOptionsType,
} from '../types';
import { ICatalogRepository } from './catalog.repository.interface';

@Injectable()
export class CatalogRepository implements ICatalogRepository {
  private readonly logger = new Logger(CatalogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllBenchmark(
    query: BenchmarkCatalogQueryDto
  ): Promise<InfiniteDataResponseType<BenchmarkTestWithRelations>> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.benchmarkTest.findMany({
        where,
        include: benchmarkTestFullInclude,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.prisma.benchmarkTest.count({
        where,
      }),
    ]);

    return { data, total };
  }

  async findBenchmarkById(
    id: string
  ): Promise<Nullable<BenchmarkTestWithRelations>> {
    return this.prisma.benchmarkTest.findFirst({
      where: {
        id,
        deletedAt: null,
        benchmark: {
          deletedAt: null,
        },
      },
      include: benchmarkTestFullInclude,
    });
  }

  async createBenchmark(
    data: CreateCatalogBenchmarkDto
  ): Promise<BenchmarkTestWithRelations> {
    const benchmarkId = data.suiteId ?? data.id;

    const test = await this.prisma.$transaction(async (tx) => {
      await tx.benchmark.upsert({
        where: {
          id: benchmarkId,
        },
        create: {
          id: benchmarkId,
          name: data.name,
          nameEn: data.nameEn,
          description: data.description,
          descriptionEn: data.descriptionEn,
        },
        update: {
          deletedAt: null,
        },
      });

      await tx.benchmarkTest.create({
        data: this.toCreateTestInput(data, benchmarkId),
      });

      await this.replaceMetrics(tx, data.id, data.metrics);

      return tx.benchmarkTest.findUniqueOrThrow({
        where: { id: data.id },
        include: benchmarkTestFullInclude,
      });
    });

    this.logger.log(`Benchmark test created: id="${test.id}"`);

    return test;
  }

  async updateBenchmarkById(
    id: string,
    data: UpdateCatalogBenchmarkDto
  ): Promise<BenchmarkTestWithRelations> {
    const test = await this.prisma.$transaction(async (tx) => {
      await tx.benchmarkTest.update({
        where: { id },
        data: this.toUpdateScalarInput(data),
      });

      await this.replaceRelations(tx, id, data);

      return tx.benchmarkTest.findUniqueOrThrow({
        where: { id },
        include: benchmarkTestFullInclude,
      });
    });

    this.logger.log(`Benchmark test updated: id="${test.id}"`);

    return test;
  }

  async softDeleteBenchmarkById(id: string): Promise<void> {
    await this.prisma.benchmarkTest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Benchmark test soft deleted: id="${id}"`);
  }

  async getFilterOptions(): Promise<CatalogFilterOptionsType> {
    const activeTestWhere = {
      deletedAt: null,
      benchmark: {
        deletedAt: null,
      },
    };

    const activeRelationWhere = {
      test: activeTestWhere,
    };

    const [
      macroGroups,
      subGroups,
      abilityTaxons,
      abilityTags,
      skills,
      domains,
      subdomains,
      languages,
      difficulties,
      taskTypes,
      modalities,
    ] = await this.prisma.$transaction([
      this.prisma.benchmarkTest.findMany({
        where: activeTestWhere,
        distinct: ['macroGroup'],
        select: { macroGroup: true },
      }),
      this.prisma.benchmarkTestSubGroup.findMany({
        where: activeRelationWhere,
        distinct: ['subGroup'],
        select: { subGroup: true },
      }),
      this.prisma.benchmarkTestAbilityTaxon.findMany({
        where: activeRelationWhere,
        distinct: ['taxon'],
        select: { taxon: true },
      }),
      this.prisma.benchmarkTestAbilityTag.findMany({
        where: activeRelationWhere,
        distinct: ['tag'],
        select: { tag: true },
      }),
      this.prisma.benchmarkTestSkill.findMany({
        where: activeRelationWhere,
        distinct: ['skill'],
        select: { skill: true },
      }),
      this.prisma.benchmarkTestDomain.findMany({
        where: activeRelationWhere,
        distinct: ['domain'],
        select: { domain: true },
      }),
      this.prisma.benchmarkTestSubdomain.findMany({
        where: activeRelationWhere,
        distinct: ['subdomain'],
        select: { subdomain: true },
      }),
      this.prisma.benchmarkTest.findMany({
        where: activeTestWhere,
        distinct: ['language'],
        select: { language: true },
      }),
      this.prisma.benchmarkTest.findMany({
        where: activeTestWhere,
        distinct: ['difficulty'],
        select: { difficulty: true },
      }),
      this.prisma.benchmarkTest.findMany({
        where: activeTestWhere,
        distinct: ['taskType'],
        select: { taskType: true },
      }),
      this.prisma.benchmarkTestModality.findMany({
        where: activeRelationWhere,
        distinct: ['modality'],
        select: { modality: true },
      }),
    ]);

    return {
      macroGroups: this.cleanSort(macroGroups.map((item) => item.macroGroup)),
      subGroups: this.cleanSort(subGroups.map((item) => item.subGroup)),
      abilityTaxons: this.cleanSort(abilityTaxons.map((item) => item.taxon)),
      abilityTags: this.cleanSort(abilityTags.map((item) => item.tag)),
      skills: this.cleanSort(skills.map((item) => item.skill)),
      domains: this.cleanSort(domains.map((item) => item.domain)),
      subdomains: this.cleanSort(subdomains.map((item) => item.subdomain)),
      languages: this.cleanSort(languages.map((item) => item.language)),
      difficulties: this.cleanSort(difficulties.map((item) => item.difficulty)),
      taskTypes: this.cleanSort(taskTypes.map((item) => item.taskType)),
      modalities: this.cleanSort(modalities.map((item) => item.modality)),
    };
  }

  private cleanSort(values: Array<string | null>): string[] {
    return values
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b));
  }

  private buildWhere(
    query: BenchmarkCatalogQueryDto
  ): Prisma.BenchmarkTestWhereInput {
    const where: Prisma.BenchmarkTestWhereInput = {
      deletedAt: null,
      benchmark: {
        deletedAt: null,
      },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { descriptionEn: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { taskDescription: { contains: query.search, mode: 'insensitive' } },
        { benchmark: { name: { contains: query.search, mode: 'insensitive' } } },
        { benchmark: { nameEn: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.macroGroups?.length) {
      where.macroGroup = { in: query.macroGroups };
    }

    if (query.subGroups?.length) {
      where.subGroups = { some: { subGroup: { in: query.subGroups } } };
    }

    if (query.abilityTaxons?.length) {
      where.abilityTaxons = { some: { taxon: { in: query.abilityTaxons } } };
    }

    if (query.abilityTags?.length) {
      where.abilityTags = { some: { tag: { in: query.abilityTags } } };
    }

    if (query.skills?.length) {
      where.skills = { some: { skill: { in: query.skills } } };
    }

    if (query.domains?.length) {
      where.domains = { some: { domain: { in: query.domains } } };
    }

    if (query.subdomains?.length) {
      where.subdomains = { some: { subdomain: { in: query.subdomains } } };
    }

    if (query.languages?.length) {
      where.language = { in: query.languages };
    }

    if (query.difficulties?.length) {
      where.difficulty = { in: query.difficulties };
    }

    if (query.taskTypes?.length) {
      where.taskType = { in: query.taskTypes };
    }

    if (query.modalities?.length) {
      where.modalities = {
        some: {
          modality: {
            in: query.modalities,
          },
        },
      };
    }

    if (query.fewShot !== undefined) where.fewShot = query.fewShot;
    if (query.rag !== undefined) where.rag = query.rag;
    if (query.tools !== undefined) where.tools = query.tools;
    if (query.reasoning !== undefined) where.reasoning = query.reasoning;
    if (query.longContext !== undefined) where.longContext = query.longContext;

    if (query.sizeMin !== undefined || query.sizeMax !== undefined) {
      where.sizeInSamples = {
        ...(query.sizeMin !== undefined ? { gte: query.sizeMin } : {}),
        ...(query.sizeMax !== undefined ? { lte: query.sizeMax } : {}),
      };
    }

    return where;
  }

  private buildOrderBy(
    query: BenchmarkCatalogQueryDto
  ): Prisma.BenchmarkTestOrderByWithRelationInput {
    const direction =
      query.sortDirection === SortDirection.Asc ? 'asc' : 'desc';

    switch (query.sortColumn) {
      case BenchmarkSortColumn.Name:
        return { name: direction };

      case BenchmarkSortColumn.SizeInSamples:
        return { sizeInSamples: direction };

      case BenchmarkSortColumn.Difficulty:
        return { difficulty: direction };

      case BenchmarkSortColumn.Language:
        return { language: direction };

      case BenchmarkSortColumn.CreatedAt:
      default:
        return { createdAt: direction };
    }
  }

  private toCreateTestInput(
    dto: CreateCatalogBenchmarkDto,
    benchmarkId: string
  ): Prisma.BenchmarkTestCreateInput {
    return {
      id: dto.id,
      benchmark: {
        connect: {
          id: benchmarkId,
        },
      },
      name: dto.name,
      nameEn: dto.nameEn,
      slug: dto.id,
      description: dto.description,
      descriptionEn: dto.descriptionEn,
      shortDescription: dto.shortDescription,
      taskDescription: dto.taskDescription,
      instructions: dto.instructions,
      instructionsEn: dto.instructionsEn,
      codebaseName: dto.codebase?.name,
      codebaseUrl: dto.codebase?.url,
      macroGroup: dto.macroGroup,
      taskType: dto.taskType,
      language: dto.language,
      difficulty: dto.difficulty,
      confidenceScore: dto.confidenceScore,
      confidentialityLevel: dto.confidentialityLevel,
      knowledgeLevel: dto.knowledgeLevel,
      importance: dto.importance,
      importanceComment: dto.importanceComment,
      contextFieldFormat: dto.contextFieldFormat,
      answerFieldFormat: dto.answerFieldFormat,
      evaluationLogic: dto.evaluationLogic,
      humanBaseline: dto.humanBaseline,
      humanBaselineNotes: dto.humanBaselineNotes,
      recommendedMetricsDescription: dto.recommendedMetricsDescription,
      requiredGigaChatQualityLevel: dto.requiredGigaChatQualityLevel,
      sizeInSamples: dto.sizeInSamples,
      medianSampleSizeWords: dto.medianSampleSizeWords,
      requestLenMin: dto.requestLengthDist?.min,
      requestLenMedian: dto.requestLengthDist?.median,
      requestLenMax: dto.requestLengthDist?.max,
      responseLenMin: dto.responseLengthDist?.min,
      responseLenMedian: dto.responseLengthDist?.median,
      responseLenMax: dto.responseLengthDist?.max,
      fewShot: dto.fewShot ?? false,
      rag: dto.rag ?? false,
      tools: dto.tools ?? false,
      reasoning: dto.reasoning ?? false,
      longContext: dto.longContext ?? false,
      isDifficultyAutoCalculated: dto.isDifficultyAutoCalculated ?? false,
      difficultyCalculationComment: dto.difficultyCalculationComment,
      gigaMetricsCodebaseUrl: dto.gigaMetricsCodebaseUrl,
      gigaMetricsAdapterName: dto.gigaMetricAdapterName,
      gigaMetricsSetUrl: dto.gigaMetricSetUrl,
      gigaMetricsLaunchCommand: dto.gigaMetricLaunchCommand,
      validationStatus: dto.validationStatus,
      isGenerated: dto.isGenerated ?? false,
      jiraTicketId: dto.jiraTicketId,

      skills: {
        create: this.toSkillCreateInput(dto.skills),
      },
      subGroups: {
        create: this.toSubGroupCreateInput(dto.subGroups),
      },
      abilityTaxons: {
        create: this.toAbilityTaxonCreateInput(dto.abilityTaxons),
      },
      abilityTags: {
        create: this.toAbilityTagCreateInput(dto.abilityTags),
      },
      domains: {
        create: this.toDomainCreateInput(dto.domains),
      },
      subdomains: {
        create: this.toSubdomainCreateInput(dto.subdomains),
      },

      modalities: {
        create: dto.modalities?.map((item, index) => ({
          modality: item.modality,
          direction: item.direction ?? 'input',
          sortOrder: index,
        })) ?? (dto.modality
          ? [{ modality: dto.modality, direction: 'input', sortOrder: 0 }]
          : []),
      },

      examples: {
        create: dto.examples?.map((example, index) => ({
          input: example.input,
          output: example.output,
          explanation: example.explanation,
          sortOrder: index,
        })),
      },

      references: {
        create: dto.references?.map((reference, index) => ({
          title: reference.title,
          url: reference.url,
          sortOrder: index,
        })),
      },

      links: {
        create: dto.links?.map((link, index) => ({
          type: link.type,
          title: link.title,
          url: link.url,
          sortOrder: index,
        })),
      },

      subDatasets: {
        create: dto.subDatasets?.map((subset, index) => ({
          id: subset.id,
          name: subset.name,
          nameEn: subset.nameEn,
          description: subset.description,
          split: subset.split,
          taskType: subset.taskType,
          sizeInSamples: subset.sizeInSamples,
          medianSampleSizeWords: subset.medianSampleSizeWords,
          requestLenMin: subset.requestLengthDist?.min,
          requestLenMedian: subset.requestLengthDist?.median,
          requestLenMax: subset.requestLengthDist?.max,
          responseLenMin: subset.responseLengthDist?.min,
          responseLenMedian: subset.responseLengthDist?.median,
          responseLenMax: subset.responseLengthDist?.max,
          sortOrder: index,
          domains: {
            create: this.toSubsetDomainCreateInput(subset.domains),
          },
          subdomains: {
            create: this.toSubsetSubdomainCreateInput(subset.subdomains),
          },
          examples: {
            create: subset.examples?.map((example, exampleIndex) => ({
              testId: dto.id,
              input: example.input,
              output: example.output,
              explanation: example.explanation,
              sortOrder: exampleIndex,
            })),
          },
        })),
      },
    };
  }

  private toUpdateScalarInput(
    dto: UpdateCatalogBenchmarkDto
  ): Prisma.BenchmarkTestUpdateInput {
    return {
      name: dto.name,
      nameEn: dto.nameEn,
      description: dto.description,
      descriptionEn: dto.descriptionEn,
      shortDescription: dto.shortDescription,
      taskDescription: dto.taskDescription,
      instructions: dto.instructions,
      instructionsEn: dto.instructionsEn,
      codebaseName: dto.codebase?.name,
      codebaseUrl: dto.codebase?.url,
      macroGroup: dto.macroGroup,
      taskType: dto.taskType,
      language: dto.language,
      difficulty: dto.difficulty,
      confidenceScore: dto.confidenceScore,
      confidentialityLevel: dto.confidentialityLevel,
      knowledgeLevel: dto.knowledgeLevel,
      importance: dto.importance,
      importanceComment: dto.importanceComment,
      contextFieldFormat: dto.contextFieldFormat,
      answerFieldFormat: dto.answerFieldFormat,
      evaluationLogic: dto.evaluationLogic,
      humanBaseline: dto.humanBaseline,
      humanBaselineNotes: dto.humanBaselineNotes,
      recommendedMetricsDescription: dto.recommendedMetricsDescription,
      requiredGigaChatQualityLevel: dto.requiredGigaChatQualityLevel,
      sizeInSamples: dto.sizeInSamples,
      medianSampleSizeWords: dto.medianSampleSizeWords,
      requestLenMin: dto.requestLengthDist?.min,
      requestLenMedian: dto.requestLengthDist?.median,
      requestLenMax: dto.requestLengthDist?.max,
      responseLenMin: dto.responseLengthDist?.min,
      responseLenMedian: dto.responseLengthDist?.median,
      responseLenMax: dto.responseLengthDist?.max,
      fewShot: dto.fewShot,
      rag: dto.rag,
      tools: dto.tools,
      reasoning: dto.reasoning,
      longContext: dto.longContext,
      isDifficultyAutoCalculated: dto.isDifficultyAutoCalculated,
      difficultyCalculationComment: dto.difficultyCalculationComment,
      gigaMetricsCodebaseUrl: dto.gigaMetricsCodebaseUrl,
      gigaMetricsAdapterName: dto.gigaMetricAdapterName,
      gigaMetricsSetUrl: dto.gigaMetricSetUrl,
      gigaMetricsLaunchCommand: dto.gigaMetricLaunchCommand,
      validationStatus: dto.validationStatus,
      isGenerated: dto.isGenerated,
      jiraTicketId: dto.jiraTicketId,
    };
  }

  private async replaceRelations(
    tx: Prisma.TransactionClient,
    id: string,
    data: UpdateCatalogBenchmarkDto
  ) {
    await this.replaceStringRelation(tx, 'benchmarkTestSkill', id, data.skills, 'skill');
    await this.replaceStringRelation(tx, 'benchmarkTestSubGroup', id, data.subGroups, 'subGroup');
    await this.replaceStringRelation(tx, 'benchmarkTestAbilityTaxon', id, data.abilityTaxons, 'taxon');
    await this.replaceStringRelation(tx, 'benchmarkTestAbilityTag', id, data.abilityTags, 'tag');
    await this.replaceStringRelation(tx, 'benchmarkTestDomain', id, data.domains, 'domain');
    await this.replaceStringRelation(tx, 'benchmarkTestSubdomain', id, data.subdomains, 'subdomain');
    await this.replaceMetrics(tx, id, data.metrics);

    if (data.modalities !== undefined || data.modality !== undefined) {
      await tx.benchmarkTestModality.deleteMany({ where: { testId: id } });

      const modalities = data.modalities?.map((item, index) => ({
        testId: id,
        modality: item.modality,
        direction: item.direction ?? 'input',
        sortOrder: index,
      })) ?? (data.modality
        ? [{ testId: id, modality: data.modality, direction: 'input' as const, sortOrder: 0 }]
        : []);

      if (modalities.length) {
        await tx.benchmarkTestModality.createMany({ data: modalities });
      }
    }

    if (data.examples !== undefined) {
      await tx.benchmarkExample.deleteMany({
        where: { testId: id, subsetId: null },
      });

      if (data.examples.length) {
        await tx.benchmarkExample.createMany({
          data: data.examples.map((example, index) => ({
            testId: id,
            input: example.input,
            output: example.output,
            explanation: example.explanation,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.references !== undefined) {
      await tx.benchmarkReference.deleteMany({ where: { testId: id } });

      if (data.references.length) {
        await tx.benchmarkReference.createMany({
          data: data.references.map((reference, index) => ({
            testId: id,
            title: reference.title,
            url: reference.url,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.links !== undefined) {
      await tx.benchmarkLink.deleteMany({ where: { testId: id } });

      if (data.links.length) {
        await tx.benchmarkLink.createMany({
          data: data.links.map((link, index) => ({
            testId: id,
            type: link.type,
            title: link.title,
            url: link.url,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.subDatasets !== undefined) {
      await tx.datasetSubset.deleteMany({ where: { testId: id } });

      for (const [index, subset] of data.subDatasets.entries()) {
        await tx.datasetSubset.create({
          data: {
            id: subset.id,
            testId: id,
            name: subset.name,
            nameEn: subset.nameEn,
            description: subset.description,
            split: subset.split,
            taskType: subset.taskType,
            sizeInSamples: subset.sizeInSamples,
            medianSampleSizeWords: subset.medianSampleSizeWords,
            requestLenMin: subset.requestLengthDist?.min,
            requestLenMedian: subset.requestLengthDist?.median,
            requestLenMax: subset.requestLengthDist?.max,
            responseLenMin: subset.responseLengthDist?.min,
            responseLenMedian: subset.responseLengthDist?.median,
            responseLenMax: subset.responseLengthDist?.max,
            sortOrder: index,
            domains: {
              create: this.toSubsetDomainCreateInput(subset.domains),
            },
            subdomains: {
              create: this.toSubsetSubdomainCreateInput(subset.subdomains),
            },
            examples: {
              create: subset.examples?.map((example, exampleIndex) => ({
                testId: id,
                input: example.input,
                output: example.output,
                explanation: example.explanation,
                sortOrder: exampleIndex,
              })),
            },
          },
        });
      }
    }
  }

  private async replaceStringRelation(
    tx: Prisma.TransactionClient,
    model: keyof Prisma.TransactionClient,
    testId: string,
    values: string[] | undefined,
    field: string
  ) {
    if (values === undefined) return;

    const delegate = tx[model] as any;

    await delegate.deleteMany({ where: { testId } });

    if (values.length) {
      await delegate.createMany({
        data: values.map((value, index) => ({
          testId,
          [field]: value,
          sortOrder: index,
        })),
      });
    }
  }

  private toSkillCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestSkillCreateWithoutTestInput[] {
    return (
      values?.map((skill, index) => ({
        skill,
        sortOrder: index,
      })) ?? []
    );
  }

  private toSubGroupCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestSubGroupCreateWithoutTestInput[] {
    return (
      values?.map((subGroup, index) => ({
        subGroup,
        sortOrder: index,
      })) ?? []
    );
  }

  private toAbilityTaxonCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestAbilityTaxonCreateWithoutTestInput[] {
    return (
      values?.map((taxon, index) => ({
        taxon,
        sortOrder: index,
      })) ?? []
    );
  }

  private toAbilityTagCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestAbilityTagCreateWithoutTestInput[] {
    return (
      values?.map((tag, index) => ({
        tag,
        sortOrder: index,
      })) ?? []
    );
  }

  private toDomainCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestDomainCreateWithoutTestInput[] {
    return (
      values?.map((domain, index) => ({
        domain,
        sortOrder: index,
      })) ?? []
    );
  }

  private toSubdomainCreateInput(
    values?: string[]
  ): Prisma.BenchmarkTestSubdomainCreateWithoutTestInput[] {
    return (
      values?.map((subdomain, index) => ({
        subdomain,
        sortOrder: index,
      })) ?? []
    );
  }

  private toSubsetDomainCreateInput(
    values?: string[]
  ): Prisma.DatasetSubsetDomainCreateWithoutSubsetInput[] {
    return (
      values?.map((domain, index) => ({
        domain,
        sortOrder: index,
      })) ?? []
    );
  }

  private toSubsetSubdomainCreateInput(
    values?: string[]
  ): Prisma.DatasetSubsetSubdomainCreateWithoutSubsetInput[] {
    return (
      values?.map((subdomain, index) => ({
        subdomain,
        sortOrder: index,
      })) ?? []
    );
  }

  private async replaceMetrics(
    tx: Prisma.TransactionClient,
    testId: string,
    metricNames?: string[]
  ): Promise<void> {
    if (metricNames === undefined) return;

    await tx.benchmarkTestMetric.deleteMany({
      where: { testId },
    });

    if (!metricNames.length) return;

    const { priorityId, directionId } =
      await this.ensureDefaultMetricLookups(tx);

    for (const [index, name] of metricNames.entries()) {
      const metric = await tx.metricDefinition.upsert({
        where: { name },
        update: {},
        create: {
          name,
          displayName: name,
          priority: {
            connect: { id: priorityId },
          },
          direction: {
            connect: { id: directionId },
          },
          metadata: {},
        },
        select: { id: true },
      });

      await tx.benchmarkTestMetric.create({
        data: {
          testId,
          metricId: metric.id,
          sortOrder: index,
        },
      });
    }
  }

  private async ensureDefaultMetricLookups(
    tx: Prisma.TransactionClient
  ): Promise<{ priorityId: string; directionId: string }> {
    const priority = await tx.metricPriorityLookup.upsert({
      where: { code: 'primary' },
      update: {},
      create: {
        code: 'primary',
        name: 'Primary',
        description: 'Default primary metric priority',
      },
      select: { id: true },
    });

    const direction = await tx.metricDirectionLookup.upsert({
      where: { code: 'higher_is_better' },
      update: {},
      create: {
        code: 'higher_is_better',
        name: 'Higher is better',
        description: 'Default metric direction',
      },
      select: { id: true },
    });

    return {
      priorityId: priority.id,
      directionId: direction.id,
    };
  }
}
