import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { SearchQueryDto } from '../../common/dto/common-query.dto';
import { ActivityType, STAFF_ROLES, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { pluralize } from '../../common/utils/text.util';
import { requireCustomerId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { GallonLedgerEntry } from '../gallon-contracts/gallon-ledger.service';
import { CustomersService } from './customers.service';
import {
  CustomerAccountResponse,
  CustomerListItemResponse,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './dto/customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /** Onboarding: electronic borrowing contract + customer details. */
  @Post('register')
  @RecordActivity<CustomerAccountResponse>({
    type: ActivityType.ContractSigned,
    describe: ({ result }) =>
      `Signed the gallon borrowing agreement with ${result.stationName} ` +
      `(${pluralize(result.gallonBalance.borrowedGallons, 'borrowed gallon')})`,
  })
  registerCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() registerDto: RegisterCustomerDto,
  ): Promise<CustomerAccountResponse> {
    return this.customersService.registerCustomer(user, registerDto);
  }

  // ----- Customer self-service (declared before ":customerId" routes) -----

  @Roles(UserRole.Customer)
  @Get('me')
  getMyAccount(@CurrentUser() user: AuthenticatedUser): Promise<CustomerAccountResponse> {
    return this.customersService.getCustomerAccount(requireWaterStationId(user), requireCustomerId(user));
  }

  @Roles(UserRole.Customer)
  @Patch('me')
  @RecordActivity({
    type: ActivityType.CustomerDetailsUpdated,
    describe: () => 'Updated address and contact details',
  })
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateCustomerProfileDto,
  ): Promise<CustomerAccountResponse> {
    return this.customersService.updateCustomerProfile(
      requireWaterStationId(user),
      requireCustomerId(user),
      updateDto,
    );
  }

  @Roles(UserRole.Customer)
  @Get('me/ledger')
  getMyLedger(@CurrentUser() user: AuthenticatedUser): Promise<GallonLedgerEntry[]> {
    return this.customersService.getCustomerLedger(requireWaterStationId(user), requireCustomerId(user));
  }

  // ----- Station staff -----

  @Roles(...STAFF_ROLES)
  @Get()
  listCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ): Promise<CustomerListItemResponse[]> {
    return this.customersService.listCustomers(requireWaterStationId(user), query);
  }

  @Roles(...STAFF_ROLES)
  @Get(':customerId')
  getCustomer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<CustomerAccountResponse> {
    return this.customersService.getCustomerAccount(requireWaterStationId(user), customerId);
  }

  @Roles(...STAFF_ROLES)
  @Get(':customerId/ledger')
  getCustomerLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<GallonLedgerEntry[]> {
    return this.customersService.getCustomerLedger(requireWaterStationId(user), customerId);
  }
}
