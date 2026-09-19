import { StreamdownContext } from '../context.svelte.js';
import type { StreamdownContext as StreamdownContextContract } from '../contracts/streamdown.js';
import type { StreamdownParseRuntimeInit, StreamdownRenderRuntimeInit, StreamdownSecurityRuntimeInit, StreamdownUiConfigRuntimeInit } from './runtime.js';
export type StreamdownRuntimeContextArgs<Source extends Record<string, any>> = {
    parse: StreamdownParseRuntimeInit<Source> & {
        remend: () => StreamdownContextContract<Source>['remend'];
    };
    security: StreamdownSecurityRuntimeInit<Source>;
    render: StreamdownRenderRuntimeInit<Source>;
    uiConfig: StreamdownUiConfigRuntimeInit<Source>;
};
export declare const createStreamdownRuntimeContext: <Source extends Record<string, any>>(args: StreamdownRuntimeContextArgs<Source>) => StreamdownContext<Source>;
