import { initMixin } from './init';
import { stateMixin } from './state';
import { renderMixin } from './render';
import { eventsMixin } from './events';
import { lifecycleMixin } from './lifecycle';
import { warn } from '../util/index';

//  Vue构造函数 ，通过插件方式 挂在构造函数所需的 方法
function Vue(options) {
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);
}

//  VUE.prototype._init
initMixin(Vue);
// VUE.prototype 上挂载 $data $props $set $delete $watch  
stateMixin(Vue);

// VUE.prototype 挂载 $on ，$off $once $emit
eventsMixin(Vue);
// VUE.prototype 挂载 _update $forceUpdate $destroy
lifecycleMixin(Vue);
// VUE.prototype 挂载 $nextTick 
// VUE.prototype 挂载 _render 
renderMixin(Vue);

export default Vue;
