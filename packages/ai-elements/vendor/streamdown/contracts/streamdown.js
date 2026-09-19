import { carets } from '../streaming.js';
export const normalizeMermaidControls = (controls) => {
    if (controls === false) {
        return {
            enabled: false,
            download: false,
            fullscreen: false,
            panZoom: false,
            mouseWheelZoom: false
        };
    }
    if (controls === true || controls === undefined) {
        return {
            enabled: true,
            download: true,
            fullscreen: true,
            panZoom: true,
            mouseWheelZoom: true
        };
    }
    const panZoom = controls.panZoom !== false;
    return {
        enabled: true,
        download: controls.download !== false,
        fullscreen: controls.fullscreen !== false,
        panZoom,
        mouseWheelZoom: panZoom && controls.mouseWheelZoom !== false
    };
};
