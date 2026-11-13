import {
  IsBoolean,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InviteEmployeeDto {
  @IsString()
  @MinLength(3, { message: 'Please enter the complete name of the employee.' })
  @MaxLength(150)
  fullName: string;

  /** Gmail address the employee will use for Google sign-in. */
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactNumber?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLocationDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

export class EmployeeResponse {
  employeeId: number;
  fullName: string;
  email: string;
  contactNumber: string | null;
  isOwner: boolean;
  isActive: boolean;
  /** false = invited but has not signed in yet */
  hasSignedIn: boolean;
  isOnDuty: boolean;
  createdAt: Date;
}
