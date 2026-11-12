export async function openDisclosure(page,label){
 const summary=page.locator('summary').and(page.getByText(label,{exact:true}));
 if(!await summary.evaluate(n=>n.parentElement.open))await summary.click();
}
export const openSources=page=>openDisclosure(page,'Sessions and source conditions');
export async function selectFamily(page,family){
 const select=page.getByLabel('Practice family',{exact:true});
 if(!await select.isVisible())await openSources(page);
 await select.selectOption(family);
}
