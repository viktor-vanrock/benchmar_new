import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PaginationDto } from '@/common/dtos/paginationDto.dto';
import { ConversationsService } from './conversations.service';

@Public()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List conversations',
    description: 'Returns paginated conversations ordered by createdAt desc.',
  })
  @ApiOkResponse({ description: 'Paginated conversations response' })
  async findAll(@Query() queryParams: PaginationDto) {
    return this.service.findAll(queryParams);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation by id',
    description: 'Returns one conversation with full ordered message history.',
  })
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findByIdWithMessages(id);
  }
}
