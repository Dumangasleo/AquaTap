import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig, loadAppConfig } from './config/app-config';
import { AccountActivityModule } from './modules/account-activity/account-activity.module';
import { AccountSecurityModule } from './modules/account-security/account-security.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerOrdersModule } from './modules/customer-orders/customer-orders.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmployeeShiftsModule } from './modules/employee-shifts/employee-shifts.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GallonContractsModule } from './modules/gallon-contracts/gallon-contracts.module';
import { HealthController } from './health.controller';
import { PaymentChannelsModule } from './modules/payment-channels/payment-channels.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StationVerificationsModule } from './modules/station-verifications/station-verifications.module';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { WaterStationsModule } from './modules/water-stations/water-stations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadAppConfig], cache: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const database = configService.get('database', { infer: true });
        return {
          type: 'mysql',
          host: database.host,
          port: database.port,
          username: database.user,
          password: database.password,
          database: database.name,
          timezone: '+08:00',
          charset: 'utf8mb4',
          autoLoadEntities: true,
          // The schema is owned by database/aquatap_schema.sql (run it in MySQL Workbench or `npm run db:setup`).
          synchronize: false,
        };
      },
    }),
    AuthModule,
    AccountSecurityModule,
    AccountActivityModule,
    UserAccountsModule,
    WaterStationsModule,
    EmployeesModule,
    CustomersModule,
    GallonContractsModule,
    CustomerOrdersModule,
    PaymentsModule,
    EmployeeShiftsModule,
    ExpensesModule,
    PaymentChannelsModule,
    ReportsModule,
    StationVerificationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
