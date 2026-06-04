import { Injectable } from '@nestjs/common';
import {
  BenchmarkTestWithRelations,
  BenchmarkType,
  SubDatasetType,
} from './types';

@Injectable()
export class CatalogMapper {
  toDto(test: BenchmarkTestWithRelations): BenchmarkType {
    const firstInputModality =
      test.modalities.find((item) => 'input' === item.direction) ??
      test.modalities[0];

    return {
      id: test.id,
      suiteId: test.benchmarkId,

      name: test.name,
      nameEn: test.nameEn,

      description: test.description ?? test.benchmark.description ?? '',
      descriptionEn: test.descriptionEn ?? test.benchmark.descriptionEn ?? '',

      shortDescription: test.shortDescription ?? undefined,
      taskDescription: test.taskDescription ?? undefined,

      codebase: {
        name: test.codebaseName ?? '',
        url: test.codebaseUrl ?? '',
      },

      metrics: test.metrics.map((item) => item.metric.name),

      examples: test.examples.map((item) => ({
        input: item.input,
        output: item.output,
        explanation: item.explanation ?? undefined,
      })),

      instructions: test.instructions ?? '',
      instructionsEn: test.instructionsEn ?? '',

      references: test.references.map((item) => ({
        title: item.title,
        url: item.url,
      })),

      links: test.links.map((item) => ({
        type: item.type,
        title: item.title,
        url: item.url,
      })),

      macroGroup: test.macroGroup ?? '',
      subGroups: test.subGroups.map((item) => item.subGroup),
      abilityTaxons: test.abilityTaxons.map((item) => item.taxon),
      abilityTags: test.abilityTags.map((item) => item.tag),
      skills: test.skills.map((item) => item.skill),

      modality: firstInputModality?.modality ?? '',
      modalities: test.modalities.map((item) => item.modality),

      taskType: test.taskType ?? '',

      domains: test.domains.map((item) => item.domain),
      subdomains: test.subdomains.map((item) => item.subdomain),

      sizeInSamples: test.sizeInSamples ?? 0,
      medianSampleSizeWords: test.medianSampleSizeWords ?? 0,

      requestLengthDist: {
        min: test.requestLenMin ?? 0,
        median: test.requestLenMedian ?? 0,
        max: test.requestLenMax ?? 0,
      },

      responseLengthDist: {
        min: test.responseLenMin ?? 0,
        median: test.responseLenMedian ?? 0,
        max: test.responseLenMax ?? 0,
      },

      language: test.language ?? '',
      difficulty: test.difficulty ?? '',

      confidenceScore: test.confidenceScore ?? undefined,
      confidentialityLevel: test.confidentialityLevel ?? undefined,
      knowledgeLevel: test.knowledgeLevel ?? undefined,
      importance: test.importance ?? undefined,
      importanceComment: test.importanceComment ?? undefined,

      contextFieldFormat: test.contextFieldFormat ?? undefined,
      answerFieldFormat: test.answerFieldFormat ?? undefined,
      evaluationLogic: test.evaluationLogic ?? undefined,

      humanBaseline: test.humanBaseline ?? undefined,
      humanBaselineNotes: test.humanBaselineNotes ?? undefined,

      recommendedMetricsDescription:
        test.recommendedMetricsDescription ?? undefined,
      requiredGigaChatQualityLevel:
        test.requiredGigaChatQualityLevel ?? undefined,

      fewShot: test.fewShot,
      rag: test.rag,
      tools: test.tools,
      reasoning: test.reasoning,
      longContext: test.longContext,

      scores: this.toPrimaryScores(test),

      subDatasets: test.subDatasets.map((subset) =>
        this.subDatasetToDto(subset)
      ),

      gigaMetricAdapterName: test.gigaMetricsAdapterName ?? undefined,
      gigaMetricSetUrl: test.gigaMetricsSetUrl ?? undefined,
      gigaMetricLaunchCommand:
        test.gigaMetricsLaunchCommand ?? undefined,
      gigaMetricsCodebaseUrl: test.gigaMetricsCodebaseUrl ?? undefined,

      validationStatus: test.validationStatus ?? undefined,
      isGenerated: test.isGenerated,
      jiraTicketId: test.jiraTicketId ?? undefined,
      generatedAt: test.generatedAt?.toISOString(),
    };
  }

  toDtoList(tests: BenchmarkTestWithRelations[]): BenchmarkType[] {
    return tests.map((test) => this.toDto(test));
  }

  private toPrimaryScores(test: BenchmarkTestWithRelations) {
    const byModel = new Map<string, {
      modelId: string;
      modelName: string;
      metricId?: string;
      metricName?: string;
      score: number;
      isOpenSource: boolean;
      isHumanBaseline?: boolean;
      obtainedAt?: string;
    }>();

    const primaryResults = test.metricResults.filter((result) => {
      return 'primary' === result.metric.priority?.code;
    });

    const results = primaryResults.length ? primaryResults : test.metricResults;

    for (const result of results) {
      if (byModel.has(result.modelId)) continue;

      byModel.set(result.modelId, {
        modelId: result.modelId,
        modelName: result.model.name,
        metricId: result.metricId,
        metricName: result.metric.name,
        score: Number(result.value),
        isOpenSource: result.model.isOpenSource,
        isHumanBaseline: 'human' === result.modelId,
        obtainedAt: result.obtainedAt.toISOString(),
      });
    }

    return [...byModel.values()];
  }

  private subDatasetToDto(
    subset: BenchmarkTestWithRelations['subDatasets'][number]
  ): SubDatasetType {
    return {
      id: subset.id,
      name: subset.name,
      nameEn: subset.nameEn ?? undefined,
      description: subset.description ?? undefined,
      domains: subset.domains.map((item) => item.domain),
      subdomains: subset.subdomains.map((item) => item.subdomain),
      sizeInSamples: subset.sizeInSamples ?? 0,
      taskType: subset.taskType ?? undefined,
      examples: subset.examples.map((example) => ({
        input: example.input,
        output: example.output,
        explanation: example.explanation ?? undefined,
      })),
      scores: [],
    };
  }
}
