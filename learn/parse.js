const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
function parsePath(path) {
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split('.');
  console.log('segments: ', segments);
  //  递归出 vm.a.b.c.d 的值
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return;
      obj = obj[segments[i]];
      console.log('obj: ', obj);
    }
    console.log('obj:1 ', obj);
    return obj;
  };
}
const expOrFn = 'a.b.c.d';
const getter = parsePath(expOrFn);
const vm = { a: { b: { c: { d: 'd' } } } };
const value = getter(vm);
console.log('value: ', value);


//  缓存props为key ，已经存在 直接返回 ，不存在新增key
function cached(fn) {
  const cache = Object.create(null);
  return function cachedFn(str) {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

const camelizeRE = /-(\w)/g;
const camelize = cached((str) => {
  str.replace(camelizeRE, (_, c) =>{
    console.log('_: ', _);
    console.log('c: ', c);
    return  (c ? c.toUpperCase() : '')
  })
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});
let props = 'props-id';
camelize(props);
console.log('props: ', props);
