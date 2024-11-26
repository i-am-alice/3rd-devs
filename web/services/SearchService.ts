import { searchClient, type SearchClient } from '@algolia/client-search';
import { type QueryType } from '@algolia/client-search'; // Import QueryType if not already imported
import { type RemoveWordsIfNoResults } from '@algolia/client-search'; // Import RemoveWordsIfNoResults

export class SearchService {
  private client: SearchClient;

  constructor(applicationId: string, apiKey: string) {
    this.client = searchClient(applicationId, apiKey);
  }

  async searchSingleIndex(
    indexName: string,
    query: string,
    options?: {
      headers?: Record<string, string>;
      queryParameters?: Record<string, any>;
    }
  ) {
    const defaultParams = {
      hitsPerPage: 20,
      page: 0,
      attributesToRetrieve: ['*'],
      typoTolerance: true,
      ignorePlurals: true,
      removeStopWords: false,
      queryType: 'prefixAll', // Changed from 'prefixNone' to allow partial matches
      attributesToHighlight: ['*'],
      highlightPreTag: '<em>',
      highlightPostTag: '</em>',
      analytics: true,
      clickAnalytics: true,
      enablePersonalization: false,
      distinct: 1,
      facets: ['*'],
      minWordSizefor1Typo: 3, // Lowered from 4 to allow typos on shorter words
      minWordSizefor2Typos: 7, // Lowered from 8 for consistency
      advancedSyntax: true,
      removeWordsIfNoResults: 'none', // Changed from 'lastWords' to prevent word removal
    };

    const mergedParams = {
      ...defaultParams,
      ...options?.queryParameters,
      query,
      getRankingInfo: true,
    };

    const results = await this.client.search([
      {
        indexName,
        params: {
          ...mergedParams,
          queryType: mergedParams.queryType as QueryType | undefined,
          removeWordsIfNoResults: mergedParams.removeWordsIfNoResults as RemoveWordsIfNoResults | undefined,
        },
      },
    ], { headers: options?.headers });

    // Transform Algolia results to match document structure
    return results.results[0].hits.map(hit => {
      const { objectID, _highlightResult, _rankingInfo, ...rest } = hit;
      return rest;
    });
  }

  async saveObject(indexName: string, object: Record<string, any>) {
    const objectWithID = { ...object, objectID: object.uuid };
    return this.client.saveObject({indexName, body: objectWithID});
  }

  async saveObjects(indexName: string, objects: Record<string, any>[]) {
    const objectsWithID = objects.map(obj => ({ ...obj, objectID: obj.uuid }));
    return this.client.saveObjects({indexName, objects: [objectsWithID]});
  }

  async getObject(indexName: string, objectID: string, attributesToRetrieve?: string[]) {
    return this.client.getObject({ indexName, objectID, attributesToRetrieve });
  }

  async partialUpdateObject(indexName: string, objectID: string, attributes: Record<string, any>) {
    return this.client.partialUpdateObject({ indexName, objectID, attributesToUpdate: attributes });
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

  async getObjects(indexName: string, objectIDs: string[], attributesToRetrieve?: string[]) {
    const requests = objectIDs.map(objectID => ({ indexName, objectID, attributesToRetrieve }));
    return this.client.getObjects({ requests });
  }

  async listIndices() {
    return this.client.listIndices();
  }
}