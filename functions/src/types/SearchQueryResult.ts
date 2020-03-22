declare interface SearchQueryResult {
  data: Question,
  meta: {
    score: number
  }
  ref: string
}
