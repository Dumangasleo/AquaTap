export interface ContractValues {
  fullName: string;
  address: string;
  occupation: string;
  contactNumber: string;
  borrowedGallons: number;
  stationName: string;
}

/**
 * Same placeholder rules as the API (ContractTemplateService) so the customer sees exactly the
 * text that will be saved. Empty fields stay visible as blanks "________".
 */
export function renderContractPreview(template: string, values: ContractValues): string {
  const blank = '________';
  const placeholderValues: Record<string, string> = {
    FullName: values.fullName.trim().replace(/\s+/g, ' ').toUpperCase() || blank,
    Address: values.address.trim() || blank,
    Occupation: values.occupation.trim() || 'N/A',
    ContactNumber: values.contactNumber.trim() || blank,
    BorrowedGallons: String(values.borrowedGallons),
    StationName: values.stationName,
    Date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, key: string) => placeholderValues[key] ?? placeholder);
}
