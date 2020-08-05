/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;


  //   watch :{ dataA:{handler(val){this.dataB +val},deep:true } }
  //  cb 为watch的回调:handler , options 为其他参数 deep 等

  // export function initState (vm: Component) {
  //   vm._watchers = []
  //   const opts = vm.$options
  //   if (opts.props) initProps(vm, opts.props)
  //   if (opts.methods) initMethods(vm, opts.methods)
  //   if (opts.data) {
  //     initData(vm)
  //   } else {
  //     observe(vm._data = {}, true /* asRootData */)
  //   }
  //   if (opts.computed) initComputed(vm, opts.computed)
  //   if (opts.watch && opts.watch !== nativeWatch) {
  //     initWatch(vm, opts.watch)
  //   }
  // }

  // function initWatch (vm: Component, watch: Object) {
  //   for (const key in watch) {
  //     const handler = watch[key]
  //     if (Array.isArray(handler)) {
  //       for (let i = 0; i < handler.length; i++) {
  //         createWatcher(vm, key, handler[i])
  //       }
  //     } else {
  //       createWatcher(vm, key, handler)
  //     }
  //   }
  // }

  // function createWatcher (
  //   vm: Component,
  //   expOrFn: string | Function,
  //   handler: any,
  //   options?: Object
  // ) {
  //   if (isPlainObject(handler)) {
  //     options = handler
  //     handler = handler.handler
  //   }
  //   if (typeof handler === 'string') {
  //     handler = vm[handler]
  //   }
  //   return vm.$watch(expOrFn, handler, options)
  // }

  // Vue.prototype.$watch = function (
  //   expOrFn: string | Function,
  //   cb: any,
  //   options?: Object
  // ): Function {
  //   const vm: Component = this
  //   if (isPlainObject(cb)) {
  //     return createWatcher(vm, expOrFn, cb, options)
  //   }
  //   options = options || {}
  //   options.user = true
  //   const watcher = new Watcher(vm, expOrFn, cb, options)
  //   if (options.immediate) {
  //     try {
  //       cb.call(vm, watcher.value)
  //     } catch (error) {
  //       handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
  //     }
  //   }
  //   return function unwatchFn () {
  //     watcher.teardown()
  //   }
  // }

  constructor ( 
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    //   vm._watchers = []  src/core/instance/state.js 初始化的_watchers
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    //  watch:{ dataA(val){}} ; expOrFn = dataA
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      //  解析  expOrFn 为 'a.b.c.d'的情况
      //  parsePath 返回方法 如下 segments = [a,b,c,d]
      //  返回 vm.a.b.c.d 的值
      // function (obj) {
      //   for (let i = 0; i < segments.length; i++) {
      //     if (!obj) return
      //     obj = obj[segments[i]]
      //   }
      //   return obj 
      // }
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    //  
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  //  获取依赖更新后的值 ，计算出 value
  get () {
    // Dep.target = this  和   targetStack.push(this)
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      //    getter(vm){ 
      //      segments = [a,b,c,d] ;    
      //       递归调用了 a，b, c, d的get
      //      return vm.a.b.c.d  
      // }
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      //  触发所有属性的get  完成依赖收集addDep  后
      //  修改 Dep.target
      popTarget()
      //  更新依赖
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  //  new Observer 绑定属性
  //  1. observer 观察属性 定义 __ob__ ， 判断 数组 还是 object 
  //  2.1 数组  获取数组原生方法为: arrayMethods ，通过Object.defineProperty 绑定 value 为mutator 方法，mutator封装观察变化和通知变化
  //  2.2 object 给数据的每一项属性转化为响应式，使用 defineReactive 方法
  //  2.2.1  defineReactive 
  //  使用observe判断属性值不为基本类型，则为属性值 调用 new Observer  
  //  为属性 增加 dep依赖实例， 使用 Object.defineProperty定义属性的get，set ，收集，通知依赖
  
  //  watcher触发更新过程
  // dep 是 observer 实例中存储对应 的 dep 实例 
  //  1. observer 观察一个属性，设置dep 为 new Dep实例 ，
  //  2. watcher 先设置 Dep.target 为 当前watcher 。在触发 watcher中 被观察属性的 get ，
  //  get 中调用dep的 depend， depend 中调用 Dep.target.addDep(this); this 为 dep
  //  3. 当前watcher中的 addDep被调用 获得 被触发get的属性 的 dep 。
  //  4. 如果是没有收集过的dep ，调用dep.addSub 传递当前watcher 给dep 更新dep.subs  
  //  5. 如果是 deep 深度监听，使用traverse方法 触发 属性值 中所有 非基本类型数据 被观察属性 的依赖 重复1-4循环
  //  6. Dep.target 移除，调用 cleanupDeps  更新watcher 中的 newDepIds，newDeps 

  //  7. 如果当前 属性 被改变 触发 set ， 会调用dep.notify 通知所有在 dep.subs里的 watcher 调用 watcher的 update方法
  
  //  总结 watcher  触发 属性 get  传递 属性私有的dep 给watcher.addDep方法
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        //  dep 增加当前 watcher
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  //  更新 依赖
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // this.deps = []
    // this.newDeps = []
    // this.depIds = new Set()
    // this.newDepIds = new Set()
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) { // 同步更新
      //  更新数据 
      this.run()
    } else { // 异步更新
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      //  获取最新的值value
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        //  调用 callback 方法
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
