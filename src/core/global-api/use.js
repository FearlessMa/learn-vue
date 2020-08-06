/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    //  plugin 已经在installedPlugins 中 返回 
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 获取参数 Vue.use(plugin,p1,p2)  args = [p1,p2]
    const args = toArray(arguments, 1)
    //  args = [Vue,p1,p2]
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      //  plugin = { install(){},其他属性}
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // plugin = function(){}
      plugin.apply(null, args)
    }
    //  plugin 加入 installedPlugins
    installedPlugins.push(plugin)
    return this
  }
}
