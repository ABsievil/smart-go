export enum UploadMimeType {
    JPG = 'image/jpeg',
    PNG = 'image/png',
    WEBP = 'image/webp',
}

export enum UploadTextMimeType {
    JSON = 'application/json',
    JSON_LD = 'application/ld+json',
    JSONL = 'application/jsonl',
    NDJSON = 'application/x-ndjson',
    PLAIN = 'text/plain',
    CSV = 'text/csv',
    TSV = 'text/tab-separated-values',
    HTML = 'text/html',
    XML = 'application/xml',
    XML_TEXT = 'text/xml',
    MARKDOWN = 'text/markdown',
    MARKDOWN_ALT = 'text/x-markdown',
    YAML = 'application/x-yaml',
    YAML_TEXT = 'text/yaml',
    YAML_APP = 'application/yaml',
    JAVASCRIPT = 'text/javascript',
    TYPESCRIPT = 'application/typescript',
    OCTET_STREAM = 'application/octet-stream',
}

export enum UploadFolder {
    AVATARS = 'avatars',
    BANNERS = 'banners',
    DOCUMENTS = 'documents',
    OTHERS = 'others',
}

export enum CloudinaryResourceType {
    IMAGE = 'image',
    VIDEO = 'video',
    RAW = 'raw',
    AUTO = 'auto',
}
