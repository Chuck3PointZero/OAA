export interface OaaPrompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required: boolean;
    }>;
}
export declare const promptDefinitions: OaaPrompt[];
export declare function getPromptContent(promptName: string, args: Record<string, string>): {
    role: "user";
    content: string;
};
