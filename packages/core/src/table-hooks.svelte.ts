import { definedOptions } from './defined-options';
import { createListQuery } from './query-hooks.svelte';
import { decodeBaseRecord, type RecordDecoder } from './record-decoder';
import { readURLState,writeURLState } from './url-sync';
import { captureContractContext } from './contract-context.svelte';
import { getAdminOptions } from './options.svelte';
import type { Pagination,Sort,Filter,BaseRecord,HttpError,KnownResources } from './types';
import type { UseListOptions,MaybeGetter } from './query-hooks.svelte';

export type FilterSetMode='merge'|'replace';

export interface UseTableOptions<TQueryFnData extends BaseRecord=BaseRecord,TError=HttpError,_TSearchVariables=Record<string,unknown>> extends Omit<UseListOptions<TQueryFnData,TError>,'pagination'|'sorters'|'filters'> {
  resource?: KnownResources;
  pagination?: Pagination;
  sorters?: {
    initial?: Sort[];
    permanent?: Sort[];
    mode?: 'off'|'server';
  };
  filters?: {
    initial?: Filter[];
    permanent?: Filter[];
    mode?: 'off'|'server';
    defaultBehavior?: FilterSetMode;
  };
  syncWithLocation?: boolean;
}

export function useTable(optionsOrGetter: MaybeGetter<UseTableOptions>={}) {
  return createTableQuery(optionsOrGetter, () => decodeBaseRecord);
}

