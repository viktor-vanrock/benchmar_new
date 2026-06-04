import { Prisma } from '@/generated/prisma/client';

export type ModelScoreType = {
  modelId: string;
  modelName: string;
  metricId?: string;
  metricName?: string;
  score: number;
  isOpenSource: boolean;
  isHumanBaseline?: boolean;
  obtainedAt?: string;
};

export type BenchmarkExampleType = {
  input: string;
  output: string;
  explanation?: string;
};

export type BenchmarkReferenceType = {
  title: string;
  url: string;
};

export type BenchmarkLinkType = {
  type: string;
  title: string;
  url: string;
};

export type BenchmarkLengthDistributionType = {
  min: number;
  median: number;
  max: number;
};

export type SubDatasetType = {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  domains?: string[];
  subdomains?: string[];
  sizeInSamples: number;
  taskType?: string;
  examples?: BenchmarkExampleType[];
  scores?: ModelScoreType[];
};

export type CodeBaseType = {
  name: string;
  url: string;
};

export type BenchmarkType = {
  id: string;
  suiteId?: string;

  name: string;
  nameEn: string;

  description: string;
  descriptionEn: string;

  shortDescription?: string;
  taskDescription?: string;

  codebase: CodeBaseType;

  metrics: string[];
  examples: BenchmarkExampleType[];

  instructions: string;
  instructionsEn: string;

  references: BenchmarkReferenceType[];
  links: BenchmarkLinkType[];

  macroGroup: string;
  subGroups: string[];
  abilityTaxons: string[];
  abilityTags: string[];
  skills: string[];

  modality: string;
  modalities: string[];
  taskType: string;

  domains: string[];
  subdomains: string[];

  sizeInSamples: number;
  medianSampleSizeWords: number;

  requestLengthDist: BenchmarkLengthDistributionType;
  responseLengthDist: BenchmarkLengthDistributionType;

  language: string;
  difficulty: string;

  confidenceScore?: number;
  confidentialityLevel?: string;
  knowledgeLevel?: string;
  importance?: string;
  importanceComment?: string;

  contextFieldFormat?: string;
  answerFieldFormat?: string;
  evaluationLogic?: string;

  humanBaseline?: number;
  humanBaselineNotes?: string;

  recommendedMetricsDescription?: string;
  requiredGigaChatQualityLevel?: string;

  fewShot: boolean;
  rag: boolean;
  tools: boolean;
  reasoning: boolean;
  longContext: boolean;

  scores: ModelScoreType[];
  subDatasets: SubDatasetType[];

  gigaMetricAdapterName?: string;
  gigaMetricSetUrl?: string;
  gigaMetricLaunchCommand?: string;
  gigaMetricsCodebaseUrl?: string;

  validationStatus?: string;
  isGenerated: boolean;
  jiraTicketId?: string;
  generatedAt?: string;
};

export type CatalogFilterOptionsType = {
  macroGroups: string[];
  subGroups: string[];
  abilityTaxons: string[];
  abilityTags: string[];
  skills: string[];
  domains: string[];
  subdomains: string[];
  languages: string[];
  difficulties: string[];
  taskTypes: string[];
  modalities: string[];
};

export const benchmarkTestFullInclude = {
  benchmark: true,
  skills: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  abilityTaxons: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  abilityTags: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  subGroups: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  domains: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  subdomains: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  modalities: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  projectGroups: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  featureLabels: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  metrics: {
    orderBy: {
      sortOrder: 'asc',
    },
    include: {
      metric: true,
    },
  },
  metricResults: {
    orderBy: {
      obtainedAt: 'desc',
    },
    include: {
      metric: {
        include: {
          priority: true,
          direction: true,
        },
      },
      model: true,
    },
  },
  examples: {
    where: {
      subsetId: null,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  },
  references: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  links: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  subDatasets: {
    orderBy: {
      sortOrder: 'asc',
    },
    include: {
      domains: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
      subdomains: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
      examples: {
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
  },
} satisfies Prisma.BenchmarkTestInclude;

export type BenchmarkTestWithRelations = Prisma.BenchmarkTestGetPayload<{
  include: typeof benchmarkTestFullInclude;
}>;
