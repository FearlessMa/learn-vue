// 响应式
// 第一步，数据变化可知

const book = { name: 'a', price: 100 };
// let _name = '_a';

// Object.defineProperty(book, 'name', {
//   get() {
//     return _name;
//   },
//   set(val) {
//     _name = val;
//   }
// });

//  使用defineProperty观察数据改变
function defineReactive(obj, key, value) {
  let _data = value ? value : obj[key];
  // const depList = [];
  const dep = new Dep();
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // dep
      dep.depAppend();
      return _data;
    },
    set(val) {
      _data = val;
      // notify()
      dep.notify(val);
    }
  });
}

//  依赖收集
function Dep() {
  target = null;
  this.depList = [];
}

Dep.prototype.depAppend = function () {
  Dep.target && this.depList.push(Dep.target);
};
Dep.prototype.notify = function (val) {
  console.log('this.depList: ', this.depList);
  this.depList.forEach((dep) => {
    dep && dep.update(val);
  });
};

// function exFn(prototype) {
//   function Fn() {}
//   Fn.prototype = prototype;
//   Fn.prototype.constructor = Fn;
//   return new Fn();
// }

//  获取数据内所有属性，增加观察
function defineReactiveAll(obj) {
  const keyList = Object.keys(obj);
  keyList.forEach((key) => {
    defineReactive(obj, key, obj[key]);
  });
}
defineReactiveAll(book);

//  观察对象
function Watcher(cb) {
  this.cb = cb;
  const obj = cb()
  const keyList = Object.keys(obj);
  keyList.forEach((key) => {
    defineReactive(this, key, obj[key]);
  });
}
Watcher.prototype.get = function () {
  Dep.target = this;
  const val = this.cb();
  Dep.target = undefined;
  return val;
};
Watcher.prototype.update = function (val) {
  this.value = this.cb(val);
};

// watch 计算
let totalPrice = new Watcher(() => {
  return { name: 'a', p: 12 };
});
console.log('totalPrice: ', totalPrice);
console.log('totalPrice.name: ', totalPrice.name);

totalPrice.name = 10;
console.log('totalPrice: ', totalPrice.name);
totalPrice.name = 110;
console.log('totalPrice: ', totalPrice.name);