export function createTableQuery<TQueryFnData extends BaseRecord>(
  optionsOrGetter: MaybeGetter<UseTableOptions>, getDecoder: () => RecordDecoder<TQueryFnData>,
) {
  const adminContext=captureContractContext(optionsOrGetter);
  const getOptions=() => typeof optionsOrGetter==='function'? optionsOrGetter():optionsOrGetter;

  // Use a local derived to compute these since they are used to initialize state
  // Even if options change, init values are only used once, which makes sense for initial state
  const initialOpts=getOptions();
  const syncWithLocation=initialOpts.syncWithLocation??getAdminOptions().syncWithLocation;

  const paginationMode=$derived(getOptions().pagination?.mode??'server');
  const sortersMode=$derived(getOptions().sorters?.mode??'server');
  const filtersMode=$derived(getOptions().filters?.mode??'server');
  const filterDefaultBehavior=$derived(getOptions().filters?.defaultBehavior??'replace');

  const permanentSorters=$derived(getOptions().sorters?.permanent??[]);
  const permanentFilters=$derived(getOptions().filters?.permanent??[]);

  let initPagination=initialOpts.pagination??{ current: 1,pageSize: 10 };
  let initSorters=initialOpts.sorters?.initial??[];
  let initFilters=initialOpts.filters?.initial??[];

  if(syncWithLocation&&typeof window!=='undefined') {
    const urlState=readURLState(adminContext);
    if(urlState.page||urlState.pageSize) {
      initPagination=definedOptions({
        current: urlState.page??initPagination.current,
        pageSize: urlState.pageSize??initPagination.pageSize,
      });
    }
    if(urlState.sortField) {
      initSorters=[{ field: urlState.sortField,order: urlState.sortOrder??'asc' }];
    }
    if(urlState.filters) {
      initFilters=urlState.filters;
    }
  }

  let pagination=$state<Pagination>(initPagination);
  let currentSorters=$state<Sort[]>(initSorters);
  let currentFilters=$state<Filter[]>(initFilters);

  const effectiveSorters=$derived([...currentSorters,...permanentSorters]);
  const effectiveFilters=$derived([...currentFilters,...permanentFilters]);

  const querySorters=$derived(sortersMode==='server'? effectiveSorters:[]);
  const queryFilters=$derived(filtersMode==='server'? effectiveFilters:[]);
  const queryPagination=$derived(paginationMode==='server'
    ? pagination
    :{ current: 1,pageSize: 999999,mode: paginationMode });

  const tableQueryInfo=createListQuery(() => {
    const currentOpts=getOptions();
    const { meta,syncWithLocation: _swl,dataProviderName,pagination: _p,sorters: _s,filters: _f,...restOptions }=currentOpts;
    return {
      pagination: queryPagination,
      sorters: querySorters,
      filters: queryFilters,
      ...definedOptions({
        meta,
        dataProviderName,
      }),
      ...restOptions
    };
  }, getDecoder);

  const query=tableQueryInfo;
  const overtime=tableQueryInfo.overtime;

  function setSorters(newSorters: Sort[]) { currentSorters=newSorters; pagination={ ...pagination,current: 1 }; }
  function setFilters(newFilters: Filter[],mode?: FilterSetMode) {
    const behavior=mode??filterDefaultBehavior;
    if(behavior==='merge') {
      const merged=[...currentFilters];
      for(const nf of newFilters) {
        if(!('field' in nf)) { merged.push(nf); continue; }
        const idx=merged.findIndex(f => 'field' in f&&f.field===nf.field&&f.operator===nf.operator);
        if(idx>=0) {
          if(nf.value===undefined||nf.value===null||nf.value==='') merged.splice(idx,1);
          else merged[idx]=nf;
        } else if(nf.value!==undefined&&nf.value!==null&&nf.value!=='') {
          merged.push(nf);
        }
      }
      currentFilters=merged;
    } else {
      currentFilters=newFilters;
    }
    pagination={ ...pagination,current: 1 };
  }

  function setPage(page: number) { pagination={ ...pagination,current: page }; }
  function setPageSize(size: number) { pagination={ ...pagination,pageSize: size,current: 1 }; }

  if(syncWithLocation&&typeof window!=='undefined') {
    $effect(() => {
      writeURLState({
        page: pagination.current,
        pageSize: pagination.pageSize,
        sortField: currentSorters[0]?.field,
        sortOrder: currentSorters[0]?.order,
        ...definedOptions({
          filters: currentFilters
        })
      },adminContext);
    });

    $effect(() => {
      const handler=() => {
        const urlState=readURLState(adminContext);
        const newPage=urlState.page??1;
        if(newPage!==pagination.current) {
          pagination={ ...pagination,current: newPage };
        }
        const newPageSize=urlState.pageSize??getOptions().pagination?.pageSize??getAdminOptions().defaultPageSize??10;
        if(newPageSize!==pagination.pageSize) {
          pagination={ ...pagination,pageSize: newPageSize };
        }
        if(urlState.sortField) {
          const newSorter: Sort={ field: urlState.sortField,order: urlState.sortOrder??'asc' };
          if(JSON.stringify([newSorter])!==JSON.stringify(currentSorters)) {
            currentSorters=[newSorter];
          }
        } else if(currentSorters.length>0) {
          currentSorters=[];
        }
        if(urlState.filters&&JSON.stringify(urlState.filters)!==JSON.stringify(currentFilters)) {
          currentFilters=urlState.filters;
        } else if(!urlState.filters&&currentFilters.length>0) {
          currentFilters=[];
        }
      };
      window.addEventListener('popstate',handler);
      window.addEventListener('hashchange',handler);
      return () => {
        window.removeEventListener('popstate',handler);
        window.removeEventListener('hashchange',handler);
      };
    });
  }

  function createLinkForSyncWithLocation(): string {
    const params=new URLSearchParams();
    if(pagination.current) params.set('page',String(pagination.current));
    if(pagination.pageSize) params.set('pageSize',String(pagination.pageSize));
    if(currentSorters[0]) {
      params.set('sort',currentSorters[0].field);
      params.set('order',currentSorters[0].order);
    }
    if(currentFilters.length>0) {
      params.set('filters',JSON.stringify(currentFilters));
    }
    return `?${params.toString()}`;
  }

  return {
    query,
    get overtime() { return overtime; },
    get pagination() { return pagination; },
    get sorters() { return currentSorters; },
    get filters() { return currentFilters; },
    setSorters,setFilters,setPage,setPageSize,
    createLinkForSyncWithLocation,
    get totalPages() {
      const total=query.data?.total??0;
      return Math.ceil(total/(pagination.pageSize??10));
    },
    get current() { return pagination.current??1; },
    get pageSize() { return pagination.pageSize??10; },
    get pageCount() { return Math.ceil((query.data?.total??0)/(pagination.pageSize??10)); },
    get clientData(): TQueryFnData[] {
      if(paginationMode==='server') return [];
      const allData=query.data?.data??[];
      let sorted=[...allData];
      const activeSorters=sortersMode==='off'? effectiveSorters:[];
      if(activeSorters.length>0) {
        sorted.sort((a,b) => {
          for(const { field,order } of activeSorters) {
            const va=a[field];
            const vb=b[field];
            if(va==null&&vb!=null) return 1;
            if(vb==null&&va!=null) return -1;
            if(va==null&&vb==null) continue;

            let cmp: number;
            if(typeof va==='number'&&typeof vb==='number') cmp=va-vb;
            else if(va instanceof Date&&vb instanceof Date) cmp=va.getTime()-vb.getTime();
            else if(typeof va==='string'&&typeof vb==='string'&&!isNaN(Number(va))&&!isNaN(Number(vb))) cmp=Number(va)-Number(vb);
            else cmp=String(va).localeCompare(String(vb));

            if(cmp!==0) return order==='desc'? -cmp:cmp;
          }
          return 0;
        });
      }
      const activeFilters=filtersMode==='off'? effectiveFilters:[];
      if(activeFilters.length>0) {
        function matchesFilter(item: Record<string,unknown>,f: Filter): boolean {
          if(!('field' in f)) {
            if(f.operator==='and') return f.value.every(sub => matchesFilter(item,sub));
            if(f.operator==='or') return f.value.length===0||f.value.some(sub => matchesFilter(item,sub));
            return true;
          }
          const val=item[f.field];
          const fv=f.value;
          switch(f.operator) {
            case 'null': return val==null;
            case 'nnull': return val!=null;
            default: break;
          }
          if(fv==null||fv==='') return true;
          switch(f.operator) {
            case 'eq': return val==fv;
            case 'ne': return val!=fv;
            case 'lt': return typeof val==='number'&&typeof fv==='number'&&val<fv;
            case 'gt': return typeof val==='number'&&typeof fv==='number'&&val>fv;
            case 'lte': return typeof val==='number'&&typeof fv==='number'&&val<=fv;
            case 'gte': return typeof val==='number'&&typeof fv==='number'&&val>=fv;
            case 'in': return !Array.isArray(fv)||fv.length===0||fv.includes(val);
            case 'nin': return !Array.isArray(fv)||fv.length===0||!fv.includes(val);
            case 'contains': return typeof val==='string'&&typeof fv==='string'&&val.includes(fv);
            case 'ncontains': return typeof val==='string'&&typeof fv==='string'&&!val.includes(fv);
            case 'startswith': return typeof val==='string'&&typeof fv==='string'&&val.startsWith(fv);
            case 'endswith': return typeof val==='string'&&typeof fv==='string'&&val.endsWith(fv);
            case 'between': {
              if(!Array.isArray(fv)||fv.length!==2) return true;
              const [min,max]: unknown[]=fv;
              return typeof val==='number'&&typeof min==='number'&&typeof max==='number'
                &&val>=min&&val<=max;
            }
            case 'nbetween': {
              if(!Array.isArray(fv)||fv.length!==2) return true;
              const [min,max]: unknown[]=fv;
              return typeof val==='number'&&typeof min==='number'&&typeof max==='number'
                &&(val<min||val>max);
            }
            default: return true;
          }
        }
        sorted=sorted.filter((item) => {
          return activeFilters.every(f => matchesFilter(item,f));
        });
      }
      if(paginationMode==='off') return sorted;
      const start=((pagination.current??1)-1)*(pagination.pageSize??10);
      const end=start+(pagination.pageSize??10);
      return sorted.slice(start,end);
    },
  };
}
