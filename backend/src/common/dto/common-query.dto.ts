import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_ONLY_MESSAGE = 'must be a date in YYYY-MM-DD format';

export class DateQueryDto {
  /** Day to show (YYYY-MM-DD). Defaults to today. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `date ${DATE_ONLY_MESSAGE}` })
  date?: string;
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class DateRangeSearchQueryDto extends SearchQueryDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `dateFrom ${DATE_ONLY_MESSAGE}` })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `dateTo ${DATE_ONLY_MESSAGE}` })
  dateTo?: string;
}
