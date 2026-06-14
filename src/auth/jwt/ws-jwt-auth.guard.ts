import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RequestUser } from '@/common/types/request.type';
import { JwtPayload } from '../types';

/**
 * Guard для WebSocket-гейтвеев.
 *
 * `JwtAuthGuard` из `@nestjs/passport` рассчитан на HTTP-контекст и читает
 * `Authorization` из `request.headers`. У Socket.io тот же токен лежит в
 * `client.handshake.auth.token` или `client.handshake.headers.authorization`,
 * поэтому нужен отдельный guard.
 *
 * Кладёт распаршенного юзера в `client.data.user`, чтобы потом доставать
 * через декоратор `@WsCurrentUser()` или `client.data.user` напрямую.
 */
@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();

    if (client.data?.user) {
      return true;
    }

    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`WS auth failed: no token (socket=${client.id})`);
      throw new WsException('Unauthorized: missing access token');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwtAccessSecret'),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`WS auth failed: ${message} (socket=${client.id})`);
      throw new WsException('Unauthorized: invalid access token');
    }

    const user: RequestUser = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    client.data = { ...client.data, user };

    return true;
  }

  private extractToken(client: Socket): Nullable<string> {
    const authToken = client.handshake.auth?.token;
    if ('string' === typeof authToken && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const header = client.handshake.headers.authorization;
    if ('string' === typeof header && header.length > 0) {
      return header.replace(/^Bearer\s+/i, '');
    }

    const queryToken = client.handshake.query?.token;
    if ('string' === typeof queryToken && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }
}
