export declare const toolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            name: {
                type: string;
                description: string;
            };
            rootDir: {
                type: string;
                description: string;
            };
            input?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            rootDir: {
                type: string;
                description: string;
            };
            name?: undefined;
            input?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            name?: undefined;
            rootDir?: undefined;
            input?: undefined;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            name: {
                type: string;
                description: string;
            };
            rootDir: {
                type: string;
                description: string;
            };
            input: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
})[];
type ToolArgs = Record<string, unknown>;
export declare function handleTool(name: string, args: ToolArgs, defaultRootDir: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
}>;
export {};
