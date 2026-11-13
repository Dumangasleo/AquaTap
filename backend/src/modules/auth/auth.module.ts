import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from '../../config/app-config';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { AccountSecurityModule } from '../account-security/account-security.module';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GoogleIdentityTokenVerifier } from './identity/google-identity-token-verifier';
import { IdentityTokenVerifier } from './identity/identity-token-verifier';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    UserAccountsModule,
    AccountSecurityModule,
    AccountActivityModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('auth.jwtSecret', { infer: true }),
        signOptions: {
          expiresIn: configService.get('auth.jwtExpiresInSeconds', { infer: true }),
        },
      }),
    }),
    // Used only by the routes marked with @UseGuards(ThrottlerGuard): password and verification-code sign-in.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        throttlers: [
          {
            ttl: ONE_MINUTE_MS,
            limit: configService.get('auth.signInRateLimitPerMinute', { infer: true }),
          },
        ],
        errorMessage: 'Too many attempts. Please wait a minute and try again.',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: IdentityTokenVerifier, useClass: GoogleIdentityTokenVerifier },
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
