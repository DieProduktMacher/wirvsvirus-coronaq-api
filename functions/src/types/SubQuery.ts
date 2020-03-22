declare interface SubQuery {
  match?: {
    [key: string]: any
  }
  match_phrase?: {
    [key: string]: any
  }
}