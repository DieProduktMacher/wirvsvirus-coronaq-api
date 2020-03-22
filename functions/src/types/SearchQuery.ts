declare interface SearchQuery {
  authoredAt: string
	authoredById: string
	query: {
		[key: string]: any
	},
	results?: SearchQueryResult[]
}