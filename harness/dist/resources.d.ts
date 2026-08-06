export interface OaaResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
}
/**
 * Build the list of available OAA resources from a rootDir.
 */
export declare function listResources(rootDir: string): OaaResource[];
/**
 * Read the content of a specific OAA resource by URI.
 */
export declare function readResource(uri: string, rootDir: string): {
    mimeType: string;
    text: string;
};
