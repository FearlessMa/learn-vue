/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// arrayMethods 对象 继承 Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  //  缓存 原生Array的方法
  const original = arrayProto[method]

  // export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  //   Object.defineProperty(obj, key, {
  //     value: val,
  //     enumerable: !!enumerable,
  //     writable: true,
  //     configurable: true
  //   })
  // }

  def(arrayMethods, method, function mutator (...args) {
    //  使用原生方法计算结果
    const result = original.apply(this, args)
    // 后去数组的__ob__
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        //  获取 通过splice 替换的值
        inserted = args.slice(2)
        break
    }
    // 观察新增的数据
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
