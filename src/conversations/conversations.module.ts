import { Module } from '@nestjs/common';
import { agentServiceProvider } from './agent/agent.provider';
import { AgentWsService } from './agent/agent.ws.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';
import { AgentMockService } from './mock/agent.mock.service';
import { conversationsRepositoryProvider } from './repository/conversations.repository.provider';

@Module({
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    AgentMockService,
    AgentWsService,
    agentServiceProvider,
    conversationsRepositoryProvider,
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
