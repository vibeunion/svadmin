async (page) => {
 const en=page.locator('[data-scope="en"]');const zh=page.locator('[data-scope="zh-CN"]');
 if(await en.locator('[data-svadmin-data-table-count]').innerText()!=='Total: 128')throw new Error('English count failed');
 if(await zh.locator('[data-svadmin-data-table-count]').innerText()!=='共 128 条')throw new Error('Chinese count failed');
 if(await en.getByRole('button',{name:'Violet',exact:true}).count()!==1||await zh.getByRole('button',{name:'紫罗兰色',exact:true}).count()!==1)throw new Error('Accent translation failed');
 if(await en.getByRole('button',{name:'Tenant neutral',exact:true}).count()!==1||await zh.getByRole('button',{name:'Tenant neutral',exact:true}).count()!==1)throw new Error('Custom label overwritten');
 await en.getByRole('combobox').selectOption('zh-CN');
 if(await en.locator('[data-svadmin-data-table-count]').innerText()!=='共 128 条')throw new Error('Locale update failed');
 if(await zh.getByRole('combobox').inputValue()!=='zh-CN')throw new Error('Sibling scope changed');
 if(await en.getByRole('button',{name:'Tenant neutral',exact:true}).count()!==1)throw new Error('Locale update replaced custom label');
 await en.getByRole('combobox').selectOption('en');
 for(const [width,height]of [[1440,900],[1920,1080],[390,844]]){await page.setViewportSize({width,height});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error(`Overflow at ${width}`);}
 return {counts:true,accentLabels:true,customLabels:true,localeScope:true,viewportOverflow:false};
}
