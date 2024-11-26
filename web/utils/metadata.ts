import { v4 as uuidv4 } from 'uuid';

/**
 * Generates standardized metadata for documents.
 * 
 * @param params - Parameters to include in the metadata.
 * @returns A standardized metadata object.
 */
export function generateMetadata(params: {
  source: string;
  name: string;
  mimeType: string;
  conversation_uuid?: string;
  description?: string;
  additional?: Record<string, any>;
}): Record<string, any> {
  return {
    uuid: uuidv4(),
    source_uuid: uuidv4(),
    conversation_uuid: params.conversation_uuid || '',
    source: params.source,
    name: params.name,
    mimeType: params.mimeType,
    description: params.description,
    ...params.additional,
  };
}
