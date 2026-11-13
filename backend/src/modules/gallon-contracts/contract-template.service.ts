import { Injectable } from '@nestjs/common';

export const DEFAULT_CONTRACT_TEMPLATE = `GALLON BORROWING AGREEMENT
(Kasabutan sa Paghulam og Galon)

I, {{FullName}}, of legal age, {{Occupation}} by occupation, residing at {{Address}}, with contact number {{ContactNumber}}, hereby acknowledge that on {{Date}} I borrowed {{BorrowedGallons}} water gallon container(s) from {{StationName}}.

I agree to the following:
1. I will take good care of the borrowed container(s) and use them only for water bought from {{StationName}}.
2. I will return the same number of empty containers whenever I order refills, or whenever the station asks for them.
3. I will pay the replacement cost of any container that gets lost or damaged while in my possession.
4. I will settle any unpaid balance (utang) for delivered orders on time.

I certify that the information above is true and correct, and I sign this agreement electronically.`;

export interface ContractTemplateValues {
  fullName: string;
  address: string;
  occupation: string | null;
  contactNumber: string;
  borrowedGallons: number;
  stationName: string;
  signedAt: Date;
}

/** Fills the {{Placeholder}} fields of a borrowing contract with the borrower's details. */
@Injectable()
export class ContractTemplateService {
  resolveTemplate(stationTemplate: string | null): string {
    return stationTemplate?.trim() ? stationTemplate : DEFAULT_CONTRACT_TEMPLATE;
  }

  render(template: string, values: ContractTemplateValues): string {
    const placeholderValues: Record<string, string> = {
      FullName: values.fullName,
      Address: values.address,
      Occupation: values.occupation?.trim() || 'N/A',
      ContactNumber: values.contactNumber,
      BorrowedGallons: String(values.borrowedGallons),
      StationName: values.stationName,
      Date: values.signedAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, key: string) =>
      key in placeholderValues ? placeholderValues[key] : placeholder,
    );
  }
}
