import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/currentUser.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/registerDto.dto';
import { LocalAuthGuard } from './local/local-auth.guard';
import { AUTH_MOCK } from './mocks/auth.mock';
import type { RequestUser } from '@/common/types/request.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Login. Returns access token',
  })
  @ApiBody({
    schema: {
      example: AUTH_MOCK.loginBody,
    },
  })
  @ApiOkResponse({
    schema: {
      example: AUTH_MOCK.tokens,
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  login(@CurrentUser() user: RequestUser) {
    return this.authService.login(user);
  }

  @Public()
  @HttpCode(201)
  @Post('register')
  @ApiOperation({
    summary: 'Register. Returns access token',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        value: AUTH_MOCK.registerBody,
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      example: AUTH_MOCK.tokens,
    },
  })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
