export interface LoadUpload {
  file: File
  sheet?: string
  subjectAliases?: Readonly<Record<string, number>>
}

export interface ValidatedLoad {
  sheet: string
  dataRows: number
  totalPeriods: number
  demands: {
    teacherId: string
    subjectId: string
    classId: string
    weeklyPeriods: number
    sourceCell: string
  }[]
  validatedLoadId: string
}

export interface LoadFieldError {
  code: string
  message: string
  sheet: string | null
  row: number | null
  column: string | null
  cell: string | null
}

export interface LoadProblem {
  code: string
  message: string
  fieldErrors: LoadFieldError[]
}
