/* @flow */

import config from '../config';
import { initProxy } from './proxy';
import { initState } from './state';
import { initRender } from './render';
import { initEvents } from './events';
import { mark, measure } from '../util/perf';
import { initLifecycle, callHook } from './lifecycle';
import { initProvide, initInjections } from './inject';
import { extend, mergeOptions, formatComponentName } from '../util/index';

let uid = 0;

export function initMixin(Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    // vue 实例
    const vm: Component = this;
    //
    vm._uid = uid++;
    // 测试性能
    let startTag, endTag;
    /* istanbul ignore if */ if (
      process.env.NODE_ENV !== 'production' &&
      config.performance &&
      mark
    ) {
      startTag = `vue-perf-start:${vm._uid}`;
      endTag = `vue-perf-end:${vm._uid}`;
      mark(startTag);
    }

    // a flag to avoid this being observed
    //  _isVue 可以避免被 被观察 ， src/observer/index.js  120行 observe方法判断
    vm._isVue = true;
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.

      // 设置$options ，$options 继承 Vue.options
      initInternalComponent(vm, options);
    } else {
      vm.$options = mergeOptions(
        //  解析构造函数options ,合并原型链上所有的option
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm); //检查 是否使用 Proxy
    } else {
      vm._renderProxy = vm;
    }
    // expose real self 初始化vm
    vm._self = vm;
    // initLifecycle 主要初始化 下面属性 --绑定初始需要属性
    // vm.$parent = parent
    // vm.$root = parent ? parent.$root : vm
    // vm.$children = []
    // vm.$refs = {}
    // vm._watcher = null
    // vm._inactive = null
    // vm._directInactive = false
    // vm._isMounted = false
    // vm._isDestroyed = false
    // vm._isBeingDestroyed = false
    initLifecycle(vm);

    // 更新事件
    // _events =
    // _hasHookEvent
    initEvents(vm);

    //挂载 _vnode  _staticTrees $slots createElement  监听$attrs $listeners
    initRender(vm);

    // emit beforeCreate 事件
    callHook(vm, 'beforeCreate');

    initInjections(vm); // resolve injections before data/props

    //上面数据合并整合完成 初始化 props methods computed  data watch
    initState(vm);
    initProvide(vm); // resolve provide after data/props
    callHook(vm, 'created');

    // 性能结束
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false);
      mark(endTag);
      measure(`vue ${vm._name} init`, startTag, endTag);
    }

    // 有挂载元素 。vm挂载到元素上
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
    // 初始化后获得的vm
    /*
        vm = {
          _uid,
          _isVue:true,
          $options:{}, //合并后
          _renderProxy:vm,
          _self:vm,
          // initLifecycle(vm) 增加的属性
          $parent:parent,
          $root : parent ? parent.$root : vm,
          $children : [],
          $refs : {},
          _watcher : null,
          _inactive : null,
          _directInactive :false,
          _isMounted : false,
          _isDestroyed : false,
          _isBeingDestroyed :false,
        };
    */ 

  };
}
// 设置$options ，$options 继承 Vue.options
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  // opts = vm.$options = {}
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
  // vm.$options = opts = {
  //   parent:options.parent,
  //   _parentVnode:options._parentVnode,
  //   propsData:options._parentVnode.componentOptions.propsData,
  //   _parentListeners:options._parentVnode.componentOptions.listeners,
  //   _renderChildren:options._parentVnode.componentOptions.children,
  //   _componentTag:options._parentVnode.componentOptions.tag,

  //   // 判断options.render 是否存在

  //   render:options.render,
  //   staticRenderFns:options.staticRenderFns,
  // }
}
//  解析构造函数options ,合并原型链上所有的option
export function resolveConstructorOptions(Ctor: Class<Component>) {
  let options = Ctor.options;
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super);
    // 中间变量缓存 Ctor.options
    const cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor); // modifiedOptions = {key:val} || undefined
      // update base extend options
      if (modifiedOptions) {
        /** export function extend (to: Object, _from: ?Object): Object {
          for (const key in _from) {
            to[key] = _from[key]
          }
            return to
          } 
        */
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}
// 获取不同的options key=value
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
  let modified;
  const latest = Ctor.options;
  const sealed = Ctor.sealedOptions;
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = latest[key];
    }
  }
  return modified;
}
