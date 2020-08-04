/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// 观察值 
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    //  初始化 新的依赖
    this.dep = new Dep() 
    this.vmCount = 0
    //  使用 defineProperty 定义value 上的 __ob__ 属性 为当前实例this。__ob__表示value已被观察
    def(value, '__ob__', this)

    //  判断 value , 特殊处理array
    if (Array.isArray(value)) {
      // export const hasProto = '__proto__' in {}
      // hasProto 判断 是否有 __proto__
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        // 没有__proto__ ，通过def方法 给数组定义包装后的 arrayMethods
        copyAugment(value, arrayMethods, arrayKeys)
      }
      //  使用 observe 方法 观察数组的每一项
      this.observeArray(value)
    } else {
      //  非 array 类型数据 ，调用walk ，遍历value 的key:value ，传入defineReactive方法  定义响应式
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  //  判断  非object  或 是VNode实例  直接返回  
  //  基本类型 在这里返回  不会被观察
  // export function isObject (obj: mixed): boolean %checks {
  //   return obj !== null && typeof obj === 'object'
  // }
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  //  判断 __ob__
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&  // 默认 true
    !isServerRendering() && // 非服务端渲染 
    (Array.isArray(value) || isPlainObject(value)) && // 是array 或者 toString 判断为object
    Object.isExtensible(value) && // 是否可扩展
    !value._isVue // 不是vue实例
  ) {
    //  新增观察
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  //  设置依赖对象 ，有存储依赖，增删依赖等方法
  const dep = new Dep()

  // 判断属性是否可以配置 ，不可配置属性终止执行直接返回
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  //  获取get set 方法
  const getter = property && property.get
  const setter = property && property.set
  // 没有get ，defineReactive 参数为2个 设置val  = obj[key]
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // observe判断val类型，非objet 或VNode 直接返回，
  // 然后 判断val 是否被观察，通过 val 是否有__ob__属性判断。
  // 有__ob__ 直接返回，val.__ob__ ,否则返回 new observer(val) 
  let childOb = !shallow && observe(val)

  // defineProperty 定义数据
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      //  判断Dep类的静态属性 target ，target是Watcher类型
      if (Dep.target) {
        //  
        /* Dep.depend 等到watcher在看 ，简单理解就是 触发依赖收集
          depend () {
              if (Dep.target) {
                Dep.target.addDep(this)
              }
            }
        */ 
        dep.depend()
        // childOb  的依赖收集
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 通过__ob__ 判断array 成员 是否被观察 ，已被观察收集依赖，如果成员是array递归调用dependArray
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      //  value 没发生改变 或者 value 是NaN 
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      //  观察 新值
      childOb = !shallow && observe(newVal)
      //  通知依赖 改变
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
