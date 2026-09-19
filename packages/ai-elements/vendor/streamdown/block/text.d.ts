import type { StreamdownToken } from '../marked/index.js';
export declare const decodeHtmlEntities: (value: string) => string;
export declare const renderLeafText: (token: StreamdownToken) => string;
export declare const getTokenChildren: (token: StreamdownToken) => StreamdownToken[];
export declare const shouldAnimateLeafText: ({ animationEnabled, insidePopover, isStatic, token }: {
    animationEnabled: boolean;
    insidePopover: boolean;
    isStatic: boolean;
    token: StreamdownToken;
}) => boolean;
