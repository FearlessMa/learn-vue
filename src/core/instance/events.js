/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    // 事件更新 
    updateComponentListeners(vm, listeners)
  }
}

//  vm 
let target: any

function add (event, fn) {
  // vm.$on
  target.$on(event, fn)
}

function remove (event, fn) {
  //  vm.$off
  target.$off(event, fn)
}

//  创建 once 事件 
function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

// 对比父组件时间监听对象  更新事件监听 
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

// eventsMixin
export function eventsMixin (Vue: Class<Component>) {
  //  用于判断是不是 类似 vm.$on('hook:mounted',fn) 
  const hookRE = /^hook:/
  //  $on 方法  判
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    //  event 是数组 ['click','mouseIn',...]
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      //  判断_events对象上是否存在改事件，如果没有新增 [] 。 push 事件回调   , 例如  vm._events = { click:[fn1,fn2,fn]}
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      //  判断是否为 hook: 开头事件
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  //  执行一次事件封装
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      //  先解除，避免fn中再次调用此事件
      vm.$off(event, on)
      // 调用 事件回调
      fn.apply(vm, arguments)
    }
    on.fn = fn
    //  使用 on 包裹 解除事件方法 
    vm.$on(event, on)
    return vm
  }
  //  解除监听
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all  ； $off 没有参数  解除全部事件监听 
    if (!arguments.length) {
      //  初始化空对象
      vm._events = Object.create(null)
      return vm
    }
    // array of events ；  数组遍历解除 每个事件
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event   解除 具体事件  如 click
    const cbs = vm._events[event]
    //  没有事件 处理数组 cbs  直接返回
    if (!cbs) {
      return vm
    }
    //  没有 具体解除哪一个 回到方法， 解除所有
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    //  有 事件数组 cbs=[fn1,fn2,fn] 和 解除方法 fn, 找到cbs 中的fn 移除掉
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }


  //  事件广播 $emit
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    //  非生产环境 略
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }

    //  拿到事件存储数组  cbs = [fn1,fn2,fn]
    let cbs = vm._events[event]
    if (cbs) {
      //  从list start位置开始 复制list
      // export function toArray (list: any, start?: number): Array<any> {
      //   start = start || 0
      //   let i = list.length - start
      //   const ret: Array<any> = new Array(i)
      //   while (i--) {
      //     ret[i] = list[i + start]
      //   }
      //   return ret
      // }
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 调用 cbs[i] 方法
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
