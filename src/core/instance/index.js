import { initMixin } from './init';
import { stateMixin } from './state';
import { renderMixin } from './render';
import { eventsMixin } from './events';
import { lifecycleMixin } from './lifecycle';
import { warn } from '../util/index';

function Vue(options) {
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);
}

initMixin(Vue);
// prototype 上挂载 $data $props $set $delete $watch  vm上挂载_watcher _watchers
stateMixin(Vue);

// VUE.prototype 挂载 $on事件，vm上挂载 _events对象 _hasHookEvent是判断是否有hook:开头的事件名称
eventsMixin(Vue);
// VUE.prototype 挂载 _update $forceUpdate $destroy
lifecycleMixin(Vue);
// VUE.prototype 挂载 $nextTick 一次判断 Promise MutationObserver setImmediate 判断成功就使用
// VUE.prototype 挂载 _render 返回vnode  vm挂再 $vnode= _parentVnode
renderMixin(Vue);

export default Vue;
