import { type StreamdownProps } from './context.svelte.js';
declare function $$render<Source extends Record<string, any> = Record<string, any>>(): {
    props: StreamdownProps<Source>;
    exports: {};
    bindings: "streamdown" | "element";
    slots: {};
    events: {};
};
declare class __sveltets_Render<Source extends Record<string, any> = Record<string, any>> {
    props(): ReturnType<typeof $$render<Source>>['props'];
    events(): ReturnType<typeof $$render<Source>>['events'];
    slots(): ReturnType<typeof $$render<Source>>['slots'];
    bindings(): "streamdown" | "element";
    exports(): {};
}
interface $$IsomorphicComponent {
    new <Source extends Record<string, any> = Record<string, any>>(options: import('svelte').ComponentConstructorOptions<ReturnType<__sveltets_Render<Source>['props']>>): import('svelte').SvelteComponent<ReturnType<__sveltets_Render<Source>['props']>, ReturnType<__sveltets_Render<Source>['events']>, ReturnType<__sveltets_Render<Source>['slots']>> & {
        $$bindings?: ReturnType<__sveltets_Render<Source>['bindings']>;
    } & ReturnType<__sveltets_Render<Source>['exports']>;
    <Source extends Record<string, any> = Record<string, any>>(internal: unknown, props: ReturnType<__sveltets_Render<Source>['props']> & {}): ReturnType<__sveltets_Render<Source>['exports']>;
    z_$$bindings?: ReturnType<__sveltets_Render<any>['bindings']>;
}
declare const Streamdown: $$IsomorphicComponent;
type Streamdown<Source extends Record<string, any> = Record<string, any>> = InstanceType<typeof Streamdown<Source>>;
export default Streamdown;
