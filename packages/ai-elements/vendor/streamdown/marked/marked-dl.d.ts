import type { Extension, GenericToken } from './index.js';
export declare const markedDl: Extension;
export type DescriptionListToken = {
    type: 'descriptionList';
    raw: string;
    text: string;
    tokens: DescriptionToken[];
};
export type DescriptionToken = {
    type: 'description';
    raw: string;
    tokens: [DescriptionTermToken, DescriptionDetailToken];
};
export type DescriptionTermToken = {
    type: 'descriptionTerm';
    raw: string;
    tokens: GenericToken[];
};
export type DescriptionDetailToken = {
    type: 'descriptionDetail';
    raw: string;
    tokens: GenericToken[];
};
