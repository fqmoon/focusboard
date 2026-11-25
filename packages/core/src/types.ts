export type IssueCode =
  | 'missing_field'
  | 'invalid_type'
  | 'unknown_type'
  | 'invalid_enum'
  | 'not_integer'
  | 'out_of_range'
  | 'unknown_field'
  | 'duplicate_id'
  | 'dangling_line'
  | 'out_of_bounds'
  | 'partial_overlap'
  | 'line_crosses_rect'
  | 'text_overflow'
  | 'text_scale_misaligned';

export interface Issue {
  code: IssueCode;
  ids: string[];
  message: string;
  path?: string;
}

export interface LintResult {
  errors: Issue[];
  warnings: Issue[];
}
