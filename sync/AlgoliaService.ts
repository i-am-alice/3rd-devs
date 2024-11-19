import { searchClient, type SearchClient } from '@algolia/client-search';
import { type QueryType } from '@algolia/client-search'; // Import QueryType if not already imported
import { type RemoveWordsIfNoResults } from '@algolia/client-search'; // Import RemoveWordsIfNoResults

export class AlgoliaService {
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
      removeStopWords: true,
      queryType: 'prefixNone',
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
      removeWordsIfNoResults: 'lastWords',
    };

    const mergedParams = {
      ...defaultParams,
      ...options?.queryParameters,
      query,
      getRankingInfo: true,
    };

    return this.client.search([
      {
        indexName,
        params: {
          ...mergedParams,
          queryType: mergedParams.queryType as QueryType | undefined,
          removeWordsIfNoResults: mergedParams.removeWordsIfNoResults as RemoveWordsIfNoResults | undefined,
        },
      },
    ], { headers: options?.headers });
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