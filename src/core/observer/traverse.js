/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
//  深度获取所有被观察数据的 depId 放入 seenObjects
export function traverse (val: any) {
  _traverse(val, seenObjects)
  //  清除seenObjects 所有内容
  seenObjects.clear()
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  //  非array 和 object  或 冻结 或 VNode 实例 返回不操作
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 如果被观察过且 ，depId不再 set类型 seen里 depId加入seen
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    //  判断depId 是否在 set 类型数据里 set自动去重
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  //  是array 数据 递归 数据成员 val[i] 触发 被观察成员的 get操作 使 当前的 Dep.target 加入成员依赖 
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    // 是object  递归成员
    keys = Object.keys(val)
    i = keys.length
    // 同数组 触发get 收集 依赖 
    while (i--) _traverse(val[keys[i]], seen)
  }
}
