import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@/common/enums/role.enum';
import { AdminUserEnvType } from '@/configs/types';
import { UsersService } from './users.service';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {}

  async onModuleInit() {
    const env = this.configService.get<string>('nodeEnv');

    if (env !== 'dev') {
      return;
    }

    const { username, password, email } =
      this.configService.getOrThrow<AdminUserEnvType>('admin');

    if (!username || !password || !email) {
      this.logger.warn(
        'Admin seed skipped: ADMIN_USERNAME or ADMIN_PASSWORD env not set'
      );

      return;
    }

    try {
      const existingUser =
        await this.usersService.findUserByUsername(username);

      if (existingUser) {
        this.logger.debug(
          `SuperUser "${username}" already exists, seed skipped`
        );

        return;
      }

      await this.usersService.createUser({
        username,
        email,
        password,
        role: Role.SuperUser,
      });

      this.logger.log(`Seeded SuperUser: ${username}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(`Admin seed failed: ${message}`);
    }
  }
}
