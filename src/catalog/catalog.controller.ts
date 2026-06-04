import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/role.decorator';
import { Role } from '@/common/enums/role.enum';
import { CatalogService } from './catalog.service';
import { BenchmarkCatalogQueryDto } from './dto/benchmarkCatalogQueryDto.dto';
import { CreateCatalogBenchmarkDto } from './dto/createCatalogBenchmark.dto';
import { UpdateCatalogBenchmarkDto } from './dto/updateCatalogBenchmark.dto';

@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get benchmark catalog',
    description:
      'Returns paginated BenchmarkTest cards mapped to frontend BenchmarkType. Supports search, taxonomy filters, sorting and pagination.',
  })
  @ApiOkResponse({ description: 'Paginated catalog response' })
  async findAllBenchmark(@Query() query: BenchmarkCatalogQueryDto) {
    return await this.catalogService.findAllBenchmark(query);
  }

  @Get('filters/options')
  @ApiOperation({
    summary: 'Get catalog filter options',
    description:
    'Returns available filter values from active BenchmarkTest records: domains, skills, ability tags, task types, modalities and others.',
  })
  async getFilterOptions() {
    return await this.catalogService.getFilterOptions();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get benchmark test by id',
    description:
    'Returns one BenchmarkTest mapped to frontend BenchmarkType, including taxonomy, links, instructions and metric scores.',
  })
  async findBenchmarkById(@Param('id') id: string) {
    return await this.catalogService.findBenchmarkById(id);
  }

  @Roles(Role.Admin, Role.SuperUser)
  @Post()
  @ApiOperation({
    summary: 'Create benchmark test',
    description:
    'Creates parent Benchmark suite if needed, then creates BenchmarkTest card with taxonomy, links, examples, subsets and metric definitions.',
  })
  @ApiCreatedResponse({ description: 'Benchmark test created' })
  async createBenchmark(@Body() body: CreateCatalogBenchmarkDto) {
    return await this.catalogService.createBenchmark(body);
  }

  @Roles(Role.Admin, Role.SuperUser)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update benchmark test',
    description:
    'Updates BenchmarkTest and replaces array-like relations: skills, domains, metrics, examples, links, subsets.',
  })
  async updateBenchmarkById(
    @Param('id') id: string,
    @Body() body: UpdateCatalogBenchmarkDto
  ) {
    return await this.catalogService.updateBenchmarkById(id, body);
  }

  @Roles(Role.SuperUser)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft delete benchmark test',
    description: 'Marks BenchmarkTest as deleted via deletedAt.',
  })
  @Delete(':id')
  async softDeleteBenchmarkById(@Param('id') id: string) {
    return await this.catalogService.softDeleteBenchmarkById(id);
  }
}
