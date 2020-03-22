declare interface SearchQuery {
  authoredAt: String
	authoredById: String
	query: {
		[key: string]: any
	},
	results?: {
		questions: Question[]
		total: Number
	}

}