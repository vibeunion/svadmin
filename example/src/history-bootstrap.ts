import { trackExampleHistory } from './history-index';

// 此模块必须先于 App/路由模块求值，确保页面保护先于宿主路径同步执行。
const stopTrackingHistory = trackExampleHistory();
if (import.meta.hot) import.meta.hot.dispose(stopTrackingHistory);
