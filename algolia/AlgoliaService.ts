import { searchClient, type SearchClient, QueryType, RemoveWordsIfNoResults } from '@algolia/client-search';

export class AlgoliaService {
  private client: SearchClient;

  constructor(applicationId: string, apiKey: string) {
    this.client = searchClient(applicationId, apiKey);
  }

  async searchSingleIndex(indexName: string, query: string, options?: {
    headers?: Record<string, string>,
    queryParameters?: Record<string, any>
  }) {
    const defaultParams = {
        hitsPerPage: 20,
        page: 0,
        attributesToRetrieve: ['*'],
        typoTolerance: true,
        ignorePlurals: true,
        removeStopWords: true,
        queryType: 'prefixNone' as QueryType,
        attributesToHighlight: ['*'],
        highlightPreTag: '<em>',
        highlightPostTag: '</em>',
        analytics: true,
        clickAnalytics: true,
        enablePersonalization: false,
        distinct: 1,
        facets: ['*'],
        minWordSizefor1Typo: 1,
        minWordSizefor2Typos: 3,
        advancedSyntax: true,
        removeWordsIfNoResults: 'lastWords' as RemoveWordsIfNoResults
    };

    const mergedParams = { 
      ...defaultParams, 

      query,
      ...options?.queryParameters, 
      getRankingInfo: true 
    };

    return this.client.search([
      {
        indexName,
        params: mergedParams,
      },
    ], { headers: options?.headers });
  }

  async saveObject(indexName: string, object: Record<string, any>) {
    return this.client.saveObject({ indexName, body: object });
  }

  async getObject(indexName: string, objectID: string, attributesToRetrieve?: string[]) {
    return this.client.getObject({ indexName, objectID, attributesToRetrieve });
  }

  async addOrUpdateObject(indexName: string, objectID: string, object: Record<string, any>) {
    return this.client.addOrUpdateObject({ indexName, objectID, body: object });
  }

  async deleteObject(indexName: string, objectID: string) {
    return this.client.deleteObject({ indexName, objectID });
  }

  async deleteBy(indexName: string, filters: string) {
    return this.client.deleteBy({ indexName, deleteByParams: { filters } });
  }

  async clearObjects(indexName: string) {
    return this.client.clearObjects({ indexName });
  }

  async partialUpdateObject(indexName: string, objectID: string, attributes: Record<string, any>) {
    return this.client.partialUpdateObject({ indexName, objectID, attributesToUpdate: attributes });
  }

  async getObjects(requests: Array<{ indexName: string, objectID: string, attributesToRetrieve?: string[] }>) {
    return this.client.getObjects({ requests });
  }

  async listIndices() {
    return this.client.listIndices();
  }
}
