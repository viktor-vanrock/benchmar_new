import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { WsJwtAuthGuard } from '@/auth/jwt/ws-jwt-auth.guard';
import { agentServiceProvider } from './agent/agent.provider';
import { AgentWsService } from './agent/agent.ws.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsGateway } from './conversations.gateway';
import { ConversationsService } from './conversations.service';
import { AgentMockService } from './mock/agent.mock.service';
import { conversationsRepositoryProvider } from './repository/conversations.repository.provider';

@Module({
  imports: [AuthModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    AgentMockService,
    AgentWsService,
    agentServiceProvider,
    conversationsRepositoryProvider,
    WsJwtAuthGuard,
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
