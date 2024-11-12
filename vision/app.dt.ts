// Interface Definitions
export interface ResizedImageMetadata {
    width: number;
    height: number;
}

export interface ImageMessage {
    type: "image_url";
    image_url: {
        url: string;
        detail: 'low' | 'high';
    };
}

export interface TextMessage {
    type: "text";
    text: string;
}
